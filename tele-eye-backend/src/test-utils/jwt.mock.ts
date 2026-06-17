import { JwtService } from '@nestjs/jwt';

export function createJwtServiceMock(): jest.Mocked<
  Pick<JwtService, 'signAsync' | 'verifyAsync'>
> {
  return {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
}
