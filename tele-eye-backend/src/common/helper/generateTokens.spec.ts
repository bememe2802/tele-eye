import { JwtService } from '@nestjs/jwt';
import { generateTokens } from './generateTokens';

describe('generateTokens', () => {
  it('generates access and refresh tokens with expected payloads', async () => {
    const jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
    } as unknown as JwtService;

    const result = await generateTokens(
      jwtService,
      7,
      'patient@tele-eye.vn',
      'PATIENT',
    );

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect((jwtService.signAsync as jest.Mock).mock.calls).toEqual([
      [
        { sub: 7, email: 'patient@tele-eye.vn', role: 'PATIENT' },
        { expiresIn: '15m' },
      ],
      [
        { sub: 7, email: 'patient@tele-eye.vn', role: 'PATIENT' },
        { expiresIn: '7d' },
      ],
    ]);
  });
});
