import { Test } from '@nestjs/testing';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

describe('PatientsController', () => {
  let controller: PatientsController;
  let patientsService: {
    getMyProfile: jest.Mock;
    updateMyProfile: jest.Mock;
  };

  const mockReq = (userId: number) => ({ user: { userId } });

  beforeEach(async () => {
    patientsService = {
      getMyProfile: jest.fn(),
      updateMyProfile: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PatientsController],
      providers: [{ provide: PatientsService, useValue: patientsService }],
    }).compile();

    controller = moduleRef.get(PatientsController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getProfile', () => {
    it('passes userId from request to patientsService.getMyProfile', async () => {
      const profile = { patient_id: 3, full_name: 'BN A' };
      patientsService.getMyProfile.mockResolvedValue(profile);

      await expect(controller.getProfile(mockReq(5) as any)).resolves.toEqual(profile);
      expect(patientsService.getMyProfile).toHaveBeenCalledWith(5);
    });
  });

  describe('updateProfile', () => {
    it('passes userId and dto to patientsService.updateMyProfile', async () => {
      const dto = { full_name: 'BN B', phone: '0909090909' };
      patientsService.updateMyProfile.mockResolvedValue({ updated: true });

      await expect(
        controller.updateProfile(mockReq(5) as any, dto as any),
      ).resolves.toEqual({ updated: true });

      expect(patientsService.updateMyProfile).toHaveBeenCalledWith(5, dto);
    });
  });
});
