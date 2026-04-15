import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { DatabaseService } from '../../database/database.service';

describe('PermissionsGuard contract', () => {
  const reflectorMock = {
    getAllAndOverride: jest.fn(),
  };

  const databaseServiceMock = {
    staffRole: {
      findMany: jest.fn(),
    },
  };

  const makeExecutionContext = (user?: {
    userId?: string;
    userType?: 'customer' | 'staff';
  }) => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as any;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows access when no permissions are required by backend metadata (D-10)', async () => {
    const guard = new PermissionsGuard(
      reflectorMock as unknown as Reflector,
      databaseServiceMock as unknown as DatabaseService,
    );

    reflectorMock.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(makeExecutionContext())).resolves.toBe(true);
  });

  it('enforces backend source-of-truth and rejects unauthenticated users (D-10)', async () => {
    const guard = new PermissionsGuard(
      reflectorMock as unknown as Reflector,
      databaseServiceMock as unknown as DatabaseService,
    );

    reflectorMock.getAllAndOverride.mockReturnValue(['roles:create']);

    await expect(guard.canActivate(makeExecutionContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('enforces action-level permission keys such as roles:create (D-12)', async () => {
    const guard = new PermissionsGuard(
      reflectorMock as unknown as Reflector,
      databaseServiceMock as unknown as DatabaseService,
    );

    reflectorMock.getAllAndOverride.mockReturnValue(['roles:create']);
    databaseServiceMock.staffRole.findMany.mockResolvedValue([
      {
        role: {
          permissions: [
            {
              permission: {
                key: 'roles:create',
              },
            },
          ],
        },
      },
    ]);

    await expect(
      guard.canActivate(
        makeExecutionContext({ userId: 'staff-1', userType: 'staff' }),
      ),
    ).resolves.toBe(true);
  });

  it('denies staff users without required action keys (D-12)', async () => {
    const guard = new PermissionsGuard(
      reflectorMock as unknown as Reflector,
      databaseServiceMock as unknown as DatabaseService,
    );

    reflectorMock.getAllAndOverride.mockReturnValue(['roles:create']);
    databaseServiceMock.staffRole.findMany.mockResolvedValue([
      {
        role: {
          permissions: [],
        },
      },
    ]);

    await expect(
      guard.canActivate(
        makeExecutionContext({ userId: 'staff-1', userType: 'staff' }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('D-11: 403 payload details include requiredPermissions and missingPermissions for consistent frontend denial context', async () => {
    const guard = new PermissionsGuard(
      reflectorMock as unknown as Reflector,
      databaseServiceMock as unknown as DatabaseService,
    );

    reflectorMock.getAllAndOverride.mockReturnValue([
      'sessions:read',
      'sessions:revoke',
    ]);
    databaseServiceMock.staffRole.findMany.mockResolvedValue([
      {
        role: {
          permissions: [
            {
              permission: {
                key: 'sessions:read',
              },
            },
          ],
        },
      },
    ]);

    await expect(
      guard.canActivate(
        makeExecutionContext({ userId: 'staff-1', userType: 'staff' }),
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Missing required permissions',
        details: {
          requiredPermissions: ['sessions:read', 'sessions:revoke'],
          missingPermissions: ['sessions:revoke'],
        },
      }),
    });
  });

  it('D-11: requiredPermissions and missingPermissions are surfaced in a stable details contract from backend authorization failures', async () => {
    const guard = new PermissionsGuard(
      reflectorMock as unknown as Reflector,
      databaseServiceMock as unknown as DatabaseService,
    );

    reflectorMock.getAllAndOverride.mockReturnValue(['roles:delete']);
    databaseServiceMock.staffRole.findMany.mockResolvedValue([]);

    try {
      await guard.canActivate(
        makeExecutionContext({ userId: 'staff-99', userType: 'staff' }),
      );
      fail('Expected ForbiddenException');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.getResponse()).toEqual(
        expect.objectContaining({
          details: {
            requiredPermissions: ['roles:delete'],
            missingPermissions: ['roles:delete'],
          },
        }),
      );
    }
  });
});
