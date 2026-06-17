import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    verifyEmail: jest.Mock;
    refreshTokens: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      verifyEmail: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    it('delegates to authService.register and returns the result', async () => {
      const dto = { email: 'user@tele-eye.vn', password: 'pass', fullName: 'User' };
      const expected = { message: 'OTP sent' };
      authService.register.mockResolvedValue(expected);

      await expect(controller.register(dto as any)).resolves.toEqual(expected);
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('passes dto, userAgent and ip to authService.login', async () => {
      const dto = { email: 'user@tele-eye.vn', password: 'pass' };
      const expected = { accessToken: 'tok' };
      authService.login.mockResolvedValue(expected);

      await expect(
        controller.login(dto as any, '127.0.0.1', 'Mozilla/5.0'),
      ).resolves.toEqual(expected);
      expect(authService.login).toHaveBeenCalledWith(dto, 'Mozilla/5.0', '127.0.0.1');
    });

    it('falls back to "Unknown Device" when user-agent header is missing', async () => {
      const dto = { email: 'user@tele-eye.vn', password: 'pass' };
      authService.login.mockResolvedValue({});

      await controller.login(dto as any, '127.0.0.1', undefined as any);
      expect(authService.login).toHaveBeenCalledWith(dto, 'Unknown Device', '127.0.0.1');
    });
  });

  describe('verifyEmail', () => {
    it('delegates to authService.verifyEmail', async () => {
      const dto = { email: 'user@tele-eye.vn', token: '123456' };
      authService.verifyEmail.mockResolvedValue({ message: 'verified' });

      await expect(controller.verifyEmail(dto as any)).resolves.toEqual({
        message: 'verified',
      });
      expect(authService.verifyEmail).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('delegates to authService.refreshTokens', async () => {
      const dto = { refreshToken: 'refresh-tok' };
      authService.refreshTokens.mockResolvedValue({ accessToken: 'new-tok' });

      await expect(controller.refresh(dto as any)).resolves.toEqual({
        accessToken: 'new-tok',
      });
      expect(authService.refreshTokens).toHaveBeenCalledWith(dto);
    });
  });

  describe('logout', () => {
    it('delegates to authService.logout', async () => {
      const dto = { refreshToken: 'refresh-tok' };
      authService.logout.mockResolvedValue({ message: 'logged out' });

      await expect(controller.logout(dto as any)).resolves.toEqual({
        message: 'logged out',
      });
      expect(authService.logout).toHaveBeenCalledWith(dto);
    });
  });
});
