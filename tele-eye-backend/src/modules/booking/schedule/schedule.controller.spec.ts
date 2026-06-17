import { Test } from '@nestjs/testing';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

describe('ScheduleController', () => {
  let controller: ScheduleController;
  let scheduleService: {
    createSystemSlot: jest.Mock;
    getSystemSlots: jest.Mock;
    registerAvailability: jest.Mock;
    getMyAvailability: jest.Mock;
    deleteAvailability: jest.Mock;
    getAvailableSlots: jest.Mock;
    lockCalendarSlot: jest.Mock;
    generateSlots: jest.Mock;
  };

  const mockReq = (userId: number, role = 'DOCTOR') => ({
    user: { userId, role },
  });

  beforeEach(async () => {
    scheduleService = {
      createSystemSlot: jest.fn(),
      getSystemSlots: jest.fn(),
      registerAvailability: jest.fn(),
      getMyAvailability: jest.fn(),
      deleteAvailability: jest.fn(),
      getAvailableSlots: jest.fn(),
      lockCalendarSlot: jest.fn(),
      generateSlots: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ScheduleController],
      providers: [{ provide: ScheduleService, useValue: scheduleService }],
    }).compile();

    controller = moduleRef.get(ScheduleController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createSystemSlot', () => {
    it('delegates dto to scheduleService.createSystemSlot', async () => {
      const dto = { slot_name: 'Sáng', start_time: '08:00', end_time: '09:00' };
      const created = { slot_template_id: 1, ...dto };
      scheduleService.createSystemSlot.mockResolvedValue(created);

      await expect(controller.createSystemSlot(dto as any)).resolves.toEqual(created);
      expect(scheduleService.createSystemSlot).toHaveBeenCalledWith(dto);
    });
  });

  describe('getSystemSlots', () => {
    it('returns all system slots from scheduleService', async () => {
      const slots = [{ slot_template_id: 1 }];
      scheduleService.getSystemSlots.mockResolvedValue(slots);

      await expect(controller.getSystemSlots()).resolves.toEqual(slots);
    });
  });

  describe('registerAvailability', () => {
    it('passes doctor userId and dto to scheduleService', async () => {
      const dto = { system_slot_ids: [1], days_of_week: [1, 3] };
      scheduleService.registerAvailability.mockResolvedValue({ message: 'ok' });

      await expect(
        controller.registerAvailability(mockReq(10) as any, dto as any),
      ).resolves.toEqual({ message: 'ok' });

      expect(scheduleService.registerAvailability).toHaveBeenCalledWith(10, dto);
    });
  });

  describe('getMyAvailability', () => {
    it('passes doctor userId to scheduleService', async () => {
      const list = [{ availability_id: 1 }];
      scheduleService.getMyAvailability.mockResolvedValue(list);

      await expect(
        controller.getMyAvailability(mockReq(10) as any),
      ).resolves.toEqual(list);

      expect(scheduleService.getMyAvailability).toHaveBeenCalledWith(10);
    });
  });

  describe('deleteAvailability', () => {
    it('delegates doctor userId and availability id', async () => {
      scheduleService.deleteAvailability.mockResolvedValue({ deleted: true });

      await expect(
        controller.deleteAvailability(mockReq(10) as any, 5),
      ).resolves.toEqual({ deleted: true });

      expect(scheduleService.deleteAvailability).toHaveBeenCalledWith(10, 5);
    });
  });

  describe('getAvailableSlots', () => {
    it('delegates query to scheduleService.getAvailableSlots', async () => {
      const query = { date: '2026-05-24' };
      const slots = [{ slot_id: 1 }];
      scheduleService.getAvailableSlots.mockResolvedValue(slots);

      await expect(controller.getAvailableSlots(query as any)).resolves.toEqual(slots);
      expect(scheduleService.getAvailableSlots).toHaveBeenCalledWith(query);
    });
  });

  describe('lockSlot', () => {
    it('delegates slot id and patient userId to scheduleService', async () => {
      scheduleService.lockCalendarSlot.mockResolvedValue({ locked: true });

      await expect(
        controller.lockSlot(7, mockReq(3, 'PATIENT') as any),
      ).resolves.toEqual({ locked: true });

      expect(scheduleService.lockCalendarSlot).toHaveBeenCalledWith(7, 3);
    });
  });

  describe('generateSlots', () => {
    it('calls generateSlots with startDate today and endDate 14 days later', async () => {
      const now = new Date('2026-05-24T00:00:00.000Z');
      jest.useFakeTimers({ now: now.getTime() });
      scheduleService.generateSlots.mockResolvedValue({ generated: 14 });

      await controller.generateSlots();

      const [calledStart, calledEnd] = scheduleService.generateSlots.mock.calls[0];
      expect(calledStart).toBeInstanceOf(Date);
      expect(calledEnd).toBeInstanceOf(Date);
      const diffDays =
        (calledEnd.getTime() - calledStart.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(14);
      jest.useRealTimers();
    });
  });
});
