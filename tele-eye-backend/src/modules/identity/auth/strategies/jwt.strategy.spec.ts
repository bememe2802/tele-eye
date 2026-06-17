import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('secret-key'),
          },
        },
      ],
    }).compile();

    strategy = moduleRef.get(JwtStrategy);
  });

  it('maps payload fields in validate', async () => {
    await expect(
      strategy.validate({
        sub: 9,
        email: 'doctor@tele-eye.vn',
        role: 'DOCTOR',
      }),
    ).resolves.toEqual({
      userId: 9,
      email: 'doctor@tele-eye.vn',
      role: 'DOCTOR',
    });
  });
});
