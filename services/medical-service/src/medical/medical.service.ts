import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { CreateTestResultDto } from './dto/create-test-result.dto';

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
}