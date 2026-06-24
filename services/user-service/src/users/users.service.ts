import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    private toDoctorResponse(doctor: {
        doctor_id: number;
        user_id: number;
        specialization: string | null;
        license_number: string | null;
        years_of_exp: number;
        consultation_fee: number;
        bio: string | null;
        is_available: boolean;
        created_at?: Date;
        updated_at?: Date;
    }, fullName?: string | null) {
        const specialization = doctor.specialization || undefined;

        return {
            doctor_id: doctor.doctor_id,
            user_id: doctor.user_id,
            full_name: fullName || `Bác sĩ #${doctor.doctor_id}`,
            title: specialization,
            license_number: doctor.license_number || undefined,
            bio: doctor.bio || undefined,
            experience_years: doctor.years_of_exp,
            consultation_fee: doctor.consultation_fee,
            is_verified: doctor.is_available,
            specializations: specialization ? [specialization] : [],
            created_at: doctor.created_at,
            updated_at: doctor.updated_at,
        };
    }

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

    async createDoctor(dto: CreateDoctorDto) {
        // 1. Register user via auth service
        const authUrl = this.configService.get<string>('AUTH_SERVICE_URL', 'http://auth-service:8081');
        let authResult: { user: { id: number } };

        try {
            const response = await firstValueFrom(
                this.httpService.post(`${authUrl}/register`, {
                    email: dto.email,
                    password: dto.password,
                    fullName: dto.full_name,
                    role: 'DOCTOR',
                }),
            );
            authResult = response.data;
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to create user account';
            throw new BadRequestException(msg);
        }

        const userId = authResult.user.id;

        // 2. Create user profile
        await this.prisma.userProfile.upsert({
            where: { user_id: userId },
            update: { full_name: dto.full_name },
            create: {
                user_id: userId,
                full_name: dto.full_name,
            },
        });

        // 3. Create doctor profile
        const doctor = await this.prisma.doctorProfile.create({
            data: {
                user_id: userId,
                specialization: dto.title || null,
                license_number: dto.license_number || null,
                consultation_fee: dto.consultation_fee,
                is_available: true,
            },
        });

        return this.toDoctorResponse(doctor, dto.full_name);
    }

    async getDoctorProfile(doctorId: number) {
        const profile = await this.prisma.doctorProfile.findUnique({
            where: { doctor_id: doctorId },
        });

        if (!profile) {
            throw new NotFoundException('Doctor profile not found');
        }

        const userProfile = await this.prisma.userProfile.findUnique({
            where: { user_id: profile.user_id },
        });

        return this.toDoctorResponse(profile, userProfile?.full_name);
    }

    async getDoctorProfileByUserId(userId: number) {
        const profile = await this.prisma.doctorProfile.findUnique({
            where: { user_id: userId },
        });

        if (!profile) {
            throw new NotFoundException('Doctor profile not found');
        }

        const userProfile = await this.prisma.userProfile.findUnique({
            where: { user_id: profile.user_id },
        });

        return this.toDoctorResponse(profile, userProfile?.full_name);
    }

    async listDoctors() {
        const doctors = await this.prisma.doctorProfile.findMany({
            where: { is_available: true },
            orderBy: { doctor_id: 'asc' },
        });

        const userProfiles = await this.prisma.userProfile.findMany({
            where: {
                user_id: {
                    in: doctors.map((doctor) => doctor.user_id),
                },
            },
        });
        const namesByUserId = new Map(
            userProfiles.map((profile) => [profile.user_id, profile.full_name]),
        );

        return doctors.map((doctor) =>
            this.toDoctorResponse(doctor, namesByUserId.get(doctor.user_id)),
        );
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
