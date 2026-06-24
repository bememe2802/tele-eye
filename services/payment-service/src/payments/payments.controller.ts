import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller()
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('payments')
    @UseGuards(AuthGuard('jwt'))
    async createPayment(@Body() dto: CreatePaymentDto) {
        return this.paymentsService.createPayment(dto);
    }

    @Get('payments/:id')
    @UseGuards(AuthGuard('jwt'))
    async getPayment(@Param('id') id: string) {
        return this.paymentsService.getPayment(Number(id));
    }

    @Get('patients/:patientId/payments')
    @UseGuards(AuthGuard('jwt'))
    async getPatientPayments(@Param('patientId') patientId: string) {
        return this.paymentsService.getPatientPayments(Number(patientId));
    }

    @Patch('payments/:id/status')
    @UseGuards(AuthGuard('jwt'))
    async updatePaymentStatus(
        @Param('id') id: string,
        @Body('status') status: string,
        @Body('transactionId') transactionId?: string,
    ) {
        return this.paymentsService.updatePaymentStatus(Number(id), status, transactionId);
    }
}