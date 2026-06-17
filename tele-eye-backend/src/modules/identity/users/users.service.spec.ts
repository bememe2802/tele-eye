import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/database/prisma.service';
import { createPrismaMock } from 'src/test-utils/prisma.mock';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(UsersService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('findAll', () => {
    it('returns paginated user list', async () => {
      prisma.user.findMany.mockResolvedValue([{ user_id: 1, email: 'a@b.com' }]);
      prisma.user.count.mockResolvedValue(1);
      const result = await service.findAll(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('toggleActive', () => {
    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.toggleActive(99, true)).rejects.toThrow(NotFoundException);
    });

    it('throws when trying to lock Admin account', async () => {
      prisma.user.findUnique.mockResolvedValue({ user_id: 1, role: 'ADMIN' });
      await expect(service.toggleActive(1, false)).rejects.toThrow(BadRequestException);
    });

    it('locks a non-admin user', async () => {
      prisma.user.findUnique.mockResolvedValue({ user_id: 2, role: 'PATIENT' });
      prisma.user.update.mockResolvedValue({ user_id: 2, is_active: false });
      const result = await service.toggleActive(2, false);
      expect(result.is_active).toBe(false);
    });
  });
});
