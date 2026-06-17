import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/database/prisma.service';
import { createPrismaMock } from 'src/test-utils/prisma.mock';
import { RecordsService } from './records.service';

describe('RecordsService', () => {
  let service: RecordsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecordsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(RecordsService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('findAll', () => {
    it('throws when patient profile not found', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);
      await expect(service.findAll(1, 'PATIENT')).rejects.toThrow(NotFoundException);
    });

    it('returns records for patient', async () => {
      prisma.patient.findUnique.mockResolvedValue({ patient_id: 1 });
      prisma.eyeMedicalRecord.findMany.mockResolvedValue([{ record_id: 1 }]);
      prisma.eyeMedicalRecord.count.mockResolvedValue(1);
      const result = await service.findAll(1, 'PATIENT');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when record not found', async () => {
      prisma.eyeMedicalRecord.findUnique.mockResolvedValue(null);
      await expect(service.findById(1, 'ADMIN', 99)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when patient views another patient record', async () => {
      prisma.eyeMedicalRecord.findUnique.mockResolvedValue({
        record_id: 1,
        appointment: { patient: { user_id: 999 }, doctor: { user_id: 5 } },
      });
      await expect(service.findById(1, 'PATIENT', 1)).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to view any record', async () => {
      prisma.eyeMedicalRecord.findUnique.mockResolvedValue({
        record_id: 1,
        appointment: { patient: { user_id: 2 }, doctor: { user_id: 5 } },
      });
      await expect(service.findById(1, 'ADMIN', 1)).resolves.toMatchObject({ record_id: 1 });
    });
  });
});
