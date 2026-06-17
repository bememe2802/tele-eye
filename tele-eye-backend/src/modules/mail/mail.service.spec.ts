import { Test } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('MailService', () => {
  let service: MailService;
  let sendMail: jest.Mock;

  beforeEach(async () => {
    sendMail = jest.fn();
    (nodemailer.createTransport as unknown as jest.Mock).mockReturnValue({
      sendMail,
    } as nodemailer.Transporter);

    const moduleRef = await Test.createTestingModule({
      providers: [MailService],
    }).compile();

    service = moduleRef.get(MailService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('sendMedicalRecordEmail', () => {
    it('sends an email with enriched drug data', async () => {
      sendMail.mockResolvedValue({ messageId: 'mail-1' });
      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation(() => undefined);

      const result = await service.sendMedicalRecordEmail(
        'patient@tele-eye.vn',
        'Nguyen Van A',
        {
          diagnosis_od: 'Cận thị',
          diagnosis_os: 'Viêm kết mạc',
          management_plan: 'Nghỉ ngơi',
        },
        [
          {
            drug_name: 'Thuoc A',
            quantity: 2,
            unit: 'vien',
            dosage: '2 lan/ngay',
          },
        ],
      );

      expect(result).toBe(true);
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'patient@tele-eye.vn',
          subject: expect.stringContaining('Nguyen Van A'),
          html: expect.stringContaining('Thuoc A'),
        }),
      );
      expect(logSpy).toHaveBeenCalled();
    });

    it('falls back when there is no prescribed drug', async () => {
      sendMail.mockResolvedValue({ messageId: 'mail-2' });

      await expect(
        service.sendMedicalRecordEmail(
          'patient@tele-eye.vn',
          'Nguyen Van B',
          {},
          [],
        ),
      ).resolves.toBe(true);

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Không có thuốc kê đơn'),
        }),
      );
    });

    it('returns false and logs when sending fails', async () => {
      const error = new Error('smtp failed');
      sendMail.mockRejectedValue(error);
      const errorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);

      await expect(
        service.sendMedicalRecordEmail('patient@tele-eye.vn', 'User', {}, []),
      ).resolves.toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('patient@tele-eye.vn'),
        error,
      );
    });
  });
});
