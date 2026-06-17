import 'reflect-metadata';
import { UserRole } from '@prisma/client';
import { ROLES_KEY, Roles } from './roles.decorator';

describe('Roles decorator', () => {
  it('stores required roles metadata', () => {
    class TestController {
      test() {}
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      TestController.prototype,
      'test',
    )!;

    Roles(UserRole.ADMIN, UserRole.DOCTOR)(
      TestController.prototype,
      'test',
      descriptor,
    );

    expect(
      Reflect.getMetadata(ROLES_KEY, TestController.prototype.test),
    ).toEqual([UserRole.ADMIN, UserRole.DOCTOR]);
  });
});
