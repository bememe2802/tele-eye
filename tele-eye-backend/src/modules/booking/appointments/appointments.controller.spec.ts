import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as sepayUtil from './sepay-webhook.util';
import { AppointmentController } from './appointments.controller';
import { AppointmentService } from './appointments.service';

describe('AppointmentController', () => {
  let controller: AppointmentController;
  let appointmentService: {
    createAppointment: jest.Mock;
    handleSepayWebhook: jest.Mock;
    getPaymentStatus: jest.Mock;
    getDoctorAppointmentsToday: jest.Mock;
    getPatientAppointments: jest.Mock;
    startAppointment: jest.Mock;
    completeAppointment: jest.Mock;
    getMedicalRecordDetail: jest.Mock;
  };
  let configService: { get: jest.Mock };

  const mockReq = (userId: number, role = 'PATIENT') => ({
    user: { userId, role },
  });

  beforeEach(async () => {
    appointmentService = {
      createAppointment: jest.fn(),
      handleSepayWebhook: jest.fn(),
      getPaymentStatus: jest.fn(),
      getDoctorAppointmentsToday: jest.fn(),
      getPatientAppointments: jest.fn(),
      startAppointment: jest.fn(),
      completeAppointment: jest.fn(),
      getMedicalRecordDetail: jest.fn(),
    };

    configService = { get: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [AppointmentController],
      providers: [
        { provide: AppointmentService, useValue: appointmentService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = moduleRef.get(AppointmentController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('extracts userId from request and delegates to appointmentService', async () => {
      const dto = { slot_id: 5 };
      const expected = { appointment_id: 1 };
      appointmentService.createAppointment.mockResolvedValue(expected);

      await expect(
        controller.create(mockReq(3) as any, dto as any, '127.0.0.1'),
      ).resolves.toEqual(expected);

      expect(appointmentService.createAppointment).toHaveBeenCalledWith(
        3,
        dto,
        '127.0.0.1',
      );
    });
  });

  describe('handleSepayWebhook', () => {
    it('validates authorization header and delegates webhook body', async () => {
      const validateSpy = jest
        .spyOn(sepayUtil, 'validateSepayAuthorization')
        .mockImplementation(() => undefined);

      const body = { transferAmount: 50000, content: 'TELE1' };
      appointmentService.handleSepayWebhook.mockResolvedValue({ ok: true });

      await expect(
        controller.handleSepayWebhook('Bearer token', body),
      ).resolves.toEqual({ ok: true });

      expect(validateSpy).toHaveBeenCalledWith(configService, 'Bearer token');
      expect(appointmentService.handleSepayWebhook).toHaveBeenCalledWith(body);
    });

    it('propagates errors thrown by validateSepayAuthorization', async () => {
      jest
        .spyOn(sepayUtil, 'validateSepayAuthorization')
        .mockImplementation(() => {
          throw new Error('Unauthorized');
        });

      await expect(
        controller.handleSepayWebhook(undefined, {}),
      ).rejects.toThrow('Unauthorized');

      expect(appointmentService.handleSepayWebhook).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentStatus', () => {
    it('delegates id and userId to appointmentService', async () => {
      appointmentService.getPaymentStatus.mockResolvedValue({ status: 'PAID' });

      await expect(
        controller.getPaymentStatus(7, mockReq(3) as any),
      ).resolves.toEqual({ status: 'PAID' });

      expect(appointmentService.getPaymentStatus).toHaveBeenCalledWith(7, 3);
    });
  });

  describe('getTodayAppointments', () => {
    it('passes doctor userId to appointmentService', async () => {
      const list = [{ appointment_id: 1 }];
      appointmentService.getDoctorAppointmentsToday.mockResolvedValue(list);

      await expect(
        controller.getTodayAppointments(mockReq(10, 'DOCTOR') as any),
      ).resolves.toEqual(list);

      expect(appointmentService.getDoctorAppointmentsToday).toHaveBeenCalledWith(10);
    });
  });

  describe('getMyAppointments', () => {
    it('passes patient userId to appointmentService', async () => {
      const list = [{ appointment_id: 2 }];
      appointmentService.getPatientAppointments.mockResolvedValue(list);

      await expect(
        controller.getMyAppointments(mockReq(5) as any),
      ).resolves.toEqual(list);

      expect(appointmentService.getPatientAppointments).toHaveBeenCalledWith(5, 1, 10);
    });
  });

  describe('startAppointment', () => {
    it('delegates doctor userId and appointment id', async () => {
      appointmentService.startAppointment.mockResolvedValue({ started: true });

      await expect(
        controller.startAppointment(mockReq(10, 'DOCTOR') as any, 3),
      ).resolves.toEqual({ started: true });

      expect(appointmentService.startAppointment).toHaveBeenCalledWith(10, 3);
    });
  });

  describe('completeAppointment', () => {
    it('delegates doctor userId, appointment id and dto', async () => {
      const dto = { diagnosis_od: 'Cận thị', drug_prescription: [] };
      appointmentService.completeAppointment.mockResolvedValue({ completed: true });

      await expect(
        controller.completeAppointment(mockReq(10, 'DOCTOR') as any, 3, dto as any),
      ).resolves.toEqual({ completed: true });

      expect(appointmentService.completeAppointment).toHaveBeenCalledWith(
        10,
        3,
        dto,
      );
    });
  });

  describe('getMedicalRecord', () => {
    it('delegates userId, role and appointment id to appointmentService', async () => {
      const record = { record_id: 1 };
      appointmentService.getMedicalRecordDetail.mockResolvedValue(record);

      await expect(
        controller.getMedicalRecord(mockReq(5, 'PATIENT') as any, 3),
      ).resolves.toEqual(record);

      expect(appointmentService.getMedicalRecordDetail).toHaveBeenCalledWith(
        5,
        'PATIENT',
        3,
      );
    });
  });
});
