import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
    constructor(private readonly prisma: PrismaService) { }

    async createPayment(dto: CreatePaymentDto) {
        return this.prisma.payment.create({ data: dto });
    }

    async getPayment(id: number) {
        const payment = await this.prisma.payment.findUnique({
            where: { payment_id: id },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        return payment;
    }

    async getPatientPayments(patientId: number) {
        return this.prisma.payment.findMany({
            where: { patient_id: patientId },
            orderBy: { created_at: 'desc' },
        });
    }

    async updatePaymentStatus(id: number, status: string, transactionId?: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { payment_id: id },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        const updateData: any = { status };

        if (transactionId) {
            updateData.transaction_id = transactionId;
        }

        if (status === 'COMPLETED') {
            updateData.paid_at = new Date();
        }

        return this.prisma.payment.update({
            where: { payment_id: id },
            data: updateData,
        });
    }
}