import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { createPrismaMock } from '../../../test-utils/prisma.mock';
import { PatientsService } from './patients.service';

describe('PatientsService', () => {
  let service: PatientsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        PatientsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = moduleRef.get(PatientsService);
  });

  describe('getMyProfile', () => {
    it('returns the patient profile when found', async () => {
      const patient = {
        patient_id: 3,
        full_name: 'Patient A',
        user: { email: 'patient@tele-eye.vn', is_active: true },
      };
      prisma.patient.findUnique.mockResolvedValue(patient);

      await expect(service.getMyProfile(8)).resolves.toEqual(patient);
      expect(prisma.patient.findUnique).toHaveBeenCalledWith({
        where: { user_id: 8 },
        include: {
          user: {
            select: { email: true, is_active: true },
          },
        },
      });
    });

    it('throws when the patient profile does not exist', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(service.getMyProfile(8)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMyProfile', () => {
    it('upserts patient data and converts date_of_birth', async () => {
      const dto = {
        full_name: 'Patient A',
        phone_number: '0123456789',
        gender: 'MALE' as any,
        address: 'Ha Noi',
        avatar_url: 'avatar.png',
        date_of_birth: '2000-01-02',
      };
      const updated = { patient_id: 10 };
      prisma.patient.upsert.mockResolvedValue(updated);

      await expect(service.updateMyProfile(5, dto)).resolves.toEqual(updated);
      expect(prisma.patient.upsert).toHaveBeenCalledWith({
        where: { user_id: 5 },
        update: {
          full_name: dto.full_name,
          phone_number: dto.phone_number,
          gender: dto.gender,
          address: dto.address,
          avatar_url: dto.avatar_url,
          date_of_birth: new Date(dto.date_of_birth),
        },
        create: {
          user_id: 5,
          full_name: dto.full_name,
          phone_number: dto.phone_number,
          gender: dto.gender,
        },
      });
    });

    it('maps unique phone conflicts to ConflictException', async () => {
      const duplicateError = new Error('duplicate');
      Object.setPrototypeOf(
        duplicateError,
        Prisma.PrismaClientKnownRequestError.prototype,
      );
      (duplicateError as any).code = 'P2002';
      prisma.patient.upsert.mockRejectedValue(duplicateError);

      await expect(service.updateMyProfile(5, {} as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows unknown errors', async () => {
      const error = new Error('unexpected');
      prisma.patient.upsert.mockRejectedValue(error);

      await expect(service.updateMyProfile(5, {} as any)).rejects.toThrow(
        error,
      );
    });
  });
});
