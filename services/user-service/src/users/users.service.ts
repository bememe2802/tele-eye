import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async getProfile(userId: number) {
        const profile = await this.prisma.userProfile.findUnique({
            where: { user_id: userId },
        });

        if (!profile) {
            throw new NotFoundException('User profile not found');
        }

        return profile;
    }

    async updateProfile(userId: number, dto: UpdateProfileDto) {
        const profile = await this.prisma.userProfile.upsert({
            where: { user_id: userId },
            update: dto,
            create: {
                user_id: userId,
                ...dto,
            },
        });

        return profile;
    }

    async getDoctorProfile(doctorId: number) {
        const profile = await this.prisma.doctorProfile.findUnique({
            where: { doctor_id: doctorId },
        });

        if (!profile) {
            throw new NotFoundException('Doctor profile not found');
        }

        return profile;
    }

    async listDoctors() {
        return this.prisma.doctorProfile.findMany({
            where: { is_available: true },
        });
    }

    async getPatientProfile(patientId: number) {
        const profile = await this.prisma.patientProfile.findUnique({
            where: { patient_id: patientId },
        });

        if (!profile) {
            throw new NotFoundException('Patient profile not found');
        }

        return profile;
    }
}