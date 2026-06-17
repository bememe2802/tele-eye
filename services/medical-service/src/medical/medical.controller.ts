import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MedicalService } from './medical.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { CreateTestResultDto } from './dto/create-test-result.dto';

@Controller()
export class MedicalController {
    constructor(private readonly medicalService: MedicalService) { }

    @Post('records')
    @UseGuards(AuthGuard('jwt'))
    async createRecord(@Body() dto: CreateMedicalRecordDto) {
        return this.medicalService.createRecord(dto);
    }

    @Get('records/:id')
    @UseGuards(AuthGuard('jwt'))
    async getRecord(@Param('id') id: string) {
        return this.medicalService.getRecord(Number(id));
    }

    @Get('patients/:patientId/records')
    @UseGuards(AuthGuard('jwt'))
    async getPatientRecords(@Param('patientId') patientId: string) {
        return this.medicalService.getPatientRecords(Number(patientId));
    }

    @Post('test-results')
    @UseGuards(AuthGuard('jwt'))
    async createTestResult(@Body() dto: CreateTestResultDto) {
        return this.medicalService.createTestResult(dto);
    }

    @Get('test-results/:id')
    @UseGuards(AuthGuard('jwt'))
    async getTestResult(@Param('id') id: string) {
        return this.medicalService.getTestResult(Number(id));
    }

    @Get('patients/:patientId/test-results')
    @UseGuards(AuthGuard('jwt'))
    async getPatientTestResults(@Param('patientId') patientId: string) {
        return this.medicalService.getPatientTestResults(Number(patientId));
    }
}