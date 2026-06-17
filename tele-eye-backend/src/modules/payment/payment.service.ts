import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) { }

  async getRevenueSummary() {
    const [totalRevenue, transactionCount, successCount, failedCount] =
      await Promise.all([
        this.prisma.transaction.aggregate({
          where: { status: 'SUCCESS', type: 'PAYMENT' },
          _sum: { amount: true },
        }),
        this.prisma.transaction.count(),
        this.prisma.transaction.count({ where: { status: 'SUCCESS' } }),
        this.prisma.transaction.count({ where: { status: 'FAILED' } }),
      ]);

    return {
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      transactionCount,
      successCount,
      failedCount,
      successRate: transactionCount > 0
        ? Math.round((successCount / transactionCount) * 100)
        : 0,
    };
  }

  async getTransactions(page = 1, limit = 20, status?: string) {
    const where = status ? { status: status as any } : {};
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { email: true } },
          appointment_payments: {
            select: { appointment_id: true },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
