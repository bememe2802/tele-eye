import { Injectable, NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

const padTimePart = (value: number) => value.toString().padStart(2, '0');

const formatTime = (minutesFromMidnight: number) => {
    const hours = Math.floor(minutesFromMidnight / 60);
    const minutes = minutesFromMidnight % 60;
    return `${padTimePart(hours)}:${padTimePart(minutes)}`;
};

const SYSTEM_TIME_SLOTS = Array.from({ length: (17 - 8) * 2 }, (_, index) => {
    const startMinutes = 8 * 60 + index * 30;
    const endMinutes = startMinutes + 30;
    const startTime = formatTime(startMinutes);
    const endTime = formatTime(endMinutes);

    return {
        slot_template_id: index + 1,
        shift_name: `${startTime} - ${endTime}`,
        start_time: startTime,
        end_time: endTime,
        is_active: true,
    };
});

const DAY_MS = 24 * 60 * 60 * 1000;

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const parseIsoDate = (date: string | Date | string[]) => {
    if (date instanceof Date) {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }

    const rawValue = Array.isArray(date) ? date[0] : date;
    const [year, month, day] = String(rawValue).split('-').map(Number);
    if (!year || !month || !day) {
        throw new BadRequestException('Invalid date');
    }

    return new Date(Date.UTC(year, month - 1, day));
};

const getBangkokToday = () => {
    const bangkokNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return parseIsoDate(bangkokNow.toISOString().slice(0, 10));
};

const getEndOfNextWeek = () => {
    const today = getBangkokToday();
    const dayOfWeek = today.getUTCDay();
    const daysUntilThisSunday = (7 - dayOfWeek) % 7;
    return new Date(today.getTime() + (daysUntilThisSunday + 7) * DAY_MS);
};

const getDayOfWeek = (date: Date) => date.getUTCDay();

const encodeSlotId = (doctorId: number, date: string, slotTemplateId: number) => {
    const yyMMdd = date.replaceAll('-', '').slice(2);
    return Number(`${doctorId}${yyMMdd}${slotTemplateId.toString().padStart(2, '0')}`);
};

const decodeSlotId = (slotId: number) => {
    const raw = String(slotId);
    if (raw.length < 9) {
        throw new BadRequestException('Invalid slot id');
    }

    const slotTemplateId = Number(raw.slice(-2));
    const yyMMdd = raw.slice(-8, -2);
    const doctorId = Number(raw.slice(0, -8));
    const year = Number(`20${yyMMdd.slice(0, 2)}`);
    const month = yyMMdd.slice(2, 4);
    const day = yyMMdd.slice(4, 6);

    return {
        doctorId,
        date: `${year}-${month}-${day}`,
        slotTemplateId,
    };
};

const paidStatuses = new Set(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'REFUNDED']);

interface SepayTransactionItem {
    id: string;
    amount_in?: string;
    transaction_content?: string;
}

interface SepayTransactionListResponse {
    messages?: {
        success?: boolean;
    };
    transactions?: SepayTransactionItem[];
}

@Injectable()
export class BookingsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) { }

    private async getDoctorIdForUser(userId: number) {
        const doctor = await this.prisma.doctorProfile.findUnique({
            where: { user_id: userId },
            select: { doctor_id: true },
        });

        if (!doctor) {
            throw new BadRequestException('Doctor profile not found');
        }

        return doctor.doctor_id;
    }

    private extractAppointmentId(content?: string | null) {
        const match = (content || '').toUpperCase().match(/\bTELEEYE\s*#?\s*(\d+)\b/);
        return match ? Number.parseInt(match[1], 10) : null;
    }

    private matchesTransferContent(content: string | undefined, appointmentId: number) {
        return new RegExp(`\\bTELEEYE\\s*#?\\s*${appointmentId}\\b`).test(
            (content || '').toUpperCase(),
        );
    }

    private validateSepayAuthorization(authorization?: string) {
        const configuredToken = this.configService.get<string>('SEPAY_WEBHOOK_TOKEN')?.trim();
        if (!configuredToken) {
            return;
        }

        const providedToken = (authorization || '').replace(/^Bearer\s+/i, '').trim();
        if (providedToken !== configuredToken) {
            throw new UnauthorizedException('Invalid SePay webhook authorization');
        }
    }

    private getSepayApiToken() {
        return (
            this.configService.get<string>('SEPAY_API_KEY')?.trim() ||
            this.configService.get<string>('SEPAY_WEBHOOK_TOKEN')?.trim() ||
            null
        );
    }

    private async getAppointmentAmount(doctorId: number) {
        const doctor = await this.prisma.doctorProfile.findUnique({
            where: { doctor_id: doctorId },
            select: { consultation_fee: true },
        });

        return Math.round(Number(doctor?.consultation_fee || 0));
    }

    private async confirmAppointmentPayment(
        appointmentId: number,
        amount: number,
        transactionId: string,
        paymentMethod: string,
        rawResponse?: unknown,
    ) {
        return this.prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.findUnique({
                where: { appointment_id: appointmentId },
            });

            if (!appointment) {
                return {
                    success: false,
                    message: `Không tìm thấy lịch hẹn #${appointmentId}`,
                };
            }

            if (appointment.status === 'CONFIRMED') {
                return {
                    success: true,
                    message: 'Đã xác nhận trước đó',
                    appointment_id: appointmentId,
                };
            }

            if (appointment.status === 'CANCELLED') {
                return {
                    success: false,
                    message: `Lịch hẹn #${appointmentId} đã bị hủy, không thể xác nhận thanh toán`,
                };
            }

            const expectedAmount = await this.getAppointmentAmount(appointment.doctor_id);
            if (expectedAmount > 0 && Math.round(amount) !== expectedAmount) {
                return {
                    success: false,
                    message: `Số tiền chuyển khoản không khớp: ${amount} != ${expectedAmount}`,
                };
            }

            const existingPayment = await tx.payment.findFirst({
                where: { appointment_id: appointmentId },
            });

            if (existingPayment) {
                await tx.payment.update({
                    where: { payment_id: existingPayment.payment_id },
                    data: {
                        amount,
                        status: 'COMPLETED',
                        payment_method: paymentMethod,
                        transaction_id: transactionId,
                        paid_at: new Date(),
                    },
                });
            } else {
                await tx.payment.create({
                    data: {
                        appointment_id: appointmentId,
                        patient_id: appointment.patient_id,
                        amount,
                        status: 'COMPLETED',
                        payment_method: paymentMethod,
                        transaction_id: transactionId,
                        paid_at: new Date(),
                    },
                });
            }

            await tx.appointment.update({
                where: { appointment_id: appointmentId },
                data: {
                    status: 'CONFIRMED',
                    notes: appointment.notes || (rawResponse ? JSON.stringify(rawResponse).slice(0, 500) : appointment.notes),
                },
            });

            return {
                success: true,
                message: `Xác nhận lịch hẹn #${appointmentId} thành công`,
                appointment_id: appointmentId,
            };
        });
    }

    private async fetchSepayTransactions(appointment: { appointment_id: number; doctor_id: number; created_at: Date }) {
        const token = this.getSepayApiToken();
        if (!token) {
            return [];
        }

        const expectedAmount = await this.getAppointmentAmount(appointment.doctor_id);
        const params = new URLSearchParams({
            amount_in: String(expectedAmount),
            limit: '20',
            transaction_date_min: appointment.created_at.toISOString().slice(0, 10),
        });

        const accountNumber = this.configService.get<string>('SEPAY_ACCOUNT_NUMBER')?.trim();
        if (accountNumber) {
            params.set('account_number', accountNumber);
        }

        const response = await fetch(`https://my.sepay.vn/userapi/transactions/list?${params.toString()}`, {
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`SePay user API responded with ${response.status}`);
        }

        const payload = (await response.json()) as SepayTransactionListResponse;
        return payload.messages?.success && Array.isArray(payload.transactions)
            ? payload.transactions
            : [];
    }

    private async reconcilePendingSepayPayment(appointment: { appointment_id: number; doctor_id: number; created_at: Date }) {
        const expectedAmount = await this.getAppointmentAmount(appointment.doctor_id);
        const transactions = await this.fetchSepayTransactions(appointment);
        const matchedTransaction = transactions.find((transaction) =>
            Math.round(Number(transaction.amount_in || 0)) === expectedAmount &&
            this.matchesTransferContent(transaction.transaction_content, appointment.appointment_id),
        );

        if (!matchedTransaction) {
            return false;
        }

        await this.confirmAppointmentPayment(
            appointment.appointment_id,
            Number(matchedTransaction.amount_in || 0),
            String(matchedTransaction.id),
            'BANK_TRANSFER',
            matchedTransaction,
        );

        return true;
    }

    getSystemSlots() {
        return SYSTEM_TIME_SLOTS;
    }

    createSystemSlot(dto: any) {
        const nextId = Math.max(...SYSTEM_TIME_SLOTS.map((slot) => slot.slot_template_id)) + 1;
        return {
            slot_template_id: nextId,
            shift_name: dto.shift_name,
            start_time: dto.start_time,
            end_time: dto.end_time,
            is_active: dto.is_active ?? true,
        };
    }

    async registerAvailability(userId: number, dto: { days_of_week?: number[]; system_slot_ids?: number[] }) {
        const doctorId = await this.getDoctorIdForUser(userId);
        const days = dto.days_of_week || [];
        const slotIds = dto.system_slot_ids || [];

        if (days.length === 0 || slotIds.length === 0) {
            throw new BadRequestException('Select at least one day and one time slot');
        }

        const selectedSlots = SYSTEM_TIME_SLOTS.filter((slot) =>
            slotIds.includes(slot.slot_template_id),
        );

        if (selectedSlots.length !== slotIds.length) {
            throw new BadRequestException('Invalid time slot');
        }

        const data = days.flatMap((day) =>
            selectedSlots.map((slot) => ({
                doctor_id: doctorId,
                day_of_week: day,
                start_time: slot.start_time,
                end_time: slot.end_time,
                is_available: true,
            })),
        );

        await this.prisma.$transaction(async (tx) => {
            await tx.doctorSchedule.deleteMany({
                where: {
                    doctor_id: doctorId,
                    day_of_week: { in: days },
                },
            });

            await tx.doctorSchedule.createMany({ data });
        });

        return this.getDoctorAvailability(userId);
    }

    async getDoctorAvailability(userId: number) {
        const doctorId = await this.getDoctorIdForUser(userId);
        const schedules = await this.prisma.doctorSchedule.findMany({
            where: {
                doctor_id: doctorId,
                is_available: true,
            },
            orderBy: [
                { day_of_week: 'asc' },
                { start_time: 'asc' },
            ],
        });

        const byDay = new Map<number, {
            day_of_week: number;
            slots: { availability_id: number; shift_name: string; start_time: string }[];
        }>();

        for (const schedule of schedules) {
            const slot = SYSTEM_TIME_SLOTS.find((systemSlot) =>
                systemSlot.start_time === schedule.start_time &&
                systemSlot.end_time === schedule.end_time,
            );
            const day = byDay.get(schedule.day_of_week) || {
                day_of_week: schedule.day_of_week,
                slots: [],
            };
            day.slots.push({
                availability_id: schedule.schedule_id,
                shift_name: slot?.shift_name || `${schedule.start_time} - ${schedule.end_time}`,
                start_time: schedule.start_time,
            });
            byDay.set(schedule.day_of_week, day);
        }

        return Array.from(byDay.values());
    }

    async deleteAvailability(userId: number, availabilityId: number) {
        const doctorId = await this.getDoctorIdForUser(userId);
        const result = await this.prisma.doctorSchedule.deleteMany({
            where: {
                schedule_id: availabilityId,
                doctor_id: doctorId,
            },
        });

        if (result.count === 0) {
            throw new NotFoundException('Availability not found');
        }

        return { success: true };
    }

    async getAvailableSlots(query: { date?: string; doctorId?: string | number }) {
        const today = getBangkokToday();
        const endOfNextWeek = getEndOfNextWeek();
        const requestedDate = query.date ? parseIsoDate(query.date) : today;
        const requestedDateIso = toIsoDate(requestedDate);

        if (requestedDate < today || requestedDate > endOfNextWeek) {
            return [];
        }

        const requestedDay = getDayOfWeek(requestedDate);
        const doctorId = query.doctorId ? Number(query.doctorId) : undefined;
        const schedules = await this.prisma.doctorSchedule.findMany({
            where: {
                day_of_week: requestedDay,
                is_available: true,
                ...(doctorId ? { doctor_id: doctorId } : {}),
            },
            orderBy: [
                { start_time: 'asc' },
                { doctor_id: 'asc' },
            ],
        });

        if (schedules.length === 0) {
            return [];
        }

        const doctorIds = Array.from(new Set(schedules.map((schedule) => schedule.doctor_id)));
        const [doctors, appointments] = await Promise.all([
            this.prisma.doctorProfile.findMany({
                where: { doctor_id: { in: doctorIds } },
            }),
            this.prisma.appointment.findMany({
                where: {
                    doctor_id: { in: doctorIds },
                    schedule_date: requestedDate,
                    status: { notIn: ['CANCELLED', 'COMPLETED'] },
                },
            }),
        ]);

        const userProfiles = await this.prisma.userProfile.findMany({
            where: {
                user_id: {
                    in: doctors.map((doctor) => doctor.user_id),
                },
            },
        });
        const doctorsById = new Map(doctors.map((doctor) => [doctor.doctor_id, doctor]));
        const namesByUserId = new Map(userProfiles.map((profile) => [profile.user_id, profile.full_name]));
        const bookedKeys = new Set(
            appointments.map((appointment) =>
                `${appointment.doctor_id}|${appointment.start_time}`,
            ),
        );

        return schedules.flatMap((schedule) => {
            if (bookedKeys.has(`${schedule.doctor_id}|${schedule.start_time}`)) {
                return [];
            }

            const systemSlot = SYSTEM_TIME_SLOTS.find((slot) =>
                slot.start_time === schedule.start_time &&
                slot.end_time === schedule.end_time,
            );
            if (!systemSlot) {
                return [];
            }

            const doctor = doctorsById.get(schedule.doctor_id);
            if (!doctor) {
                return [];
            }

            const fullName = namesByUserId.get(doctor.user_id) || `Bác sĩ #${doctor.doctor_id}`;

            return [{
                slot_id: encodeSlotId(schedule.doctor_id, requestedDateIso, systemSlot.slot_template_id),
                date_slot: requestedDateIso,
                start_time: schedule.start_time,
                end_time: schedule.end_time,
                price: doctor.consultation_fee,
                is_locked: false,
                doctor: {
                    doctor_id: doctor.doctor_id,
                    full_name: fullName,
                    title: doctor.specialization,
                    avatar_url: undefined,
                    specialties: doctor.specialization ? [doctor.specialization] : [],
                },
            }];
        });
    }

    async lockCalendarSlot(slotId: number, _userId: number) {
        const slot = await this.resolveSlot(slotId);
        const existing = await this.prisma.appointment.findFirst({
            where: {
                doctor_id: slot.doctorId,
                schedule_date: parseIsoDate(slot.date),
                start_time: slot.systemSlot.start_time,
                status: { notIn: ['CANCELLED', 'COMPLETED'] },
            },
        });

        if (existing) {
            throw new BadRequestException('Time slot is already booked');
        }

        return {
            locked: true,
            slot_id: slotId,
        };
    }

    private async resolveSlot(slotId: number) {
        const decoded = decodeSlotId(slotId);
        const date = parseIsoDate(decoded.date);
        const today = getBangkokToday();
        const endOfNextWeek = getEndOfNextWeek();

        if (date < today || date > endOfNextWeek) {
            throw new BadRequestException('Slot is outside the allowed booking range');
        }

        const systemSlot = SYSTEM_TIME_SLOTS.find((slot) =>
            slot.slot_template_id === decoded.slotTemplateId,
        );
        if (!systemSlot) {
            throw new NotFoundException('Time slot not found');
        }

        const schedule = await this.prisma.doctorSchedule.findFirst({
            where: {
                doctor_id: decoded.doctorId,
                day_of_week: getDayOfWeek(date),
                start_time: systemSlot.start_time,
                end_time: systemSlot.end_time,
                is_available: true,
            },
        });

        if (!schedule) {
            throw new NotFoundException('Schedule not found');
        }

        return {
            ...decoded,
            systemSlot,
            schedule,
        };
    }

    async createAppointment(userId: number, dto: CreateAppointmentDto) {
        let data: {
            patient_id: number;
            doctor_id: number;
            schedule_date: Date;
            start_time: string;
            end_time: string;
            reason?: string;
            notes?: string;
        };

        if (dto.slot_id) {
            const slot = await this.resolveSlot(dto.slot_id);
            data = {
                patient_id: userId,
                doctor_id: slot.doctorId,
                schedule_date: parseIsoDate(slot.date),
                start_time: slot.systemSlot.start_time,
                end_time: slot.systemSlot.end_time,
                reason: dto.description,
                notes: dto.notes,
            };
        } else {
            data = {
                patient_id: dto.patient_id || userId,
                doctor_id: dto.doctor_id!,
                schedule_date: parseIsoDate(dto.schedule_date!),
                start_time: dto.start_time!,
                end_time: dto.end_time!,
                reason: dto.reason,
                notes: dto.notes,
            };
        }

        const existing = await this.prisma.appointment.findFirst({
            where: {
                doctor_id: data.doctor_id,
                schedule_date: data.schedule_date,
                start_time: data.start_time,
                status: { notIn: ['CANCELLED', 'COMPLETED'] },
            },
        });

        if (existing) {
            throw new BadRequestException('Time slot is already booked');
        }

        return this.prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.create({
                data: {
                    ...data,
                    status: 'PENDING_PAYMENT',
                },
            });

            const amount = await this.getAppointmentAmount(data.doctor_id);
            await tx.payment.create({
                data: {
                    appointment_id: appointment.appointment_id,
                    patient_id: data.patient_id,
                    amount,
                    status: 'PENDING',
                    payment_method: 'BANK_TRANSFER',
                },
            });

            return appointment;
        });
    }

    async getAppointment(id: number) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { appointment_id: id },
        });

        if (!appointment) {
            throw new NotFoundException('Appointment not found');
        }

        return appointment;
    }

    private async formatAppointments(appointments: any[]) {
        if (appointments.length === 0) {
            return [];
        }

        const doctorIds = Array.from(new Set(appointments.map((appointment) => appointment.doctor_id)));
        const patientUserIds = Array.from(new Set(appointments.map((appointment) => appointment.patient_id)));

        const doctors = await this.prisma.doctorProfile.findMany({
            where: { doctor_id: { in: doctorIds } },
        });
        const doctorUserIds = doctors.map((doctor) => doctor.user_id);
        const userProfiles = await this.prisma.userProfile.findMany({
            where: { user_id: { in: [...doctorUserIds, ...patientUserIds] } },
        });

        const doctorsById = new Map(doctors.map((doctor) => [doctor.doctor_id, doctor]));
        const namesByUserId = new Map(userProfiles.map((profile) => [profile.user_id, profile.full_name]));

        return appointments.map((appointment) => {
            const doctor = doctorsById.get(appointment.doctor_id);
            const doctorName = doctor ? namesByUserId.get(doctor.user_id) : undefined;
            const patientName = namesByUserId.get(appointment.patient_id);
            const isPaid = paidStatuses.has(appointment.status);

            return {
                ...appointment,
                meeting_link: isPaid ? `https://tele-eye.vn/meeting/${appointment.appointment_id}` : null,
                slot: {
                    start_time: appointment.start_time,
                    end_time: appointment.end_time,
                    date_slot: toIsoDate(appointment.schedule_date),
                },
                patient: {
                    patient_id: appointment.patient_id,
                    user_id: appointment.patient_id,
                    full_name: patientName || `Bệnh nhân #${appointment.patient_id}`,
                },
                doctor: doctor ? {
                    doctor_id: doctor.doctor_id,
                    user_id: doctor.user_id,
                    full_name: doctorName || `Bác sĩ #${doctor.doctor_id}`,
                    title: doctor.specialization,
                    consultation_fee: doctor.consultation_fee,
                    is_verified: true,
                    specializations: doctor.specialization ? [doctor.specialization] : [],
                } : undefined,
                medical_record: appointment.reason ? { chief_complaint: appointment.reason } : undefined,
            };
        });
    }

    async getMyAppointments(userId: number) {
        const appointments = await this.prisma.appointment.findMany({
            where: { patient_id: userId },
            orderBy: { created_at: 'desc' },
        });

        return this.formatAppointments(appointments);
    }

    async getDoctorAppointmentsToday(userId: number) {
        const doctorId = await this.getDoctorIdForUser(userId);
        const today = getBangkokToday();
        const appointments = await this.prisma.appointment.findMany({
            where: {
                doctor_id: doctorId,
                schedule_date: today,
                status: { in: ['PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] },
            },
            orderBy: { start_time: 'asc' },
        });

        return this.formatAppointments(appointments);
    }

    async startAppointment(userId: number, appointmentId: number) {
        const doctorId = await this.getDoctorIdForUser(userId);
        const appointment = await this.prisma.appointment.findUnique({
            where: { appointment_id: appointmentId },
        });

        if (!appointment) {
            throw new NotFoundException('Appointment not found');
        }

        if (appointment.doctor_id !== doctorId) {
            throw new ForbiddenException('You cannot start another doctor appointment');
        }

        if (appointment.status !== 'CONFIRMED') {
            throw new BadRequestException('Only confirmed appointments can be started');
        }

        return this.prisma.appointment.update({
            where: { appointment_id: appointmentId },
            data: { status: 'IN_PROGRESS' },
        });
    }

    async completeAppointment(userId: number, appointmentId: number) {
        const doctorId = await this.getDoctorIdForUser(userId);
        const appointment = await this.prisma.appointment.findUnique({
            where: { appointment_id: appointmentId },
        });

        if (!appointment) {
            throw new NotFoundException('Appointment not found');
        }

        if (appointment.doctor_id !== doctorId) {
            throw new ForbiddenException('You cannot complete another doctor appointment');
        }

        if (appointment.status !== 'IN_PROGRESS') {
            throw new BadRequestException('Only in-progress appointments can be completed');
        }

        return this.prisma.appointment.update({
            where: { appointment_id: appointmentId },
            data: { status: 'COMPLETED' },
        });
    }

    async handleSepayWebhook(authorization: string | undefined, body: any) {
        this.validateSepayAuthorization(authorization);

        const content = String(
            body.content ||
            body.description ||
            body.transaction_content ||
            '',
        );
        const appointmentId = this.extractAppointmentId(content);
        if (!appointmentId) {
            return {
                success: false,
                message: 'Nội dung không khớp định dạng TELEEYE {id}',
            };
        }

        const amount = Number(body.transferAmount || body.amount || body.amount_in || 0);
        if (!amount) {
            return {
                success: false,
                message: 'Webhook thiếu số tiền chuyển khoản',
            };
        }

        return this.confirmAppointmentPayment(
            appointmentId,
            amount,
            String(body.id || body.reference_number || Date.now()),
            'BANK_TRANSFER',
            body,
        );
    }

    async getPaymentStatus(appointmentId: number, userId: number) {
        let appointment = await this.prisma.appointment.findUnique({
            where: { appointment_id: appointmentId },
        });

        if (!appointment) {
            throw new NotFoundException('Appointment not found');
        }

        if (appointment.patient_id !== userId) {
            throw new ForbiddenException('You cannot view this appointment payment');
        }

        if (appointment.status === 'PENDING_PAYMENT') {
            const completedPayment = await this.prisma.payment.findFirst({
                where: {
                    appointment_id: appointmentId,
                    status: 'COMPLETED',
                },
            });

            if (completedPayment) {
                await this.confirmAppointmentPayment(
                    appointmentId,
                    Number(completedPayment.amount),
                    completedPayment.transaction_id || `payment-${completedPayment.payment_id}`,
                    completedPayment.payment_method || 'BANK_TRANSFER',
                );
            } else {
                try {
                    await this.reconcilePendingSepayPayment(appointment);
                } catch (error) {
                    console.warn(
                        `[SePay Reconcile] failed for appointment #${appointmentId}:`,
                        error instanceof Error ? error.message : error,
                    );
                }
            }

            appointment = await this.prisma.appointment.findUnique({
                where: { appointment_id: appointmentId },
            });
        }

        if (!appointment) {
            throw new NotFoundException('Appointment not found');
        }

        return {
            appointment_id: appointmentId,
            status: appointment.status,
            paid: paidStatuses.has(appointment.status),
            meeting_link: paidStatuses.has(appointment.status)
                ? `https://tele-eye.vn/meeting/${appointmentId}`
                : null,
        };
    }

    async getPatientAppointments(patientId: number) {
        return this.prisma.appointment.findMany({
            where: { patient_id: patientId },
            orderBy: { schedule_date: 'desc' },
        });
    }

    async getDoctorAppointments(doctorId: number) {
        return this.prisma.appointment.findMany({
            where: { doctor_id: doctorId },
            orderBy: { schedule_date: 'desc' },
        });
    }

    async updateAppointment(id: number, dto: UpdateAppointmentDto) {
        await this.getAppointment(id);

        return this.prisma.appointment.update({
            where: { appointment_id: id },
            data: dto,
        });
    }

    async cancelAppointment(id: number) {
        await this.getAppointment(id);

        return this.prisma.appointment.update({
            where: { appointment_id: id },
            data: { status: 'CANCELLED' },
        });
    }

    async getDoctorSchedule(doctorId: number) {
        return this.prisma.doctorSchedule.findMany({
            where: { doctor_id: doctorId },
            orderBy: { day_of_week: 'asc' },
        });
    }

    async updateDoctorSchedule(doctorId: number, schedules: any[]) {
        await this.prisma.doctorSchedule.deleteMany({
            where: { doctor_id: doctorId },
        });

        return this.prisma.doctorSchedule.createMany({
            data: schedules.map((s) => ({ doctor_id: doctorId, ...s })),
        });
    }
}
