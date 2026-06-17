import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as tokenHelper from '../../../common/helper/generateTokens';
import { PrismaService } from '../../../database/prisma.service';
import {
  createPrismaMock,
  wirePrismaTransaction,
} from '../../../test-utils/prisma.mock';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let jwtService: { verifyAsync: jest.Mock };
  let mailerService: { sendMail: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    wirePrismaTransaction(prisma);

    jwtService = {
      verifyAsync: jest.fn(),
    };

    mailerService = {
      sendMail: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: MailerService,
          useValue: mailerService,
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    it('throws when the email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ user_id: 1 });

      await expect(
        service.register({
          email: 'existing@tele-eye.vn',
          password: '12345678',
          fullName: 'Existing User',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates user, patient, verification token and sends mail', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ user_id: 10 });
      prisma.patient.create.mockResolvedValue({ patient_id: 20 });
      prisma.verificationToken.create.mockResolvedValue({ id: 30 });
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mailerService.sendMail.mockResolvedValue({ messageId: 'mail-1' });

      const result = await service.register({
        email: 'new@tele-eye.vn',
        password: '12345678',
        fullName: 'New User',
      } as any);

      expect(result).toMatchObject({
        email: 'new@tele-eye.vn',
        nextStep: 'VERIFY_EMAIL',
      });
      expect(result.message).toEqual(expect.any(String));
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@tele-eye.vn',
          password_hash: 'hashed-password',
          role: 'PATIENT',
          is_email_verified: false,
        },
      });
      expect(prisma.patient.create).toHaveBeenCalledWith({
        data: {
          user_id: 10,
          full_name: 'New User',
        },
      });
      expect(prisma.verificationToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'new@tele-eye.vn',
          token: expect.stringMatching(/^\d{6}$/),
          expires_at: expect.any(Date),
        }),
      });
      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'new@tele-eye.vn',
          subject: expect.stringContaining('Tele-Eye'),
        }),
      );
    });

    it('still succeeds when sending email fails', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ user_id: 10 });
      prisma.patient.create.mockResolvedValue({ patient_id: 20 });
      prisma.verificationToken.create.mockResolvedValue({ id: 30 });
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
      mailerService.sendMail.mockRejectedValue(new Error('mail failed'));
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      await expect(
        service.register({
          email: 'new@tele-eye.vn',
          password: '12345678',
          fullName: 'New User',
        } as any),
      ).resolves.toMatchObject({
        email: 'new@tele-eye.vn',
        nextStep: 'VERIFY_EMAIL',
      });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('throws when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'missing@tele-eye.vn', password: '12345678' } as any,
          'browser',
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when the account is inactive', async () => {
      prisma.user.findUnique.mockResolvedValue({
        user_id: 1,
        is_active: false,
      });

      await expect(
        service.login(
          { email: 'inactive@tele-eye.vn', password: '12345678' } as any,
          'browser',
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when the password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue({
        user_id: 1,
        email: 'user@tele-eye.vn',
        password_hash: 'hash',
        is_active: true,
        is_email_verified: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login(
          { email: 'user@tele-eye.vn', password: 'wrong' } as any,
          'browser',
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when the email has not been verified', async () => {
      prisma.user.findUnique.mockResolvedValue({
        user_id: 1,
        email: 'user@tele-eye.vn',
        password_hash: 'hash',
        is_active: true,
        is_email_verified: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login(
          { email: 'user@tele-eye.vn', password: '12345678' } as any,
          'browser',
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens and stores a refresh session on success', async () => {
      prisma.user.findUnique.mockResolvedValue({
        user_id: 1,
        email: 'user@tele-eye.vn',
        role: 'PATIENT',
        password_hash: 'hash',
        is_active: true,
        is_email_verified: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(tokenHelper, 'generateTokens').mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      prisma.userSession.create.mockResolvedValue({ session_id: 1 });

      await expect(
        service.login(
          { email: 'user@tele-eye.vn', password: '12345678' } as any,
          'browser',
          '127.0.0.1',
        ),
      ).resolves.toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        role: 'PATIENT',
      });
      expect(tokenHelper.generateTokens).toHaveBeenCalledWith(
        jwtService as unknown as JwtService,
        1,
        'user@tele-eye.vn',
        'PATIENT',
      );
      expect(prisma.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: 1,
          refresh_token: 'refresh-token',
          user_agent: 'browser',
          ip_address: '127.0.0.1',
          expires_at: expect.any(Date),
          is_revoked: false,
        }),
      });
    });
  });

  describe('refreshTokens', () => {
    it('throws when token verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

      await expect(
        service.refreshTokens({ refreshToken: 'bad-token' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws when the session does not exist', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1 });
      prisma.userSession.findFirst.mockResolvedValue(null);

      await expect(
        service.refreshTokens({ refreshToken: 'refresh-token' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws when the session is revoked', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1 });
      prisma.userSession.findFirst.mockResolvedValue({
        session_id: 7,
        is_revoked: true,
      });

      await expect(
        service.refreshTokens({ refreshToken: 'refresh-token' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws when the session is expired', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1 });
      prisma.userSession.findFirst.mockResolvedValue({
        session_id: 7,
        is_revoked: false,
        expires_at: new Date(Date.now() - 1000),
      });

      await expect(
        service.refreshTokens({ refreshToken: 'refresh-token' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when the user cannot be found', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1 });
      prisma.userSession.findFirst.mockResolvedValue({
        session_id: 7,
        is_revoked: false,
        expires_at: new Date(Date.now() + 1000),
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshTokens({ refreshToken: 'refresh-token' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('issues new tokens and updates the session', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1 });
      prisma.userSession.findFirst.mockResolvedValue({
        session_id: 7,
        is_revoked: false,
        expires_at: new Date(Date.now() + 1000),
      });
      prisma.user.findUnique.mockResolvedValue({
        user_id: 1,
        email: 'user@tele-eye.vn',
        role: 'PATIENT',
      });
      jest.spyOn(tokenHelper, 'generateTokens').mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      await expect(
        service.refreshTokens({ refreshToken: 'refresh-token' } as any),
      ).resolves.toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { session_id: 7 },
        data: {
          refresh_token: 'new-refresh',
          expires_at: expect.any(Date),
        },
      });
    });
  });

  describe('logout', () => {
    it('throws when the refresh token is unknown', async () => {
      prisma.userSession.findFirst.mockResolvedValue(null);

      await expect(
        service.logout({ refreshToken: 'missing' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns an informational message when already revoked', async () => {
      prisma.userSession.findFirst.mockResolvedValue({
        session_id: 9,
        is_revoked: true,
      });

      await expect(
        service.logout({ refreshToken: 'known' } as any),
      ).resolves.toMatchObject({
        message: expect.any(String),
      });
    });

    it('revokes the current session on success', async () => {
      prisma.userSession.findFirst.mockResolvedValue({
        session_id: 9,
        is_revoked: false,
      });
      prisma.userSession.update.mockResolvedValue({ session_id: 9 });

      await expect(
        service.logout({ refreshToken: 'known' } as any),
      ).resolves.toMatchObject({
        message: expect.any(String),
      });
      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { session_id: 9 },
        data: { is_revoked: true },
      });
    });
  });

  describe('verifyEmail', () => {
    it('throws when the verification token is invalid', async () => {
      prisma.verificationToken.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyEmail({
          email: 'user@tele-eye.vn',
          token: '123456',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('deletes expired tokens and throws', async () => {
      prisma.verificationToken.findFirst.mockResolvedValue({
        id: 1,
        expires_at: new Date(Date.now() - 1000),
      });
      prisma.verificationToken.delete.mockResolvedValue({ id: 1 });

      await expect(
        service.verifyEmail({
          email: 'user@tele-eye.vn',
          token: '123456',
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('marks the email as verified and removes the token', async () => {
      prisma.verificationToken.findFirst.mockResolvedValue({
        id: 1,
        expires_at: new Date(Date.now() + 1000),
      });
      prisma.user.update.mockResolvedValue({ user_id: 1 });
      prisma.verificationToken.delete.mockResolvedValue({ id: 1 });

      await expect(
        service.verifyEmail({
          email: 'user@tele-eye.vn',
          token: '123456',
        } as any),
      ).resolves.toMatchObject({
        message: expect.any(String),
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: 'user@tele-eye.vn' },
        data: { is_email_verified: true },
      });
    });
  });
});
