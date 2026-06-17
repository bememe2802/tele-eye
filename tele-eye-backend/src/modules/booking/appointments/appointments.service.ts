// src/modules/booking/appointment/appointment.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppointmentStatus, FileType } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { MailService } from '../../mail/mail.service';
import {
  CompleteAppointmentDto,
  CreateAppointmentDto,
} from './dto/appointment.dto';

interface AppointmentPaymentContext {
  appointment_id: number;
  slot_id: number;
  status: AppointmentStatus;
  meeting_link: string | null;
  created_at: Date;
  patient: {
    user_id: number;
  };
  slot: {
    price: unknown;
  };
}

interface SepayTransactionItem {
  id: string;
  transaction_date?: string;
  account_number?: string;
  amount_in?: string;
  transaction_content?: string;
  reference_number?: string;
  bank_brand_name?: string;
  bank_account_id?: string;
}

interface SepayTransactionListResponse {
  status?: number;
  error?: unknown;
  messages?: {
    success?: boolean;
  };
  transactions?: SepayTransactionItem[];
}

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    private prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) { }

  private buildMeetingLink(appointmentId: number) {
    const uid = require('crypto').randomUUID().replace(/-/g, '').substring(0, 12);
    return `https://tele-eye.vn/meeting/${appointmentId}-${uid}`;
  }

  private extractAppointmentId(content?: string | null) {
    const match = (content || '').toUpperCase().match(/\bTELEEYE\s+(\d+)\b/);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  private matchesTransferContent(
    content: string | undefined,
    appointmentId: number,
  ) {
    return new RegExp(`\\bTELEEYE\\s+${appointmentId}\\b`).test(
      (content || '').toUpperCase(),
    );
  }

  private getSepayApiToken() {
    return (
      this.configService.get<string>('SEPAY_API_KEY')?.trim() ||
      this.configService.get<string>('SEPAY_WEBHOOK_TOKEN')?.trim() ||
      null
    );
  }

  private async confirmAppointmentPayment(
    tx: PrismaService | any,
    appointment: AppointmentPaymentContext,
    payment: {
      amount: number;
      externalTransactionId: string;
      paymentMethod: string;
      description: string;
      rawResponse: unknown;
    },
  ) {
    const existingPayment = await tx.appointmentPayment.findFirst({
      where: { appointment_id: appointment.appointment_id },
    });

    if (appointment.status === AppointmentStatus.CONFIRMED || existingPayment) {
      if (appointment.status !== AppointmentStatus.CONFIRMED) {
        await tx.appointment.update({
          where: { appointment_id: appointment.appointment_id },
          data: {
            status: AppointmentStatus.CONFIRMED,
            meeting_link:
              appointment.meeting_link ||
              this.buildMeetingLink(appointment.appointment_id),
          },
        });
      }

      await tx.doctorCalendarSlots.update({
        where: { slot_id: appointment.slot_id },
        data: {
          status: 'BOOKED',
          is_locked: false,
          locked_by_user_id: null,
          locked_expires_at: null,
        },
      });

      return {
        success: true,
        message: `Xác nhận lịch hẹn #${appointment.appointment_id} thành công`,
      };
    }

    let transaction = await tx.transaction.findFirst({
      where: {
        external_transaction_id: payment.externalTransactionId,
      },
    });

    if (!transaction) {
      transaction = await tx.transaction.create({
        data: {
          user_id: appointment.patient.user_id,
          amount: payment.amount,
          type: 'PAYMENT',
          status: 'SUCCESS',
          payment_method: payment.paymentMethod,
          external_transaction_id: payment.externalTransactionId,
          description: payment.description,
          raw_response: payment.rawResponse,
        },
      });
    }

    await tx.appointmentPayment.create({
      data: {
        appointment_id: appointment.appointment_id,
        transaction_id: transaction.transaction_id,
        amount: payment.amount,
      },
    });

    await tx.appointment.update({
      where: { appointment_id: appointment.appointment_id },
      data: {
        status: AppointmentStatus.CONFIRMED,
        meeting_link:
          appointment.meeting_link ||
          this.buildMeetingLink(appointment.appointment_id),
      },
    });

    await tx.doctorCalendarSlots.update({
      where: { slot_id: appointment.slot_id },
      data: {
        status: 'BOOKED',
        is_locked: false,
        locked_by_user_id: null,
        locked_expires_at: null,
      },
    });

    return {
      success: true,
      message: `Xác nhận lịch hẹn #${appointment.appointment_id} thành công`,
    };
  }

  private async fetchSepayTransactionsForAppointment(
    appointment: AppointmentPaymentContext,
  ) {
    const token = this.getSepayApiToken();
    if (!token) return [];

    const expectedAmount = Math.round(Number(appointment.slot.price || 0));
    const params = new URLSearchParams({
      amount_in: String(expectedAmount),
      limit: '20',
      transaction_date_min: appointment.created_at.toISOString().slice(0, 10),
    });

    const configuredAccountNumber = this.configService
      .get<string>('SEPAY_ACCOUNT_NUMBER')
      ?.trim();

    if (configuredAccountNumber) {
      params.set('account_number', configuredAccountNumber);
    }

    const response = await fetch(
      `https://my.sepay.vn/userapi/transactions/list?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`SePay user API responded with ${response.status}`);
    }

    const payload = (await response.json()) as SepayTransactionListResponse;

    if (!payload.messages?.success || !Array.isArray(payload.transactions)) {
      return [];
    }

    return payload.transactions;
  }

  private async reconcilePendingSepayPayment(
    appointmentId: number,
    userId: number,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: {
        patient: true,
        slot: true,
      },
    });

    if (!appointment || appointment.patient.user_id !== userId) {
      return false;
    }

    if (appointment.status !== AppointmentStatus.PENDING_PAYMENT) {
      return false;
    }

    const expectedAmount = Math.round(Number(appointment.slot.price || 0));
    const transactions =
      await this.fetchSepayTransactionsForAppointment(appointment);
    const matchedTransaction = transactions.find((transaction) => {
      const amountIn = Math.round(Number(transaction.amount_in || 0));
      return (
        amountIn === expectedAmount &&
        this.matchesTransferContent(
          transaction.transaction_content,
          appointment.appointment_id,
        )
      );
    });

    if (!matchedTransaction) {
      return false;
    }

    this.logger.log(
      `[SePay Reconcile] matched transaction ${matchedTransaction.id} for appointment #${appointmentId}`,
    );

    await this.prisma.$transaction(async (tx) => {
      const freshAppointment = await tx.appointment.findUnique({
        where: { appointment_id: appointmentId },
        include: {
          patient: true,
          slot: true,
        },
      });

      if (
        !freshAppointment ||
        freshAppointment.status !== AppointmentStatus.PENDING_PAYMENT
      ) {
        return;
      }

      await this.confirmAppointmentPayment(tx, freshAppointment, {
        amount: Number(matchedTransaction.amount_in || 0),
        externalTransactionId: String(matchedTransaction.id),
        paymentMethod: 'BANK_TRANSFER',
        description: `Chuyen khoan SePay - lich hen #${appointmentId}`,
        rawResponse: matchedTransaction,
      });
    });

    return true;
  }

  async createAppointment(
    userId: number,
    dto: CreateAppointmentDto,
    _ipAddr?: string,
  ) {
    const { slot_id, description, medical_files } = dto;
    const now = new Date();

    // 1. Lấy Patient ID
    const patient = await this.prisma.patient.findUnique({
      where: { user_id: userId },
    });
    if (!patient)
      throw new BadRequestException('Không tìm thấy hồ sơ bệnh nhân');

    return await this.prisma.$transaction(async (tx) => {
      // BƯỚC 1: Kiểm tra Slot và Quyền sở hữu Lock
      const slot = await tx.doctorCalendarSlots.findUnique({
        where: { slot_id },
      });

      if (!slot) throw new NotFoundException('Khung giờ không tồn tại');

      const isOwner = slot.locked_by_user_id === userId;
      const isStillLocked =
        slot.is_locked &&
        slot.locked_expires_at &&
        slot.locked_expires_at > now;

      if (!isOwner || !isStillLocked) {
        throw new ConflictException(
          'Lượt giữ chỗ đã hết hạn hoặc không hợp lệ',
        );
      }
      const existingActiveApp = await tx.appointment.findFirst({
        where: {
          slot_id: slot_id,
          status: { in: ['PENDING_PAYMENT', 'CONFIRMED'] },
        },
      });

      if (existingActiveApp) {
        throw new ConflictException(
          'Khung giờ này đang được người khác giữ hoặc đã thanh toán!',
        );
      }

      // BƯỚC 2: Tạo Appointment ở trạng thái PENDING_PAYMENT (chờ SePay webhook)
      const appointment = await tx.appointment.create({
        data: {
          slot_id: slot.slot_id,
          patient_id: patient.patient_id,
          doctor_id: slot.doctor_id,
          status: AppointmentStatus.PENDING_PAYMENT, // ← Chờ SePay xác nhận
          medical_record: {
            create: { chief_complaint: description },
          },
          files: {
            create:
              medical_files?.map((url) => ({
                file_url: url,
                file_type: FileType.EYE_IMAGE,
                uploader: { connect: { user_id: userId } },
              })) || [],
          },
        },
      });

      // KHÔNG tự CONFIRM ở đây nữa — để webhook SePay làm việc đó

      return {
        message: 'Đặt lịch thành công! Vui lòng chuyển khoản để xác nhận.',
        appointment_id: appointment.appointment_id,
      };
    });
  }

  async handlePaymentResult(
    appointmentId: number,
    vnpayTranNo: string,
    amountPaid: number,
    rawQuery: any,
    isSuccess: boolean,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { appointment_id: appointmentId },
        include: {
          patient: true,
          slot: true,
        },
      });

      if (!appointment) throw new NotFoundException('Không tìm thấy lịch hẹn');

      if (appointment.status === AppointmentStatus.CONFIRMED && isSuccess) {
        return appointment;
      }

      const transaction = await tx.transaction.create({
        data: {
          user_id: appointment.patient.user_id,
          amount: amountPaid,
          type: 'PAYMENT',
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          payment_method: 'VNPAY',
          external_transaction_id: vnpayTranNo,
          description: `Thanh toan lich hen #${appointmentId}`,
          raw_response: rawQuery,
        },
      });

      if (isSuccess) {
        const expectedAmount = Math.round(Number(appointment.slot.price || 0));
        if (Math.round(amountPaid) !== expectedAmount) {
          this.logger.warn(
            `[VNPAY] Số tiền không khớp: nhận ${amountPaid}, yêu cầu ${expectedAmount} cho appointment #${appointmentId}`,
          );
          throw new BadRequestException(
            `Số tiền thanh toán không khớp: nhận ${amountPaid} VNĐ, yêu cầu ${expectedAmount} VNĐ`,
          );
        }

        await tx.appointmentPayment.create({
          data: {
            appointment_id: appointment.appointment_id,
            transaction_id: transaction.transaction_id,
            amount: amountPaid,
          },
        });

        const meetingLink = this.buildMeetingLink(appointment.appointment_id);

        await tx.appointment.update({
          where: { appointment_id: appointment.appointment_id },
          data: {
            status: AppointmentStatus.CONFIRMED,
            meeting_link: meetingLink,
          },
        });

        await tx.doctorCalendarSlots.update({
          where: { slot_id: appointment.slot_id },
          data: {
            status: 'BOOKED',
            is_locked: false,
            locked_by_user_id: null,
            locked_expires_at: null,
          },
        });
      }

      return {
        appointmentId: appointment.appointment_id,
        status: isSuccess ? 'SUCCESS' : 'FAILED',
      };
    });
  }

  async getDoctorAppointmentsToday(userId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { user_id: userId },
    });

    if (!doctor) {
      throw new BadRequestException('Không tìm thấy thông tin bác sĩ.');
    }

    const todayUTC = new Date();
    const startOfDay = new Date(
      Date.UTC(
        todayUTC.getUTCFullYear(),
        todayUTC.getUTCMonth(),
        todayUTC.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const endOfDay = new Date(
      Date.UTC(
        todayUTC.getUTCFullYear(),
        todayUTC.getUTCMonth(),
        todayUTC.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctor_id: doctor.doctor_id,
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
        slot: {
          date_slot: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      },
      include: {
        slot: {
          select: { start_time: true, end_time: true },
        },
        patient: true,
        medical_record: {
          select: { chief_complaint: true },
        },
        files: {
          select: { file_url: true, file_type: true },
        },
      },
      orderBy: {
        slot: { start_time: 'asc' },
      },
    });

    return appointments;
  }

  async startAppointment(userId: number, appointmentId: number) {
    const now = new Date();

    const doctor = await this.prisma.doctor.findUnique({
      where: { user_id: userId },
    });

    if (!doctor) {
      throw new BadRequestException('Không tìm thấy thông tin bác sĩ.');
    }

    return await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { appointment_id: appointmentId },
        include: { slot: true },
      });

      if (!appointment) {
        throw new NotFoundException('Không tìm thấy lịch hẹn.');
      }

      if (appointment.doctor_id !== doctor.doctor_id) {
        throw new ForbiddenException(
          'Bạn không có quyền thao tác trên ca khám của bác sĩ khác.',
        );
      }

      if (appointment.status !== 'CONFIRMED') {
        throw new BadRequestException(
          'Chỉ có thể bắt đầu ca khám khi trạng thái là CONFIRMED.',
        );
      }

      const activeAppointment = await tx.appointment.findFirst({
        where: {
          doctor_id: doctor.doctor_id,
          status: 'IN_PROGRESS',
        },
      });

      if (activeAppointment) {
        throw new ConflictException(
          `Bạn đang có ca khám #${activeAppointment.appointment_id} đang diễn ra. Vui lòng kết thúc ca đó trước.`,
        );
      }

      const slotDate = new Date(appointment.slot.date_slot);
      const startTimeSource = new Date(appointment.slot.start_time);

      const slotStartDateTime = new Date(
        Date.UTC(
          slotDate.getUTCFullYear(),
          slotDate.getUTCMonth(),
          slotDate.getUTCDate(),
          startTimeSource.getUTCHours(),
          startTimeSource.getUTCMinutes(),
          0,
          0,
        ),
      );

      const allowedStartTime = new Date(
        slotStartDateTime.getTime() - 15 * 60000,
      );

      const maxLateTime = new Date(slotStartDateTime.getTime() + 30 * 60000);

      const nowMs = now.getTime();

      if (nowMs < allowedStartTime.getTime()) {
        throw new BadRequestException(
          'Chưa đến giờ khám. Bạn chỉ có thể bắt đầu trước giờ hẹn tối đa 15 phút.',
        );
      }

      if (nowMs > maxLateTime.getTime()) {
        throw new BadRequestException(
          'Ca khám đã quá hạn 30 phút so với lịch hẹn. Không thể bắt đầu.',
        );
      }

      const updatedAppointment = await tx.appointment.update({
        where: { appointment_id: appointmentId },
        data: {
          status: 'IN_PROGRESS',
          actual_start_at: now,
        },
      });

      return {
        message: 'Ca khám đã chính thức bắt đầu.',
        appointment_id: updatedAppointment.appointment_id,
        status: updatedAppointment.status,
        actual_start_at: updatedAppointment.actual_start_at,
      };
    });
  }

  async completeAppointment(
    userId: number,
    appointmentId: number,
    dto: CompleteAppointmentDto,
  ) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { user_id: userId },
    });
    if (!doctor)
      throw new BadRequestException('Không tìm thấy thông tin bác sĩ.');

    const result = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { appointment_id: appointmentId },
      });

      if (!appointment) throw new NotFoundException('Không tìm thấy lịch hẹn.');
      if (appointment.doctor_id !== doctor.doctor_id) {
        throw new ForbiddenException(
          'Bạn không có quyền thao tác trên ca khám này.',
        );
      }
      if (appointment.status !== 'IN_PROGRESS') {
        throw new BadRequestException(
          'Chỉ có thể kết thúc ca khám đang ở trạng thái IN_PROGRESS.',
        );
      }
      let existingDrugs: any[] = [];
      if (dto.drug_prescription && dto.drug_prescription.length > 0) {
        const drugIds = dto.drug_prescription.map((item) => item.drug_id);

        existingDrugs = await tx.drug.findMany({
          where: { drug_id: { in: drugIds }, is_active: true },
          select: { drug_id: true, name: true, unit: true },
        });

        if (existingDrugs.length !== drugIds.length) {
          throw new BadRequestException(
            'Một hoặc nhiều loại thuốc không tồn tại hoặc đã ngừng kinh doanh.',
          );
        }
      }

      const drugPrescriptionCreate =
        dto.drug_prescription && dto.drug_prescription.length > 0
          ? {
            create: {
              items: {
                create: dto.drug_prescription.map((item) => ({
                  drug_id: item.drug_id,
                  quantity: item.quantity,
                  dosage: item.dosage,
                  note: item.note,
                })),
              },
            },
          }
          : undefined;

      await tx.eyeMedicalRecord.update({
        where: { appointment_id: appointmentId },
        data: {
          diagnosis_od: dto.diagnosis_od,
          diagnosis_os: dto.diagnosis_os,
          icd_10_code: dto.icd_10_code,
          management_plan: dto.management_plan,
          doctor_notes: dto.doctor_notes,

          glasses_prescription: dto.glasses_prescription
            ? {
              upsert: {
                create: dto.glasses_prescription,
                update: dto.glasses_prescription,
              },
            }
            : undefined,

          drug_prescription: drugPrescriptionCreate,
        },
      });

      const updatedAppointment = await tx.appointment.update({
        where: { appointment_id: appointmentId },
        data: {
          status: 'COMPLETED',
          actual_end_at: new Date(),
        },
        include: {
          patient: {
            select: { full_name: true, user: { select: { email: true } } },
          },
        },
      });

      const enrichedDrugs = dto.drug_prescription?.map((item) => {
        const drugInfo = existingDrugs.find((d) => d.drug_id === item.drug_id);
        return {
          ...item,
          drug_name: drugInfo?.name || 'Thuốc không xác định',
          unit: drugInfo?.unit || 'Hộp',
        };
      });

      return {
        message: 'Ca khám đã hoàn tất và hồ sơ đã được lưu.',
        appointment_id: updatedAppointment.appointment_id,
        status: updatedAppointment.status,
        patientEmail: updatedAppointment.patient?.user?.email,
        patientName: updatedAppointment.patient?.full_name,
        enrichedDrugs: enrichedDrugs,
      };
    });

    const { patientEmail, patientName, enrichedDrugs, ...finalResponse } =
      result;

    if (this.mailService && patientEmail) {
      this.mailService
        .sendMedicalRecordEmail(
          patientEmail,
          patientName || 'Quý khách',
          dto,
          enrichedDrugs || [],
        )
        .catch((err) => {
          console.error('Lỗi khi gửi mail bệnh án:', err);
        });
    }

    return finalResponse;
  }

  async getMedicalRecordDetail(
    userId: number,
    userRole: string,
    appointmentId: number,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: {
        patient: {
          select: { user_id: true, full_name: true, phone_number: true },
        },
        doctor: {
          select: { user_id: true, full_name: true },
        },
        files: true,
        medical_record: {
          include: {
            glasses_prescription: true,
            drug_prescription: {
              include: {
                items: {
                  include: {
                    drug: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy ca khám này.');
    }
    if (userRole === 'PATIENT' && appointment.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Hồ sơ bệnh án và đơn thuốc chỉ khả dụng khi ca khám đã hoàn tất.',
      );
    }
    if (
      userRole === 'DOCTOR' &&
      !['IN_PROGRESS', 'COMPLETED'].includes(appointment.status)
    ) {
      throw new BadRequestException(
        'Hồ sơ bệnh án chưa có dữ liệu để hiển thị.',
      );
    }

    const isPatientOwner =
      userRole === 'PATIENT' && appointment.patient?.user_id === userId;
    const isDoctorOwner =
      userRole === 'DOCTOR' && appointment.doctor?.user_id === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isPatientOwner && !isDoctorOwner && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền xem hồ sơ bệnh án này.');
    }

    return {
      appointment_id: appointment.appointment_id,
      status: appointment.status,
      created_at: appointment.created_at,
      patient_info: appointment.patient,
      doctor_info: appointment.doctor,
      medical_files: appointment.files,
      medical_record: appointment.medical_record,
    };
  }

  async getPatientAppointments(userId: number, page = 1, limit = 10) {
    const patient = await this.prisma.patient.findUnique({
      where: { user_id: userId },
    });
    if (!patient) throw new NotFoundException('Không tìm thấy hồ sơ bệnh nhân');

    const appointments = await this.prisma.appointment.findMany({
      where: { patient_id: patient.patient_id },
      include: {
        slot: {
          select: { start_time: true, end_time: true, date_slot: true },
        },
        doctor: {
          select: {
            doctor_id: true,
            full_name: true,
            title: true,
            avatar_url: true,
            specializations: { include: { spec: true } },
          },
        },
        medical_record: {
          select: { chief_complaint: true },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Ẩn meeting_link cho đến khi bác sĩ bắt đầu ca khám (IN_PROGRESS)
    return appointments.map((a) => ({
      ...a,
      meeting_link: ['IN_PROGRESS', 'COMPLETED'].includes(a.status) ? a.meeting_link : null,
    }));
  }

  // ==========================
  // SePay Webhook Handler
  // ==========================
  async handleSepayWebhook(body: any) {
    const content: string = (
      body.content ||
      body.description ||
      body.transaction_content ||
      ''
    ).toUpperCase();
    const amount: number = Number(body.transferAmount || body.amount || 0);

    // Parse appointment ID từ nội dung chuyển khoản "TELEEYE {id}"
    const appointmentId = this.extractAppointmentId(content);
    if (!appointmentId) {
      return {
        success: false,
        message: 'Nội dung không khớp định dạng TELEEYE {id}',
      };
    }

    return await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { appointment_id: appointmentId },
        include: { slot: true, patient: true },
      });

      if (!appointment) {
        return {
          success: false,
          message: `Không tìm thấy lịch hẹn #${appointmentId}`,
        };
      }

      // Idempotency: bỏ qua nếu đã CONFIRMED rồi
      if (appointment.status === 'CONFIRMED') {
        return { success: true, message: 'Đã xác nhận trước đó' };
      }

      // Từ chối webhook muộn khi appointment đã bị hủy
      if (appointment.status === 'CANCELLED') {
        this.logger.warn(
          `[SePay Webhook] appointment #${appointmentId} đã bị CANCELLED, bỏ qua webhook`,
        );
        return {
          success: false,
          message: `Lịch hẹn #${appointmentId} đã bị hủy, không thể xác nhận thanh toán`,
        };
      }

      const expectedAmount = Number(appointment.slot.price || 0);
      if (Math.round(amount) !== Math.round(expectedAmount)) {
        return {
          success: false,
          message: `Số tiền chuyển khoản không khớp: ${amount} ≠ ${expectedAmount}`,
        };
      }

      return this.confirmAppointmentPayment(tx, appointment, {
        amount,
        externalTransactionId: String(body.id || Date.now()),
        paymentMethod: 'BANK_TRANSFER',
        description: `Chuyen khoan SePay - lich hen #${appointmentId}`,
        rawResponse: body,
      });
    });
  }

  // ==========================
  // Kiểm tra trạng thái thanh toán (dùng cho polling)
  // ==========================
  async getPaymentStatus(appointmentId: number, userId: number) {
    let appointment = await this.prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: { patient: true },
    });

    if (!appointment) throw new NotFoundException('Không tìm thấy lịch hẹn');

    if (appointment.patient.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem lịch hẹn này');
    }

    if (appointment.status === AppointmentStatus.PENDING_PAYMENT) {
      try {
        const reconciled = await this.reconcilePendingSepayPayment(
          appointmentId,
          userId,
        );
        if (reconciled) {
          appointment = await this.prisma.appointment.findUnique({
            where: { appointment_id: appointmentId },
            include: { patient: true },
          });
        }
      } catch (error) {
        this.logger.warn(
          `[SePay Reconcile] failed for appointment #${appointmentId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (!appointment) throw new NotFoundException('Không tìm thấy lịch hẹn');

    const paidStatuses = new Set([
      'CONFIRMED',
      'IN_PROGRESS',
      'COMPLETED',
      'REFUNDED',
    ]);

    return {
      appointment_id: appointmentId,
      status: appointment.status,
      paid: paidStatuses.has(appointment.status),
      meeting_link: appointment.meeting_link,
    };
  }

  async cancelAppointment(userId: number, appointmentId: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { user_id: userId },
    });
    if (!patient) throw new NotFoundException('Không tìm thấy hồ sơ bệnh nhân');

    return await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { appointment_id: appointmentId },
        include: { slot: true },
      });

      if (!appointment) throw new NotFoundException('Không tìm thấy lịch hẹn');

      if (appointment.patient_id !== patient.patient_id) {
        throw new ForbiddenException('Bạn không có quyền hủy lịch hẹn này');
      }

      const cancelableStatuses: string[] = ['PENDING_PAYMENT', 'CONFIRMED'];
      if (!cancelableStatuses.includes(appointment.status)) {
        throw new BadRequestException(
          `Không thể hủy lịch hẹn ở trạng thái ${appointment.status}`,
        );
      }

      // Không cho hủy nếu còn dưới 2 tiếng trước giờ khám
      if (appointment.status === 'CONFIRMED') {
        const slotDate = new Date(appointment.slot.date_slot);
        const startTime = new Date(appointment.slot.start_time);
        const slotStartUTC = new Date(
          Date.UTC(
            slotDate.getUTCFullYear(),
            slotDate.getUTCMonth(),
            slotDate.getUTCDate(),
            startTime.getUTCHours(),
            startTime.getUTCMinutes(),
          ),
        );
        const twoHoursBefore = new Date(slotStartUTC.getTime() - 2 * 60 * 60 * 1000);
        if (new Date() > twoHoursBefore) {
          throw new BadRequestException(
            'Không thể hủy lịch hẹn trong vòng 2 tiếng trước giờ khám',
          );
        }
      }

      await tx.appointment.update({
        where: { appointment_id: appointmentId },
        data: { status: 'CANCELLED' },
      });

      await tx.doctorCalendarSlots.update({
        where: { slot_id: appointment.slot_id },
        data: {
          status: 'AVAILABLE',
          is_locked: false,
          locked_by_user_id: null,
          locked_expires_at: null,
        },
      });

      return {
        message: 'Hủy lịch hẹn thành công',
        appointment_id: appointmentId,
        note: appointment.status === 'CONFIRMED'
          ? 'Yêu cầu hoàn tiền sẽ được xử lý trong 3-5 ngày làm việc'
          : undefined,
      };
    });
  }

}