import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  it('creates the service', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PaymentService, { provide: PrismaService, useValue: {} }],
    }).compile();

    expect(moduleRef.get(PaymentService)).toBeInstanceOf(PaymentService);
  });
});
