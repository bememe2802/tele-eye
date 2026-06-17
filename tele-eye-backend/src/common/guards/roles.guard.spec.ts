import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  const createContext = (role?: string) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role },
        }),
      }),
    }) as any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  describe('canActivate', () => {
    it('allows access when no roles are required', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      expect(guard.canActivate(createContext())).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalled();
    });

    it('allows access when the user has a required role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      expect(guard.canActivate(createContext(UserRole.ADMIN))).toBe(true);
    });

    it('throws when the user lacks the required role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      expect(() => guard.canActivate(createContext(UserRole.DOCTOR))).toThrow(
        ForbiddenException,
      );
    });
  });
});
