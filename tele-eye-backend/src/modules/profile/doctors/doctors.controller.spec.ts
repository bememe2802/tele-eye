import { Test } from '@nestjs/testing';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';

describe('DoctorsController', () => {
  let controller: DoctorsController;
  let doctorsService: {
    createDoctor: jest.Mock;
    findAll: jest.Mock;
    selfUpdate: jest.Mock;
    adminUpdate: jest.Mock;
  };

  const mockReq = (userId: number) => ({ user: { userId } });

  beforeEach(async () => {
    doctorsService = {
      createDoctor: jest.fn(),
      findAll: jest.fn(),
      selfUpdate: jest.fn(),
      adminUpdate: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [DoctorsController],
      providers: [{ provide: DoctorsService, useValue: doctorsService }],
    }).compile();

    controller = moduleRef.get(DoctorsController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('delegates dto to doctorsService.createDoctor', async () => {
      const dto = { email: 'bs@tele-eye.vn', password: 'pass', fullName: 'BS A' };
      doctorsService.createDoctor.mockResolvedValue({ doctor_id: 1 });

      await expect(controller.create(dto as any)).resolves.toEqual({ doctor_id: 1 });
      expect(doctorsService.createDoctor).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('returns the doctor list from doctorsService', async () => {
      const list = [{ doctor_id: 1 }, { doctor_id: 2 }];
      doctorsService.findAll.mockResolvedValue(list);

      await expect(controller.findAll()).resolves.toEqual(list);
    });
  });

  describe('updateMe', () => {
    it('passes userId and dto to doctorsService.selfUpdate', async () => {
      const dto = { bio: 'Chuyên khoa mắt' };
      doctorsService.selfUpdate.mockResolvedValue({ updated: true });

      await expect(
        controller.updateMe(mockReq(10) as any, dto as any),
      ).resolves.toEqual({ updated: true });

      expect(doctorsService.selfUpdate).toHaveBeenCalledWith(10, dto);
    });
  });

  describe('updateByAdmin', () => {
    it('converts id string to number and delegates to doctorsService.adminUpdate', async () => {
      const dto = { fee: 200000 };
      doctorsService.adminUpdate.mockResolvedValue({ updated: true });

      await expect(controller.updateByAdmin('5', dto as any)).resolves.toEqual({
        updated: true,
      });

      expect(doctorsService.adminUpdate).toHaveBeenCalledWith(5, dto);
    });
  });
});
