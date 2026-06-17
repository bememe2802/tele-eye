import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppointmentStatus, FileType } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../database/prisma.service';
import { createPrismaMock, wirePrismaTransaction } from '../../../test-utils/prisma.mock';
import { MailService } from '../../mail/mail.service';
import { AppointmentService } from './appointments.service';

describe('AppointmentService', () => {
  let service: AppointmentService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let mailService: { sendMedicalRecordEmail: jest.Mock };
  let configValues: Record<string, string | undefined>;
  let configService: { get: jest.Mock };
  const originalFetch = global.fetch;

  const createAppointmentContext = (overrides: Record<string, unknown> = {}) => ({
    appointment_id: 1,
    slot_id: 11,
    status: AppointmentStatus.PENDING_PAYMENT,
    meeting_link: null,
    created_at: new Date('2026-05-23T00:00:00.000Z'),
    patient: { user_id: 5 },
    slot: { price: 100000 },
    ...overrides,
  });

  beforeEach(async () => {
    prisma = createPrismaMock();
    wirePrismaTransaction(prisma);

    mailService = {
      sendMedicalRecordEmail: jest.fn(),
    };

    configValues = {
      SEPAY_API_KEY: 'api-key',
      SEPAY_WEBHOOK_TOKEN: 'webhook-token',
      SEPAY_ACCOUNT_NUMBER: '123456789',
    };

    configService = {
      get: jest.fn((key: string) => configValues[key]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AppointmentService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: MailService,
          useValue: mailService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = moduleRef.get(AppointmentService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  describe('private helpers', () => {
    it('buildMeetingLink creates a meeting url', () => {
      const link = (service as any).buildMeetingLink(9);

      expect(link).toMatch(/^https:\/\/tele-eye\.vn\/meeting\/9-/);
    });

    it('extractAppointmentId parses TELEEYE payment references', () => {
      expect((service as any).extractAppointmentId('teleeye 123')).toBe(123);
      expect((service as any).extractAppointmentId('invalid')).toBeNull();
    });

    it('matchesTransferContent checks the transfer note format', () => {
      expect((service as any).matchesTransferContent('teleeye 55', 55)).toBe(true);
      expect((service as any).matchesTransferContent('teleeye 56', 55)).toBe(false);
    });

    it('getSepayApiToken prefers API key, falls back to webhook token, or returns null', () => {
      configValues.SEPAY_API_KEY = ' api-key ';
      expect((service as any).getSepayApiToken()).toBe('api-key');

      configValues.SEPAY_API_KEY = undefined;
      configValues.SEPAY_WEBHOOK_TOKEN = ' webhook ';
      expect((service as any).getSepayApiToken()).toBe('webhook');

      configValues.SEPAY_WEBHOOK_TOKEN = undefined;
      expect((service as any).getSepayApiToken()).toBeNull();
    });
  });

  describe('confirmAppointmentPayment', () => {
    it('only updates the slot when the appointment is already confirmed', async () => {
      const tx = createPrismaMock();
      tx.appointmentPayment.findFirst.mockResolvedValue(null);
      tx.doctorCalendarSlots.update.mockResolvedValue({});

      await expect(
        (service as any).confirmAppointmentPayment(
          tx,
          createAppointmentContext({
            status: AppointmentStatus.CONFIRMED,
          }),
          {
            amount: 100000,
            externalTransactionId: 'tx-1',
            paymentMethod: 'BANK_TRANSFER',
            description: 'desc',
            rawResponse: { ok: true },
          },
        ),
      ).resolves.toMatchObject({ success: true });
      expect(tx.appointment.update).not.toHaveBeenCalled();
      expect(tx.doctorCalendarSlots.update).toHaveBeenCalledWith({
        where: { slot_id: 11 },
        data: {
          status: 'BOOKED',
          is_locked: false,
          locked_by_user_id: null,
          locked_expires_at: null,
        },
      });
    });

    it('confirms the appointment when an existing payment already exists', async () => {
      const tx = createPrismaMock();
      tx.appointmentPayment.findFirst.mockResolvedValue({ payment_id: 1 });
      tx.appointment.update.mockResolvedValue({});
      tx.doctorCalendarSlots.update.mockResolvedValue({});
      jest.spyOn(service as any, 'buildMeetingLink').mockReturnValue('meeting-link');

      await (service as any).confirmAppointmentPayment(
        tx,
        createAppointmentContext(),
        {
          amount: 100000,
          externalTransactionId: 'tx-1',
          paymentMethod: 'BANK_TRANSFER',
          description: 'desc',
          rawResponse: { ok: true },
        },
      );

      expect(tx.appointment.update).toHaveBeenCalledWith({
        where: { appointment_id: 1 },
        data: {
          status: AppointmentStatus.CONFIRMED,
          meeting_link: 'meeting-link',
        },
      });
      expect(tx.transaction.create).not.toHaveBeenCalled();
      expect(tx.appointmentPayment.create).not.toHaveBeenCalled();
    });

    it('creates transaction and payment records when they do not exist', async () => {
      const tx = createPrismaMock();
      tx.appointmentPayment.findFirst.mockResolvedValue(null);
      tx.transaction.findFirst.mockResolvedValue(null);
      tx.transaction.create.mockResolvedValue({ transaction_id: 77 });
      tx.appointmentPayment.create.mockResolvedValue({ payment_id: 1 });
      tx.appointment.update.mockResolvedValue({});
      tx.doctorCalendarSlots.update.mockResolvedValue({});
      jest.spyOn(service as any, 'buildMeetingLink').mockReturnValue('meeting-link');

      await (service as any).confirmAppointmentPayment(
        tx,
        createAppointmentContext(),
        {
          amount: 100000,
          externalTransactionId: 'tx-1',
          paymentMethod: 'BANK_TRANSFER',
          description: 'desc',
          rawResponse: { ok: true },
        },
      );

      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: {
          user_id: 5,
          amount: 100000,
          type: 'PAYMENT',
          status: 'SUCCESS',
          payment_method: 'BANK_TRANSFER',
          external_transaction_id: 'tx-1',
          description: 'desc',
          raw_response: { ok: true },
        },
      });
      expect(tx.appointmentPayment.create).toHaveBeenCalledWith({
        data: {
          appointment_id: 1,
          transaction_id: 77,
          amount: 100000,
        },
      });
    });

    it('reuses an existing transaction when found', async () => {
      const tx = createPrismaMock();
      tx.appointmentPayment.findFirst.mockResolvedValue(null);
      tx.transaction.findFirst.mockResolvedValue({ transaction_id: 88 });
      tx.appointmentPayment.create.mockResolvedValue({ payment_id: 1 });
      tx.appointment.update.mockResolvedValue({});
      tx.doctorCalendarSlots.update.mockResolvedValue({});
      const linkSpy = jest.spyOn(service as any, 'buildMeetingLink');

      await (service as any).confirmAppointmentPayment(
        tx,
        createAppointmentContext({ meeting_link: 'existing-link' }),
        {
          amount: 100000,
          externalTransactionId: 'tx-1',
          paymentMethod: 'BANK_TRANSFER',
          description: 'desc',
          rawResponse: { ok: true },
        },
      );

      expect(tx.transaction.create).not.toHaveBeenCalled();
      expect(tx.appointment.update).toHaveBeenCalledWith({
        where: { appointment_id: 1 },
        data: {
          status: AppointmentStatus.CONFIRMED,
          meeting_link: 'existing-link',
        },
      });
      expect(linkSpy).not.toHaveBeenCalled();
    });
  });

  describe('fetchSepayTransactionsForAppointment', () => {
    it('returns an empty list when no SePay token is configured', async () => {
      configValues.SEPAY_API_KEY = undefined;
      configValues.SEPAY_WEBHOOK_TOKEN = undefined;

      await expect(
        (service as any).fetchSepayTransactionsForAppointment(
          createAppointmentContext(),
        ),
      ).resolves.toEqual([]);
    });

    it('fetches transactions and includes the configured account number', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          messages: { success: true },
          transactions: [{ id: 'tx-1' }],
        }),
      }) as any;

      await expect(
        (service as any).fetchSepayTransactionsForAppointment(
          createAppointmentContext(),
        ),
      ).resolves.toEqual([{ id: 'tx-1' }]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('account_number=123456789'),
        {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer api-key',
          },
        },
      );
    });

    it('throws when SePay responds with an error status', async () => {
      configValues.SEPAY_ACCOUNT_NUMBER = undefined;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }) as any;

      await expect(
        (service as any).fetchSepayTransactionsForAppointment(
          createAppointmentContext(),
        ),
      ).rejects.toThrow('SePay user API responded with 500');
    });

    it('returns an empty list when SePay payload is unsuccessful', async () => {
      configValues.SEPAY_ACCOUNT_NUMBER = undefined;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          messages: { success: false },
          transactions: [{ id: 'tx-1' }],
        }),
      }) as any;

      await expect(
        (service as any).fetchSepayTransactionsForAppointment(
          createAppointmentContext(),
        ),
      ).resolves.toEqual([]);
    });
  });

  describe('reconcilePendingSepayPayment', () => {
    it('returns false when the appointment does not belong to the user', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(
        (service as any).reconcilePendingSepayPayment(1, 5),
      ).resolves.toBe(false);
    });

    it('returns false when the appointment is not pending payment', async () => {
      prisma.appointment.findUnique.mockResolvedValue(
        createAppointmentContext({
          status: AppointmentStatus.CONFIRMED,
        }),
      );

      await expect(
        (service as any).reconcilePendingSepayPayment(1, 5),
      ).resolves.toBe(false);
    });

    it('returns false when no transaction matches the appointment', async () => {
      prisma.appointment.findUnique.mockResolvedValue(createAppointmentContext());
      jest
        .spyOn(service as any, 'fetchSepayTransactionsForAppointment')
        .mockResolvedValue([{ id: 'tx-1', amount_in: '10', transaction_content: 'OTHER 1' }]);

      await expect(
        (service as any).reconcilePendingSepayPayment(1, 5),
      ).resolves.toBe(false);
    });

    it('returns true even when the appointment changes before transaction confirmation', async () => {
      prisma.appointment.findUnique
        .mockResolvedValueOnce(createAppointmentContext())
        .mockResolvedValueOnce(null);
      jest
        .spyOn(service as any, 'fetchSepayTransactionsForAppointment')
        .mockResolvedValue([
          {
            id: 'tx-1',
            amount_in: '100000',
            transaction_content: 'TELEEYE 1',
          },
        ]);
      const confirmSpy = jest.spyOn(service as any, 'confirmAppointmentPayment');

      await expect(
        (service as any).reconcilePendingSepayPayment(1, 5),
      ).resolves.toBe(true);
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('confirms the appointment when a matching transaction is found', async () => {
      prisma.appointment.findUnique
        .mockResolvedValueOnce(createAppointmentContext())
        .mockResolvedValueOnce(createAppointmentContext());
      jest
        .spyOn(service as any, 'fetchSepayTransactionsForAppointment')
        .mockResolvedValue([
          {
            id: 'tx-1',
            amount_in: '100000',
            transaction_content: 'TELEEYE 1',
          },
        ]);
      const confirmSpy = jest
        .spyOn(service as any, 'confirmAppointmentPayment')
        .mockResolvedValue({ success: true });

      await expect(
        (service as any).reconcilePendingSepayPayment(1, 5),
      ).resolves.toBe(true);
      expect(confirmSpy).toHaveBeenCalled();
    });
  });

  describe('createAppointment', () => {
    it('throws when the patient profile does not exist', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(
        service.createAppointment(5, { slot_id: 11 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when the slot does not exist', async () => {
      prisma.patient.findUnique.mockResolvedValue({ patient_id: 3 });
      prisma.doctorCalendarSlots.findUnique.mockResolvedValue(null);

      await expect(
        service.createAppointment(5, { slot_id: 11 } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when the user does not own a valid active lock', async () => {
      prisma.patient.findUnique.mockResolvedValue({ patient_id: 3 });
      prisma.doctorCalendarSlots.findUnique.mockResolvedValue({
        slot_id: 11,
        locked_by_user_id: 99,
        is_locked: true,
        locked_expires_at: new Date(Date.now() + 1000),
      });

      await expect(
        service.createAppointment(5, { slot_id: 11 } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('throws when the slot already has an active appointment', async () => {
      prisma.patient.findUnique.mockResolvedValue({ patient_id: 3 });
      prisma.doctorCalendarSlots.findUnique.mockResolvedValue({
        slot_id: 11,
        doctor_id: 8,
        locked_by_user_id: 5,
        is_locked: true,
        locked_expires_at: new Date(Date.now() + 1000),
      });
      prisma.appointment.findFirst.mockResolvedValue({ appointment_id: 1 });

      await expect(
        service.createAppointment(5, { slot_id: 11 } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a pending appointment with medical files', async () => {
      prisma.patient.findUnique.mockResolvedValue({ patient_id: 3 });
      prisma.doctorCalendarSlots.findUnique.mockResolvedValue({
        slot_id: 11,
        doctor_id: 8,
        locked_by_user_id: 5,
        is_locked: true,
        locked_expires_at: new Date(Date.now() + 1000),
      });
      prisma.appointment.findFirst.mockResolvedValue(null);
      prisma.appointment.create.mockResolvedValue({ appointment_id: 99 });

      await expect(
        service.createAppointment(
          5,
          {
            slot_id: 11,
            description: 'Mờ mắt',
            medical_files: ['file-1.png'],
          } as any,
        ),
      ).resolves.toMatchObject({
        appointment_id: 99,
      });
      expect(prisma.appointment.create).toHaveBeenCalledWith({
        data: {
          slot_id: 11,
          patient_id: 3,
          doctor_id: 8,
          status: AppointmentStatus.PENDING_PAYMENT,
          medical_record: {
            create: { chief_complaint: 'Mờ mắt' },
          },
          files: {
            create: [
              {
                file_url: 'file-1.png',
                file_type: FileType.EYE_IMAGE,
                uploader: { connect: { user_id: 5 } },
              },
            ],
          },
        },
      });
    });
  });

  describe('handlePaymentResult', () => {
    it('throws when the appointment does not exist', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(
        service.handlePaymentResult(1, 'txn', 100000, {}, true),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns the appointment when it is already confirmed and payment succeeds', async () => {
      const appointment = createAppointmentContext({
        status: AppointmentStatus.CONFIRMED,
      });
      prisma.appointment.findUnique.mockResolvedValue(appointment);

      await expect(
        service.handlePaymentResult(1, 'txn', 100000, {}, true),
      ).resolves.toEqual(appointment);
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('records failed transactions without confirming the appointment', async () => {
      prisma.appointment.findUnique.mockResolvedValue(createAppointmentContext());
      prisma.transaction.create.mockResolvedValue({ transaction_id: 1 });

      await expect(
        service.handlePaymentResult(1, 'txn', 100000, {}, false),
      ).resolves.toEqual({
        appointmentId: 1,
        status: 'FAILED',
      });
      expect(prisma.appointmentPayment.create).not.toHaveBeenCalled();
      expect(prisma.appointment.update).not.toHaveBeenCalled();
      expect(prisma.doctorCalendarSlots.update).not.toHaveBeenCalled();
    });

    it('records successful payments and confirms the appointment', async () => {
      prisma.appointment.findUnique.mockResolvedValue(createAppointmentContext());
      prisma.transaction.create.mockResolvedValue({ transaction_id: 1 });
      prisma.appointmentPayment.create.mockResolvedValue({ payment_id: 1 });
      prisma.appointment.update.mockResolvedValue({});
      prisma.doctorCalendarSlots.update.mockResolvedValue({});
      jest.spyOn(service as any, 'buildMeetingLink').mockReturnValue('meeting-link');

      await expect(
        service.handlePaymentResult(1, 'txn', 100000, { code: '00' }, true),
      ).resolves.toEqual({
        appointmentId: 1,
        status: 'SUCCESS',
      });
      expect(prisma.appointmentPayment.create).toHaveBeenCalled();
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { appointment_id: 1 },
        data: {
          status: AppointmentStatus.CONFIRMED,
          meeting_link: 'meeting-link',
        },
      });
    });
  });

  describe('getDoctorAppointmentsToday', () => {
    it('throws when the doctor does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.getDoctorAppointmentsToday(8)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns today appointments for the doctor', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 8 });
      prisma.appointment.findMany.mockResolvedValue([{ appointment_id: 1 }]);

      await expect(service.getDoctorAppointmentsToday(8)).resolves.toEqual([
        { appointment_id: 1 },
      ]);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctor_id: 8,
            status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
          }),
        }),
      );
    });
  });

  describe('startAppointment', () => {
    const slot = {
      date_slot: new Date('2026-05-23T00:00:00.000Z'),
      start_time: new Date('2026-05-23T03:00:00.000Z'),
    };

    it('throws when the doctor does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.startAppointment(8, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when the appointment does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 8 });
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.startAppointment(8, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the appointment belongs to another doctor', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 8 });
      prisma.appointment.findUnique.mockResolvedValue({
        doctor_id: 9,
        status: 'CONFIRMED',
        slot,
      });

      await expect(service.startAppointment(8, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws when the appointment is not confirmed', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 8 });
      prisma.appointment.findUnique.mockResolvedValue({
        doctor_id: 8,
        status: 'PENDING_PAYMENT',
        slot,
      });

      await expect(service.startAppointment(8, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when the doctor already has an active appointment', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 8 });
      prisma.appointment.findUnique.mockResolvedValue({
        appointment_id: 1,
        doctor_id: 8,
        status: 'CONFIRMED',
        slot,
      });
      prisma.appointment.findFirst.mockResolvedValue({ appointment_id: 2 });

      await expect(service.startAppointment(8, 1)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws when the appointment is started too early', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-23T02:30:00.000Z'));
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 8 });
      prisma.appointment.findUnique.mockResolvedValue({
        appointment_id: 1,
        doctor_id: 8,
        status: 'CONFIRMED',
        slot,
      });
      prisma.appointment.findFirst.mockResolvedValue(null);

      await expect(service.startAppointment(8, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when the appointment is started too late', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-23T03:31:00.000Z'));
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 8 });
      prisma.appointment.findUnique.mockResolvedValue({
        appointment_id: 1,
        doctor_id: 8,
        status: 'CONFIRMED',
        slot,
      });
      prisma.appointment.findFirst.mockResolvedValue(null);

      await expect(service.startAppointment(8, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('starts the appointment within the allowed time window', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-23T02:50:00.000Z'));
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 8 });
      prisma.appointment.findUnique.mockResolvedValue({
        appointment_id: 1,
        doctor_id: 8,
        status: 'CONFIRMED',
        slot,
      });
      prisma.appointment.findFirst.mockResolvedValue(null);
      prisma.appointment.update.mockResolvedValue({
        appointment_id: 1,
        status: 'IN_PROGRESS',
        actual_start_at: new Date('2026-05-23T02:50:00.000Z'),
      });

      await expect(service.startAppointment(8, 1)).resolves.toMatchObject({
        appointment_id: 1,
        status: 'IN_PROGRESS',
      });
    });
  });

  describe('completeAppointment', () => {
    const dto = {
      diagnosis_od: 'OD',
      diagnosis_os: 'OS',
      icd_10_code: 'H00',
      management_plan: 'Plan',
      doctor_notes: 'Notes',
      glasses_prescription: {
        sphere_od: '-1.0',
      },
      drug_prescription: [
        {
          drug_id: 1,
          quantity: 2,
          dosage: '2/day',
          note: 'after meal',
        },
      ],
    };

    it('throws when the doctor does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.completeAppointment(8, 1, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when the appointment does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 8 });
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.completeAppointment(8, 1, dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the appointment belongs to another doctor', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 8 });
      prisma.appointment.findUnique.mockResolvedValue({
        doctor_id: 9,
        status: 'IN_PROGRESS',
      });

      await expect(service.completeAppointment(8, 1, dto as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws when the appointment is not in progress', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 8 });
      prisma.appointment.findUnique.mockResolvedValue({
        doctor_id: 8,
        status: 'CONFIRMED',
      });

      await expect(service.completeAppointment(8, 1, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when any prescribed drug does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 8 });
      prisma.appointment.findUnique.mockResolvedValue({
        doctor_id: 8,
        status: 'IN_PROGRESS',
      });
      prisma.drug.findMany.mockResolvedValue([]);

      await expect(service.completeAppointment(8, 1, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('completes the appointment, updates medical records and sends email', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 8 });
      prisma.appointment.findUnique.mockResolvedValue({
        doctor_id: 8,
        status: 'IN_PROGRESS',
      });
      prisma.drug.findMany.mockResolvedValue([
        { drug_id: 1, name: 'Thuoc A', unit: 'vien' },
      ]);
      prisma.eyeMedicalRecord.update.mockResolvedValue({});
      prisma.appointment.update.mockResolvedValue({
        appointment_id: 1,
        status: 'COMPLETED',
        patient: {
          full_name: 'Patient A',
          user: { email: 'patient@tele-eye.vn' },
        },
      });
      mailService.sendMedicalRecordEmail.mockResolvedValue(true);

      await expect(service.completeAppointment(8, 1, dto as any)).resolves.toMatchObject({
        appointment_id: 1,
        status: 'COMPLETED',
      });
      expect(prisma.eyeMedicalRecord.update).toHaveBeenCalledWith({
        where: { appointment_id: 1 },
        data: expect.objectContaining({
          diagnosis_od: 'OD',
          diagnosis_os: 'OS',
          glasses_prescription: {
            upsert: {
              create: dto.glasses_prescription,
              update: dto.glasses_prescription,
            },
          },
          drug_prescription: {
            create: {
              items: {
                create: [
                  {
                    drug_id: 1,
                    quantity: 2,
                    dosage: '2/day',
                    note: 'after meal',
                  },
                ],
              },
            },
          },
        }),
      });
      expect(mailService.sendMedicalRecordEmail).toHaveBeenCalledWith(
        'patient@tele-eye.vn',
        'Patient A',
        dto,
        [
          {
            drug_id: 1,
            quantity: 2,
            dosage: '2/day',
            note: 'after meal',
            drug_name: 'Thuoc A',
            unit: 'vien',
          },
        ],
      );
    });

    it('returns without sending email when the patient email is missing', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 8 });
      prisma.appointment.findUnique.mockResolvedValue({
        doctor_id: 8,
        status: 'IN_PROGRESS',
      });
      prisma.eyeMedicalRecord.update.mockResolvedValue({});
      prisma.appointment.update.mockResolvedValue({
        appointment_id: 1,
        status: 'COMPLETED',
        patient: {
          full_name: 'Patient A',
          user: { email: undefined },
        },
      });

      await expect(
        service.completeAppointment(8, 1, {
          diagnosis_od: 'OD',
          diagnosis_os: 'OS',
        } as any),
      ).resolves.toMatchObject({
        appointment_id: 1,
        status: 'COMPLETED',
      });
      expect(mailService.sendMedicalRecordEmail).not.toHaveBeenCalled();
    });

    it('logs asynchronous email errors after completion', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ doctor_id: 8 });
      prisma.appointment.findUnique.mockResolvedValue({
        doctor_id: 8,
        status: 'IN_PROGRESS',
      });
      prisma.eyeMedicalRecord.update.mockResolvedValue({});
      prisma.appointment.update.mockResolvedValue({
        appointment_id: 1,
        status: 'COMPLETED',
        patient: {
          full_name: 'Patient A',
          user: { email: 'patient@tele-eye.vn' },
        },
      });
      mailService.sendMedicalRecordEmail.mockRejectedValue(new Error('mail failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      await service.completeAppointment(8, 1, {
        diagnosis_od: 'OD',
        diagnosis_os: 'OS',
      } as any);
      await Promise.resolve();

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('getMedicalRecordDetail', () => {
    it('throws when the appointment does not exist', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.getMedicalRecordDetail(5, 'PATIENT', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws for patients when the appointment is not completed', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        status: 'CONFIRMED',
        patient: { user_id: 5 },
        doctor: { user_id: 8 },
      });

      await expect(service.getMedicalRecordDetail(5, 'PATIENT', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws for doctors when the appointment has no medical data yet', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        status: 'CONFIRMED',
        patient: { user_id: 5 },
        doctor: { user_id: 8 },
      });

      await expect(service.getMedicalRecordDetail(8, 'DOCTOR', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when the user is not allowed to see the medical record', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        status: 'COMPLETED',
        patient: { user_id: 5 },
        doctor: { user_id: 8 },
      });

      await expect(service.getMedicalRecordDetail(99, 'PATIENT', 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns the medical record for admins', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        appointment_id: 1,
        status: 'COMPLETED',
        created_at: new Date('2026-05-23T00:00:00.000Z'),
        patient: { user_id: 5, full_name: 'Patient A' },
        doctor: { user_id: 8, full_name: 'Doctor A' },
        files: [{ file_url: 'file-1.png' }],
        medical_record: { diagnosis_od: 'OD' },
      });

      await expect(service.getMedicalRecordDetail(99, 'ADMIN', 1)).resolves.toEqual({
        appointment_id: 1,
        status: 'COMPLETED',
        created_at: new Date('2026-05-23T00:00:00.000Z'),
        patient_info: { user_id: 5, full_name: 'Patient A' },
        doctor_info: { user_id: 8, full_name: 'Doctor A' },
        medical_files: [{ file_url: 'file-1.png' }],
        medical_record: { diagnosis_od: 'OD' },
      });
    });
  });

  describe('getPatientAppointments', () => {
    it('throws when the patient profile does not exist', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(service.getPatientAppointments(5)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns patient appointments ordered by creation date', async () => {
      prisma.patient.findUnique.mockResolvedValue({ patient_id: 3 });
      prisma.appointment.findMany.mockResolvedValue([{ appointment_id: 1, status: 'IN_PROGRESS', meeting_link: 'https://meet.example.com/1' }]);

      await expect(service.getPatientAppointments(5)).resolves.toEqual([
        { appointment_id: 1, status: 'IN_PROGRESS', meeting_link: 'https://meet.example.com/1' },
      ]);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patient_id: 3 },
          orderBy: { created_at: 'desc' },
        }),
      );
    });
  });

  describe('handleSepayWebhook', () => {
    it('returns failure when the transfer content does not include an appointment id', async () => {
      await expect(service.handleSepayWebhook({ content: 'invalid' })).resolves.toMatchObject({
        success: false,
      });
    });

    it('returns failure when the appointment is not found', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(
        service.handleSepayWebhook({ content: 'TELEEYE 1', amount: 100000 }),
      ).resolves.toMatchObject({
        success: false,
      });
    });

    it('returns success when the appointment was already confirmed', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        status: 'CONFIRMED',
        slot: { price: 100000 },
        patient: { user_id: 5 },
      });

      await expect(
        service.handleSepayWebhook({ content: 'TELEEYE 1', amount: 100000 }),
      ).resolves.toMatchObject({
        success: true,
      });
    });

    it('returns failure when the transferred amount is incorrect', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        status: 'PENDING_PAYMENT',
        slot: { price: 100000 },
        patient: { user_id: 5 },
      });

      await expect(
        service.handleSepayWebhook({ content: 'TELEEYE 1', amount: 50000 }),
      ).resolves.toMatchObject({
        success: false,
      });
    });

    it('confirms the appointment when the webhook data is valid', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        ...createAppointmentContext(),
        patient: { user_id: 5 },
        slot: { price: 100000 },
      });
      jest
        .spyOn(service as any, 'confirmAppointmentPayment')
        .mockResolvedValue({ success: true, message: 'ok' });

      await expect(
        service.handleSepayWebhook({ content: 'TELEEYE 1', amount: 100000, id: 'bank-1' }),
      ).resolves.toEqual({
        success: true,
        message: 'ok',
      });
    });
  });

  describe('getPaymentStatus', () => {
    it('throws when the appointment does not exist', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.getPaymentStatus(1, 5)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the appointment belongs to another patient', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        patient: { user_id: 99 },
      });

      await expect(service.getPaymentStatus(1, 5)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('re-fetches the appointment after successful reconciliation', async () => {
      prisma.appointment.findUnique
        .mockResolvedValueOnce({
          appointment_id: 1,
          patient: { user_id: 5 },
          status: AppointmentStatus.PENDING_PAYMENT,
          meeting_link: null,
        })
        .mockResolvedValueOnce({
          appointment_id: 1,
          patient: { user_id: 5 },
          status: AppointmentStatus.CONFIRMED,
          meeting_link: 'meeting-link',
        });
      jest
        .spyOn(service as any, 'reconcilePendingSepayPayment')
        .mockResolvedValue(true);

      await expect(service.getPaymentStatus(1, 5)).resolves.toEqual({
        appointment_id: 1,
        status: AppointmentStatus.CONFIRMED,
        paid: true,
        meeting_link: 'meeting-link',
      });
    });

    it('logs reconciliation errors and returns the current pending status', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        appointment_id: 1,
        patient: { user_id: 5 },
        status: AppointmentStatus.PENDING_PAYMENT,
        meeting_link: null,
      });
      jest
        .spyOn(service as any, 'reconcilePendingSepayPayment')
        .mockRejectedValue(new Error('reconcile failed'));
      const warnSpy = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation(() => undefined);

      await expect(service.getPaymentStatus(1, 5)).resolves.toEqual({
        appointment_id: 1,
        status: AppointmentStatus.PENDING_PAYMENT,
        paid: false,
        meeting_link: null,
      });
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
