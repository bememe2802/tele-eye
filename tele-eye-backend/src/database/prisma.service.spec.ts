import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = moduleRef.get(PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('connects successfully', async () => {
      const connectSpy = jest
        .spyOn(service, '$connect')
        .mockResolvedValue(undefined as never);

      await expect(service.onModuleInit()).resolves.toBeUndefined();
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('logs connection errors instead of throwing', async () => {
      const error = new Error('boom');
      jest.spyOn(service, '$connect').mockRejectedValue(error);
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      await expect(service.onModuleInit()).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error connecting to Prisma:',
        error,
      );
    });
  });
});
