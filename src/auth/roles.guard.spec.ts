import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

const createContext = (user?: { role?: UserRole }): ExecutionContext => {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
};

describe('RolesGuard', () => {
  const reflectorMock = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const guard = new RolesGuard(reflectorMock);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('allows access when no roles metadata is set', () => {
    (reflectorMock.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    expect(guard.canActivate(createContext({ role: UserRole.CUSTOMER }))).toBe(true);
  });

  it('allows access when user role matches required roles', () => {
    (reflectorMock.getAllAndOverride as jest.Mock).mockReturnValue([
      UserRole.ADMIN,
      UserRole.CUSTOMER,
    ]);

    expect(guard.canActivate(createContext({ role: UserRole.ADMIN }))).toBe(true);
  });

  it('throws when user role is missing or does not match', () => {
    (reflectorMock.getAllAndOverride as jest.Mock).mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(createContext({ role: UserRole.CUSTOMER }))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
  });
});
