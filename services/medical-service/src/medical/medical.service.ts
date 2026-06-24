import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { CreateTestResultDto } from './dto/create-test-result.dto';
import { CreateDrugDto, UpdateDrugDto } from './dto/drug.dto';

@Injectable()
export class MedicalService {
    constructor(private readonly prisma: PrismaService) { }

    async createRecord(dto: CreateMedicalRecordDto) {
        return this.prisma.medicalRecord.create({ data: dto });
    }

    async getRecord(id: number) {
        const record = await this.prisma.medicalRecord.findUnique({
            where: { record_id: id },
            include: { prescriptions: true },
        });

        if (!record) {
            throw new NotFoundException('Medical record not found');
        }

        return record;
    }

    async getPatientRecords(patientId: number) {
        return this.prisma.medicalRecord.findMany({
            where: { patient_id: patientId },
            include: { prescriptions: true },
            orderBy: { created_at: 'desc' },
        });
    }

    async createTestResult(dto: CreateTestResultDto) {
        return this.prisma.testResult.create({ data: dto });
    }

    async getTestResult(id: number) {
        const result = await this.prisma.testResult.findUnique({
            where: { test_id: id },
        });

        if (!result) {
            throw new NotFoundException('Test result not found');
        }

        return result;
    }

    async getPatientTestResults(patientId: number) {
        return this.prisma.testResult.findMany({
            where: { patient_id: patientId },
            orderBy: { test_date: 'desc' },
        });
    }

    async createDrug(dto: CreateDrugDto) {
        const existing = await this.prisma.drug.findUnique({
            where: { name: dto.name },
        });

        if (existing) {
            throw new ConflictException('Drug name already exists');
        }

        return this.prisma.drug.create({ data: dto });
    }

    async listDrugs(search?: string) {
        return this.prisma.drug.findMany({
            where: {
                is_active: true,
                ...(search
                    ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { active_ingredient: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            orderBy: { name: 'asc' },
        });
    }

    async updateDrug(id: number, dto: UpdateDrugDto) {
        const existing = await this.prisma.drug.findUnique({
            where: { drug_id: id },
        });

        if (!existing) {
            throw new NotFoundException('Drug not found');
        }

        return this.prisma.drug.update({
            where: { drug_id: id },
            data: dto,
        });
    }

    async deleteDrug(id: number) {
        const existing = await this.prisma.drug.findUnique({
            where: { drug_id: id },
        });

        if (!existing) {
            throw new NotFoundException('Drug not found');
        }

        return this.prisma.drug.update({
            where: { drug_id: id },
            data: { is_active: false },
        });
    }

    async getAdminStats() {
        const totalDrugs = await this.prisma.drug.count({
            where: { is_active: true },
        });

        return {
            total_doctors: 0,
            total_drugs: totalDrugs,
            today_appointments: 0,
            total_revenue: 0,
        };
    }
}
