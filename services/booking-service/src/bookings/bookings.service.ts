import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class BookingsService {
    constructor(private readonly prisma: PrismaService) { }

    async createAppointment(dto: CreateAppointmentDto) {
        const existing = await this.prisma.appointment.findFirst({
            where: {
                doctor_id: dto.doctor_id,
                schedule_date: dto.schedule_date,
                start_time: dto.start_time,
                status: { notIn: ['CANCELLED', 'COMPLETED'] },
            },
        });

        if (existing) {
            throw new BadRequestException('Time slot is already booked');
        }

        return this.prisma.appointment.create({
            data: dto,
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