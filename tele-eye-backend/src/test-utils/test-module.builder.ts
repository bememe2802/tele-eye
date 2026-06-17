import { Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/database/prisma.service';
import { createPrismaMock } from './prisma.mock';

export interface ExtraProvider {
  provide: any;
  useValue: any;
}

/**
 * Tạo TestingModule nhanh cho một Service cần PrismaService.
 *
 * Ví dụ:
 *   const { module, prisma } = await buildServiceModule(DrugService);
 *   service = module.get(DrugService);
 */
export async function buildServiceModule<T>(
  serviceClass: Type<T>,
  extraProviders: ExtraProvider[] = [],
): Promise<{ module: TestingModule; prisma: ReturnType<typeof createPrismaMock> }> {
  const prisma = createPrismaMock();

  const module = await Test.createTestingModule({
    providers: [
      serviceClass,
      { provide: PrismaService, useValue: prisma },
      ...extraProviders,
    ],
  }).compile();

  return { module, prisma };
}

/**
 * Tạo TestingModule cho Controller — không inject PrismaService trực tiếp,
 * chỉ cần mock các service phụ thuộc.
 *
 * Ví dụ:
 *   const { module } = await buildControllerModule(AuthController, [
 *     { provide: AuthService, useValue: authServiceMock },
 *   ]);
 */
export async function buildControllerModule<T>(
  controllerClass: Type<T>,
  providers: ExtraProvider[],
): Promise<{ module: TestingModule }> {
  const module = await Test.createTestingModule({
    controllers: [controllerClass],
    providers,
  }).compile();

  return { module };
}
