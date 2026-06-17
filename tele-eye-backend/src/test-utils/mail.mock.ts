/**
 * Mock cho MailService (nodemailer-based, src/modules/mail/mail.service.ts).
 * Trả về object có shape giống MailService để dùng làm useValue trong TestingModule.
 */
export function createMailServiceMock(): {
  sendMedicalRecordEmail: jest.Mock;
} {
  return {
    sendMedicalRecordEmail: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Mock cho MailerService (@nestjs-modules/mailer) dùng bởi AuthService.
 */
export function createMailerServiceMock(): {
  sendMail: jest.Mock;
} {
  return {
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
  };
}
