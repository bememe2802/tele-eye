import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../database/prisma.service';
import {
  createPrismaMock,
  wirePrismaTransaction,
} from '../../../test-utils/prisma.mock';
import { DoctorsService } from './doctors.service';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

describe('DoctorsService', () => {
  let service: DoctorsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    wirePrismaTransaction(prisma);

    const moduleRef = await Test.createTestingModule({
      providers: [
        DoctorsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = moduleRef.get(DoctorsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createDoctor', () => {
    it('throws when the email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ user_id: 1 });

      await expect(
        service.createDoctor({ email: 'doctor@tele-eye.vn' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when specialization ids are invalid', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.specialization.count.mockResolvedValue(1);

      await expect(
        service.createDoctor({
          email: 'doctor@tele-eye.vn',
          specializationIds: [1, 2],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a doctor and specialization links', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.specialization.count.mockResolvedValue(2);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
      prisma.user.create.mockResolvedValue({ user_id: 5 });
      prisma.doctor.create.mockResolvedValue({ doctor_id: 9 });
      prisma.doctorSpecialization.createMany.mockResolvedValue({ count: 2 });

      await expect(
        service.createDoctor({
          email: 'doctor@tele-eye.vn',
          password: '12345678',
          full_name: 'Doctor A',
          title: 'BS',
          license_number: 'LIC-1',
          consultation_fee: 200000,
          specializationIds: [3, 4],
        } as any),
      ).resolves.toMatchObject({
        doctorId: 9,
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'doctor@tele-eye.vn',
          password_hash: 'hash',
          role: UserRole.DOCTOR,
          is_email_verified: true,
        },
      });
      expect(prisma.doctorSpecialization.createMany).toHaveBeenCalledWith({
        data: [
          { doctor_id: 9, spec_id: 3 },
          { doctor_id: 9, spec_id: 4 },
        ],
      });
    });

    it('creates a doctor without specialization links when none are provided', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
      prisma.user.create.mockResolvedValue({ user_id: 5 });
      prisma.doctor.create.mockResolvedValue({ doctor_id: 9 });

      await service.createDoctor({
        email: 'doctor@tele-eye.vn',
        password: '12345678',
        full_name: 'Doctor A',
      } as any);

      expect(prisma.doctorSpecialization.createMany).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns mapped doctors without filters', async () => {
      prisma.doctor.findMany.mockResolvedValue([
        {
          doctor_id: 1,
          full_name: 'Doctor A',
          title: 'BS',
          avatar_url: 'avatar.png',
          consultation_fee: 100000,
          specializations: [{ spec: { name: 'Mat' } }],
        },
      ]);

      await expect(service.findAll()).resolves.toEqual([
        {
          doctor_id: 1,
          full_name: 'Doctor A',
          title: 'BS',
          avatar_url: 'avatar.png',
          consultation_fee: 100000,
          specializations: ['Mat'],
        },
      ]);
      expect(prisma.doctor.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          specializations: {
            include: { spec: true },
          },
        },
      });
    });

    it('applies keyword and specialization filters', async () => {
      prisma.doctor.findMany.mockResolvedValue([]);

      await service.findAll('nguyen', 8);

      expect(prisma.doctor.findMany).toHaveBeenCalledWith({
        where: {
          full_name: { contains: 'nguyen', mode: 'insensitive' },
          specializations: {
            some: { spec_id: 8 },
          },
        },
        include: {
          specializations: {
            include: { spec: true },
          },
        },
      });
    });
  });

  describe('selfUpdate', () => {
    it('throws when the doctor profile does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.selfUpdate(8, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates the doctor profile', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 1 });
      prisma.doctor.update.mockResolvedValue({ doctor_id: 1, title: 'TS' });

      await expect(service.selfUpdate(8, { title: 'TS' } as any)).resolves.toEqual(
        { doctor_id: 1, title: 'TS' },
      );
      expect(prisma.doctor.update).toHaveBeenCalledWith({
        where: { user_id: 8 },
        data: { title: 'TS' },
      });
    });
  });

  describe('adminUpdate', () => {
    it('throws when the doctor does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.adminUpdate(1, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when specialization ids are invalid', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 1 });
      prisma.specialization.findMany.mockResolvedValue([{ spec_id: 1 }]);

      await expect(
        service.adminUpdate(1, { specializationIds: [1, 2] } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates doctor info and synchronizes specializations', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 1 });
      prisma.specialization.findMany.mockResolvedValue([
        { spec_id: 1 },
        { spec_id: 2 },
      ]);
      prisma.doctor.update.mockResolvedValue({ doctor_id: 1, title: 'TS' });
      prisma.doctorSpecialization.deleteMany.mockResolvedValue({ count: 2 });
      prisma.doctorSpecialization.createMany.mockResolvedValue({ count: 2 });

      await expect(
        service.adminUpdate(
          1,
          {
            title: 'TS',
            specializationIds: [1, 2],
          } as any,
        ),
      ).resolves.toEqual({ doctor_id: 1, title: 'TS' });
      expect(prisma.doctor.update).toHaveBeenCalledWith({
        where: { doctor_id: 1 },
        data: { title: 'TS' },
      });
      expect(prisma.doctorSpecialization.deleteMany).toHaveBeenCalledWith({
        where: { doctor_id: 1 },
      });
      expect(prisma.doctorSpecialization.createMany).toHaveBeenCalledWith({
        data: [
          { doctor_id: 1, spec_id: 1 },
          { doctor_id: 1, spec_id: 2 },
        ],
      });
    });

    it('updates doctor info without syncing specializations when not provided', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 1 });
      prisma.doctor.update.mockResolvedValue({ doctor_id: 1, title: 'TS' });

      await service.adminUpdate(1, { title: 'TS' } as any);

      expect(prisma.doctorSpecialization.deleteMany).not.toHaveBeenCalled();
      expect(prisma.doctorSpecialization.createMany).not.toHaveBeenCalled();
    });
  });
});
