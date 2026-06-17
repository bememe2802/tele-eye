import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../database/prisma.service';
import { createPrismaMock } from '../../../test-utils/prisma.mock';
import { DrugService } from './drugs.service';

describe('DrugService', () => {
  let service: DrugService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        DrugService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = moduleRef.get(DrugService);
  });

  describe('create', () => {
    it('creates a drug when the name is unique', async () => {
      const dto = { name: 'Thuoc A', active_ingredient: 'A', is_active: true };
      const created = { drug_id: 1, ...dto };
      prisma.drug.findUnique.mockResolvedValue(null);
      prisma.drug.create.mockResolvedValue(created);

      await expect(service.create(dto as any)).resolves.toEqual(created);
      expect(prisma.drug.create).toHaveBeenCalledWith({ data: dto });
    });

    it('throws when the drug name already exists', async () => {
      prisma.drug.findUnique.mockResolvedValue({ drug_id: 1 });

      await expect(service.create({ name: 'Thuoc A' } as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('returns active drugs without search filters', async () => {
      prisma.drug.findMany.mockResolvedValue([]);

      await service.findAll();

      expect(prisma.drug.findMany).toHaveBeenCalledWith({
        where: { is_active: true },
        orderBy: { name: 'asc' },
      });
    });

    it('adds case-insensitive search filters when a keyword is provided', async () => {
      prisma.drug.findMany.mockResolvedValue([]);

      await service.findAll('vitamin');

      expect(prisma.drug.findMany).toHaveBeenCalledWith({
        where: {
          is_active: true,
          OR: [
            { name: { contains: 'vitamin', mode: 'insensitive' } },
            {
              active_ingredient: {
                contains: 'vitamin',
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('update', () => {
    it('updates the drug when it exists', async () => {
      const updated = { drug_id: 3, name: 'Thuoc B' };
      prisma.drug.findUnique.mockResolvedValue({ drug_id: 3 });
      prisma.drug.update.mockResolvedValue(updated);

      await expect(service.update(3, { name: 'Thuoc B' } as any)).resolves.toBe(
        updated,
      );
      expect(prisma.drug.update).toHaveBeenCalledWith({
        where: { drug_id: 3 },
        data: { name: 'Thuoc B' },
      });
    });

    it('throws when the drug does not exist', async () => {
      prisma.drug.findUnique.mockResolvedValue(null);

      await expect(service.update(3, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('soft deletes the drug when it exists', async () => {
      const updated = { drug_id: 3, is_active: false };
      prisma.drug.findUnique.mockResolvedValue({ drug_id: 3 });
      prisma.drug.update.mockResolvedValue(updated);

      await expect(service.remove(3)).resolves.toBe(updated);
      expect(prisma.drug.update).toHaveBeenCalledWith({
        where: { drug_id: 3 },
        data: { is_active: false },
      });
    });

    it('throws when the drug does not exist', async () => {
      prisma.drug.findUnique.mockResolvedValue(null);

      await expect(service.remove(3)).rejects.toThrow(NotFoundException);
    });
  });
});
