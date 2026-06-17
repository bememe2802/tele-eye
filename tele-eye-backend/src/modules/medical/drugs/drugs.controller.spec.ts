import { Test } from '@nestjs/testing';
import { DrugController } from './drugs.controller';
import { DrugService } from './drugs.service';

describe('DrugController', () => {
  let controller: DrugController;
  let drugService: {
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    findAll: jest.Mock;
  };

  beforeEach(async () => {
    drugService = {
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findAll: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [DrugController],
      providers: [{ provide: DrugService, useValue: drugService }],
    }).compile();

    controller = moduleRef.get(DrugController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createDrug', () => {
    it('delegates dto to drugService.create', async () => {
      const dto = { name: 'Thuoc A', active_ingredient: 'A', is_active: true };
      const created = { drug_id: 1, ...dto };
      drugService.create.mockResolvedValue(created);

      await expect(controller.createDrug(dto as any)).resolves.toEqual(created);
      expect(drugService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateDrug', () => {
    it('delegates id and dto to drugService.update', async () => {
      const dto = { name: 'Thuoc B' };
      const updated = { drug_id: 2, ...dto };
      drugService.update.mockResolvedValue(updated);

      await expect(controller.updateDrug(2, dto as any)).resolves.toEqual(updated);
      expect(drugService.update).toHaveBeenCalledWith(2, dto);
    });
  });

  describe('removeDrug', () => {
    it('delegates id to drugService.remove', async () => {
      drugService.remove.mockResolvedValue({ message: 'Đã ngừng kinh doanh' });

      await expect(controller.removeDrug(3)).resolves.toEqual({
        message: 'Đã ngừng kinh doanh',
      });
      expect(drugService.remove).toHaveBeenCalledWith(3);
    });
  });

  describe('findAllDrugs', () => {
    it('returns all drugs when no search term is provided', async () => {
      const list = [{ drug_id: 1 }, { drug_id: 2 }];
      drugService.findAll.mockResolvedValue(list);

      await expect(controller.findAllDrugs()).resolves.toEqual(list);
      expect(drugService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('passes the search term to drugService.findAll', async () => {
      const list = [{ drug_id: 1, name: 'Thuoc A' }];
      drugService.findAll.mockResolvedValue(list);

      await expect(controller.findAllDrugs('Thuoc')).resolves.toEqual(list);
      expect(drugService.findAll).toHaveBeenCalledWith('Thuoc');
    });
  });
});
