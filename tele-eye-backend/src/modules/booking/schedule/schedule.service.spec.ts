import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../database/prisma.service';
import {
  createPrismaMock,
  wirePrismaTransaction,
} from '../../../test-utils/prisma.mock';
import { ScheduleService } from './schedule.service';

// Mock dayjs module to control time in tests
let mockTzReturnValue: any = undefined;
jest.mock('dayjs', () => {
  const actual = jest.requireActual('dayjs');
  const utc = jest.requireActual('dayjs/plugin/utc');
  const timezone = jest.requireActual('dayjs/plugin/timezone');
  actual.extend(utc.default || utc);
  actual.extend(timezone.default || timezone);
  const mockFn = jest.fn((...args: any[]) => {
    const instance = actual(...args);
    // Only mock .tz() when dayjs() is called with no arguments (current time)
    if (args.length === 0 && mockTzReturnValue !== undefined) {
      instance.tz = jest.fn().mockReturnValue(mockTzReturnValue);
    }
    return instance;
  });
  Object.assign(mockFn, actual);
  mockFn.extend = actual.extend;
  return mockFn;
});

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

describe('ScheduleService', () => {
  let service: ScheduleService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    wirePrismaTransaction(prisma);

    const moduleRef = await Test.createTestingModule({
      providers: [
        ScheduleService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = moduleRef.get(ScheduleService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    mockTzReturnValue = undefined;
  });

  describe('createSystemSlot', () => {
    it('throws when start_time is not earlier than end_time', async () => {
      await expect(
        service.createSystemSlot({
          slot_name: 'Morning',
          start_time: '10:00',
          end_time: '09:00',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a system slot when the time range is valid', async () => {
      const created = { slot_template_id: 1 };
      prisma.systemTimeSlot.create.mockResolvedValue(created);

      await expect(
        service.createSystemSlot({
          slot_name: 'Morning',
          start_time: '08:00',
          end_time: '09:00',
        } as any),
      ).resolves.toBe(created);
      expect(prisma.systemTimeSlot.create).toHaveBeenCalledWith({
        data: {
          shift_name: 'Morning',
          start_time: '08:00',
          end_time: '09:00',
        },
      });
    });
  });

  describe('registerAvailability', () => {
    it('throws when the user is not a doctor', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.registerAvailability(3, {
          system_slot_ids: [1],
          days_of_week: [1],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when any system slot id is invalid', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 5 });
      prisma.systemTimeSlot.findMany.mockResolvedValue([{ slot_template_id: 1 }]);

      await expect(
        service.registerAvailability(3, {
          system_slot_ids: [1, 2],
          days_of_week: [1],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('replaces availability data for the requested days', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 5 });
      prisma.systemTimeSlot.findMany.mockResolvedValue([
        { slot_template_id: 1 },
        { slot_template_id: 2 },
      ]);
      prisma.doctorAvailability.deleteMany.mockResolvedValue({ count: 2 });
      prisma.doctorAvailability.createMany.mockResolvedValue({ count: 4 });

      await expect(
        service.registerAvailability(3, {
          system_slot_ids: [1, 2],
          days_of_week: [1, 5],
        } as any),
      ).resolves.toMatchObject({
        message: expect.any(String),
      });
      expect(prisma.doctorAvailability.deleteMany).toHaveBeenCalledWith({
        where: {
          doctor_id: 5,
          day_of_week: { in: [1, 5] },
        },
      });
      expect(prisma.doctorAvailability.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            doctor_id: 5,
            slot_template_id: 1,
            day_of_week: 1,
            valid_from: expect.any(Date),
          }),
          expect.objectContaining({
            doctor_id: 5,
            slot_template_id: 2,
            day_of_week: 5,
            valid_from: expect.any(Date),
          }),
        ]),
      });
    });

    it('skips createMany when there are no slots to register', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 5 });
      prisma.systemTimeSlot.findMany.mockResolvedValue([]);
      prisma.doctorAvailability.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.registerAvailability(3, {
          system_slot_ids: [],
          days_of_week: [],
        } as any),
      ).resolves.toMatchObject({
        message: expect.any(String),
      });
      expect(prisma.doctorAvailability.createMany).not.toHaveBeenCalled();
    });
  });

  describe('getSystemSlots', () => {
    it('deduplicates slots by shift name and fallback time key', async () => {
      prisma.systemTimeSlot.findMany.mockResolvedValue([
        {
          slot_template_id: 1,
          shift_name: 'Morning',
          start_time: '08:00',
          end_time: '09:00',
        },
        {
          slot_template_id: 2,
          shift_name: 'Morning',
          start_time: '08:30',
          end_time: '09:30',
        },
        {
          slot_template_id: 3,
          shift_name: null,
          start_time: '10:00',
          end_time: '11:00',
        },
        {
          slot_template_id: 4,
          shift_name: null,
          start_time: '10:00',
          end_time: '11:00',
        },
      ]);

      await expect(service.getSystemSlots()).resolves.toEqual([
        {
          slot_template_id: 1,
          shift_name: 'Morning',
          start_time: '08:00',
          end_time: '09:00',
        },
        {
          slot_template_id: 3,
          shift_name: null,
          start_time: '10:00',
          end_time: '11:00',
        },
      ]);
    });
  });

  describe('getMyAvailability', () => {
    it('groups doctor availability by day of week', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 5 });
      prisma.doctorAvailability.findMany.mockResolvedValue([
        {
          availability_id: 1,
          day_of_week: 1,
          slot_template_id: 10,
          template: {
            shift_name: 'Morning',
            start_time: '08:00',
          },
        },
        {
          availability_id: 2,
          day_of_week: 1,
          slot_template_id: 11,
          template: {
            shift_name: 'Afternoon',
            start_time: '13:00',
          },
        },
        {
          availability_id: 3,
          day_of_week: 2,
          slot_template_id: 12,
          template: {
            shift_name: 'Morning',
            start_time: '08:00',
          },
        },
      ]);

      await expect(service.getMyAvailability(3)).resolves.toEqual([
        {
          day_of_week: 1,
          slots: [
            {
              availability_id: 1,
              slot_template_id: 10,
              shift_name: 'Morning',
              start_time: '08:00',
            },
            {
              availability_id: 2,
              slot_template_id: 11,
              shift_name: 'Afternoon',
              start_time: '13:00',
            },
          ],
        },
        {
          day_of_week: 2,
          slots: [
            {
              availability_id: 3,
              slot_template_id: 12,
              shift_name: 'Morning',
              start_time: '08:00',
            },
          ],
        },
      ]);
    });

    it('throws when the doctor profile is not found', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.getMyAvailability(3)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteAvailability', () => {
    it('throws when the availability does not exist', async () => {
      prisma.doctorAvailability.findUnique.mockResolvedValue(null);

      await expect(service.deleteAvailability(3, 9)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the availability belongs to another doctor', async () => {
      prisma.doctorAvailability.findUnique.mockResolvedValue({
        doctor: { user_id: 99 },
      });

      await expect(service.deleteAvailability(3, 9)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes the availability when the doctor owns it', async () => {
      prisma.doctorAvailability.findUnique.mockResolvedValue({
        doctor: { user_id: 3 },
      });
      prisma.doctorAvailability.delete.mockResolvedValue({ availability_id: 9 });

      await expect(service.deleteAvailability(3, 9)).resolves.toEqual({
        availability_id: 9,
      });
      expect(prisma.doctorAvailability.delete).toHaveBeenCalledWith({
        where: { availability_id: 9 },
      });
    });
  });

  describe('generateSlots', () => {
    it('creates calendar slots from active doctor availability', async () => {
      const startDate = new Date('2026-05-24T12:00:00.000Z');
      const endDate = new Date('2026-05-24T12:00:00.000Z');
      const day = (() => {
        const jsDay = startDate.getDay();
        return jsDay === 0 ? 7 : jsDay;
      })();
      prisma.doctorAvailability.findMany.mockResolvedValue([
        {
          doctor_id: 7,
          day_of_week: day,
          template: {
            start_time: '08:00',
            end_time: '09:00',
          },
          doctor: {
            consultation_fee: 150000,
          },
        },
      ]);
      prisma.doctorCalendarSlots.createMany.mockResolvedValue({ count: 1 });

      await expect(service.generateSlots(startDate, endDate)).resolves.toMatchObject({
        insertedCount: 1,
      });
      expect(prisma.doctorCalendarSlots.createMany).toHaveBeenCalledWith({
        data: [
          {
            doctor_id: 7,
            date_slot: new Date('2026-05-24T00:00:00.000Z'),
            start_time: '08:00',
            end_time: '09:00',
            price: 150000,
            status: 'AVAILABLE',
            is_locked: false,
            locked_expires_at: null,
          },
        ],
        skipDuplicates: true,
      });
    });
  });

  describe('getAvailableSlots', () => {
    it('returns an empty array for past dates', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-23T02:00:00.000Z'));

      await expect(
        service.getAvailableSlots({
          date: '2026-05-22',
        } as any),
      ).resolves.toEqual([]);
      expect(prisma.doctorCalendarSlots.findMany).not.toHaveBeenCalled();
    });

    it('builds default filters, excludes past times today and formats results', async () => {
      // Mock dayjs().tz() to return a fixed time (2026-05-23 09:00 VN = 2026-05-23T02:00:00.000Z)
      const actualDayjs = jest.requireActual('dayjs');
      actualDayjs.extend(utc);
      actualDayjs.extend(timezone);
      mockTzReturnValue = actualDayjs('2026-05-23T02:00:00.000Z').tz('Asia/Ho_Chi_Minh');

      prisma.doctorCalendarSlots.findMany.mockResolvedValue([
        {
          slot_id: 1,
          date_slot: new Date('2026-05-23T00:00:00.000Z'),
          start_time: new Date('2026-05-22T17:30:00.000Z'),
          end_time: new Date('2026-05-22T18:30:00.000Z'),
          price: 100000,
          is_locked: false,
          doctor: {
            doctor_id: 7,
            full_name: 'Doctor A',
            title: 'BS',
            avatar_url: 'avatar.png',
            specializations: [{ spec: { name: 'Mat' } }],
          },
        },
        {
          slot_id: 2,
          date_slot: new Date('2026-05-23T00:00:00.000Z'),
          start_time: new Date('2026-05-23T03:00:00.000Z'),
          end_time: new Date('2026-05-23T04:00:00.000Z'),
          price: 120000,
          is_locked: true,
          locked_expires_at: new Date('2026-05-23T01:00:00.000Z'),
          doctor: {
            doctor_id: 8,
            full_name: 'Doctor B',
            title: 'TS',
            avatar_url: 'avatar-2.png',
            specializations: [{ spec: { name: 'Glaucoma' } }],
          },
        },
        {
          slot_id: 3,
          date_slot: new Date('2026-05-24T00:00:00.000Z'),
          start_time: new Date('2026-05-24T00:00:00.000Z'),
          end_time: new Date('2026-05-24T01:00:00.000Z'),
          price: 150000,
          is_locked: false,
          doctor: {
            doctor_id: 9,
            full_name: 'Doctor C',
            title: 'PGS',
            avatar_url: 'avatar-3.png',
            specializations: [{ spec: { name: 'Tre em' } }],
          },
        },
      ]);

      await expect(
        service.getAvailableSlots({
          doctorId: 8,
          specialtyId: 5,
        } as any),
      ).resolves.toEqual([
        {
          slot_id: 2,
          date_slot: new Date('2026-05-23T00:00:00.000Z'),
          start_time: '10:00',
          end_time: '11:00',
          price: 120000,
          is_locked: true,
          doctor: {
            doctor_id: 8,
            full_name: 'Doctor B',
            title: 'TS',
            avatar_url: 'avatar-2.png',
            specialties: ['Glaucoma'],
          },
        },
        {
          slot_id: 3,
          date_slot: new Date('2026-05-24T00:00:00.000Z'),
          start_time: '07:00',
          end_time: '08:00',
          price: 150000,
          is_locked: false,
          doctor: {
            doctor_id: 9,
            full_name: 'Doctor C',
            title: 'PGS',
            avatar_url: 'avatar-3.png',
            specialties: ['Tre em'],
          },
        },
      ]);
      expect(prisma.doctorCalendarSlots.findMany).toHaveBeenCalledWith({
        where: {
          status: 'AVAILABLE',
          OR: [
            { is_locked: false },
            {
              AND: [
                { is_locked: true },
                { locked_expires_at: { lt: new Date('2026-05-23T02:00:00.000Z') } },
              ],
            },
          ],
          date_slot: {
            gte: new Date('2026-05-23T00:00:00.000Z'),
          },
          doctor_id: 8,
          doctor: {
            specializations: { some: { spec_id: 5 } },
          },
        },
        include: {
          doctor: {
            include: {
              specializations: { include: { spec: true } },
            },
          },
        },
        orderBy: [{ date_slot: 'asc' }, { start_time: 'asc' }],
        take: 100,
      });
    });

    it('uses the selected date when provided', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-23T02:00:00.000Z'));
      prisma.doctorCalendarSlots.findMany.mockResolvedValue([]);

      await service.getAvailableSlots({
        date: '2026-05-24',
        doctorId: 2,
      } as any);

      expect(prisma.doctorCalendarSlots.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date_slot: new Date('2026-05-24T00:00:00.000Z'),
            doctor_id: 2,
          }),
        }),
      );
    });
  });

  describe('lockCalendarSlot', () => {
    it('throws when the slot does not exist', async () => {
      prisma.doctorCalendarSlots.findUnique.mockResolvedValue(null);

      await expect(service.lockCalendarSlot(5, 3)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the slot start time is already in the past', async () => {
      // Mock dayjs().tz() to return a fixed time (2026-05-23 09:00 VN)
      const actualDayjs = jest.requireActual('dayjs');
      actualDayjs.extend(utc);
      actualDayjs.extend(timezone);
      mockTzReturnValue = actualDayjs('2026-05-23T02:00:00.000Z').tz('Asia/Ho_Chi_Minh');

      prisma.doctorCalendarSlots.findUnique.mockResolvedValue({
        slot_id: 5,
        status: 'AVAILABLE',
        is_locked: false,
        locked_expires_at: null,
        start_time: new Date('1970-01-01T00:30:00.000Z'),
        date_slot: new Date('2026-05-23T00:00:00.000Z'),
      });
      prisma.doctorCalendarSlots.update.mockResolvedValue({
        slot_id: 5,
        locked_expires_at: new Date('2026-05-23T02:15:00.000Z'),
      });

      await expect(service.lockCalendarSlot(5, 3)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when the slot is already locked by someone else', async () => {
      // Mock dayjs().tz() to return a fixed time (2026-05-23 09:00 VN)
      const actualDayjs = jest.requireActual('dayjs');
      actualDayjs.extend(utc);
      actualDayjs.extend(timezone);
      mockTzReturnValue = actualDayjs('2026-05-23T02:00:00.000Z').tz('Asia/Ho_Chi_Minh');

      prisma.doctorCalendarSlots.findUnique.mockResolvedValue({
        slot_id: 5,
        status: 'AVAILABLE',
        is_locked: true,
        locked_expires_at: new Date('2026-05-23T02:10:00.000Z'),
        start_time: new Date('1970-01-01T04:00:00.000Z'),
        date_slot: new Date('2026-05-23T00:00:00.000Z'),
      });

      await expect(service.lockCalendarSlot(5, 3)).rejects.toThrow(
        ConflictException,
      );
    });

    it('locks the slot when it is available or the old lock has expired', async () => {
      // Mock dayjs().tz() to return a fixed time (2026-05-23 09:00 VN)
      const actualDayjs = jest.requireActual('dayjs');
      actualDayjs.extend(utc);
      actualDayjs.extend(timezone);
      mockTzReturnValue = actualDayjs('2026-05-23T02:00:00.000Z').tz('Asia/Ho_Chi_Minh');

      prisma.doctorCalendarSlots.findUnique.mockResolvedValue({
        slot_id: 5,
        status: 'AVAILABLE',
        is_locked: true,
        locked_expires_at: new Date('2026-05-23T01:30:00.000Z'),
        start_time: new Date('1970-01-01T04:00:00.000Z'),
        date_slot: new Date('2026-05-23T00:00:00.000Z'),
      });
      prisma.doctorCalendarSlots.update.mockResolvedValue({
        slot_id: 5,
        locked_expires_at: new Date('2026-05-23T02:15:00.000Z'),
      });

      await expect(service.lockCalendarSlot(5, 3)).resolves.toMatchObject({
        slot_id: 5,
        expires_at: new Date('2026-05-23T02:15:00.000Z'),
      });
      expect(prisma.doctorCalendarSlots.update).toHaveBeenCalledWith({
        where: { slot_id: 5 },
        data: {
          is_locked: true,
          locked_expires_at: expect.any(Date),
          locked_by_user_id: 3,
        },
      });
    });
  });

  describe('unlockExpiredSlots', () => {
    it('clears lock metadata for expired slot holds', async () => {
      prisma.doctorCalendarSlots.updateMany.mockResolvedValue({ count: 4 });

      await expect(service.unlockExpiredSlots()).resolves.toBe(4);
      expect(prisma.doctorCalendarSlots.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'AVAILABLE',
          is_locked: true,
          locked_expires_at: { lt: expect.any(Date) },
        },
        data: {
          is_locked: false,
          locked_expires_at: null,
          locked_by_user_id: null,
        },
      });
    });
  });

  describe('cancelExpiredAppointments', () => {
    it('returns zero when there are no expired appointments', async () => {
      prisma.appointment.findMany.mockResolvedValue([]);

      await expect(service.cancelExpiredAppointments()).resolves.toBe(0);
    });

    it('cancels expired appointments and releases their slots', async () => {
      prisma.appointment.findMany.mockResolvedValue([
        { appointment_id: 1, slot_id: 11 },
        { appointment_id: 2, slot_id: 12 },
      ]);
      prisma.appointment.update.mockResolvedValue({});
      prisma.doctorCalendarSlots.update.mockResolvedValue({});

      await expect(service.cancelExpiredAppointments()).resolves.toBe(2);
      expect(prisma.appointment.update).toHaveBeenNthCalledWith(1, {
        where: { appointment_id: 1 },
        data: { status: 'CANCELLED' },
      });
      expect(prisma.appointment.update).toHaveBeenNthCalledWith(2, {
        where: { appointment_id: 2 },
        data: { status: 'CANCELLED' },
      });
      expect(prisma.doctorCalendarSlots.update).toHaveBeenNthCalledWith(1, {
        where: { slot_id: 11 },
        data: {
          status: 'AVAILABLE',
          is_locked: false,
          locked_by_user_id: null,
          locked_expires_at: null,
        },
      });
      expect(prisma.doctorCalendarSlots.update).toHaveBeenNthCalledWith(2, {
        where: { slot_id: 12 },
        data: {
          status: 'AVAILABLE',
          is_locked: false,
          locked_by_user_id: null,
          locked_expires_at: null,
        },
      });
    });
  });
});