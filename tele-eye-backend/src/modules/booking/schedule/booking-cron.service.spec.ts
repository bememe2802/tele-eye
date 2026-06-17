import { Test } from '@nestjs/testing';
import { BookingCronService } from './booking-cron.service';
import { ScheduleService } from './schedule.service';

describe('BookingCronService', () => {
  let service: BookingCronService;
  let scheduleService: {
    cancelExpiredAppointments: jest.Mock;
    generateSlots: jest.Mock;
    unlockExpiredSlots: jest.Mock;
  };

  beforeEach(async () => {
    scheduleService = {
      cancelExpiredAppointments: jest.fn(),
      generateSlots: jest.fn(),
      unlockExpiredSlots: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingCronService,
        {
          provide: ScheduleService,
          useValue: scheduleService,
        },
      ],
    }).compile();

    service = moduleRef.get(BookingCronService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleDailySlotGeneration', () => {
    it('generates slots and logs the result', async () => {
      scheduleService.generateSlots.mockResolvedValue({ message: 'done' });
      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation(() => undefined);

      await service.handleDailySlotGeneration();

      expect(scheduleService.generateSlots).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Bắt đầu'));
      expect(logSpy).toHaveBeenCalledWith('Kết quả: done');
    });

    it('logs errors during slot generation', async () => {
      const error = new Error('cron failed');
      scheduleService.generateSlots.mockRejectedValue(error);
      const errorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);

      await service.handleDailySlotGeneration();

      expect(errorSpy).toHaveBeenCalledWith(
        'Lỗi khi chạy Cron sinh lịch:',
        error,
      );
    });
  });

  describe('handleUnlockExpiredSlots', () => {
    it('logs when expired slots were unlocked', async () => {
      scheduleService.unlockExpiredSlots.mockResolvedValue(2);
      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation(() => undefined);

      await service.handleUnlockExpiredSlots();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 slot'),
      );
    });

    it('does not log unlock count when nothing changed', async () => {
      scheduleService.unlockExpiredSlots.mockResolvedValue(0);
      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation(() => undefined);

      await service.handleUnlockExpiredSlots();

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('logs errors during unlock processing', async () => {
      const error = new Error('unlock failed');
      scheduleService.unlockExpiredSlots.mockRejectedValue(error);
      const errorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);

      await service.handleUnlockExpiredSlots();

      expect(errorSpy).toHaveBeenCalledWith(
        'Lỗi khi chạy Cron mở khóa:',
        error,
      );
    });
  });

  describe('handleCancelExpiredAppointments', () => {
    it('warns when expired appointments are cancelled', async () => {
      scheduleService.cancelExpiredAppointments.mockResolvedValue(3);
      const warnSpy = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation(() => undefined);

      await service.handleCancelExpiredAppointments();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('3'));
    });

    it('does not warn when nothing is cancelled', async () => {
      scheduleService.cancelExpiredAppointments.mockResolvedValue(0);
      const warnSpy = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation(() => undefined);

      await service.handleCancelExpiredAppointments();

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('logs errors during appointment cancellation', async () => {
      const error = new Error('cancel failed');
      scheduleService.cancelExpiredAppointments.mockRejectedValue(error);
      const errorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);

      await service.handleCancelExpiredAppointments();

      expect(errorSpy).toHaveBeenCalledWith(
        'Lỗi khi chạy Cron hủy lịch hẹn:',
        error,
      );
    });
  });
});
