import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  const authIdentityServiceMock = {
    assertPhoneNumberAvailable: jest.fn(),
    assertEmailAvailable: jest.fn(),
    assertStaffIdAvailable: jest.fn(),
  };

  const databaseServiceMock = {
    role: {
      findMany: jest.fn(),
    },
    staff: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    staffRole: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  } as any;

  const configServiceMock = {
    get: jest.fn().mockReturnValue(10),
  } as unknown as ConfigService;

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    databaseServiceMock.role.findMany.mockReset();
    databaseServiceMock.staff.create.mockReset();
    databaseServiceMock.staff.findMany.mockReset();
    databaseServiceMock.staff.findUnique.mockReset();
    databaseServiceMock.staff.count.mockReset();
    databaseServiceMock.staff.update.mockReset();
    databaseServiceMock.staff.delete.mockReset();
    databaseServiceMock.staffRole.createMany.mockReset();
    databaseServiceMock.staffRole.deleteMany.mockReset();
    service = new UsersService(
      databaseServiceMock,
      configServiceMock,
      authIdentityServiceMock as any,
    );
  });

  it('creates a staff account with a staff ID', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    authIdentityServiceMock.assertPhoneNumberAvailable.mockResolvedValue(
      undefined,
    );
    authIdentityServiceMock.assertEmailAvailable.mockResolvedValue(undefined);
    authIdentityServiceMock.assertStaffIdAvailable.mockResolvedValue(undefined);
    databaseServiceMock.role.findMany.mockResolvedValue([
      { id: 'role-1', name: 'staff' },
    ]);
    databaseServiceMock.staff.findUnique.mockResolvedValueOnce(null);
    databaseServiceMock.staff.create.mockResolvedValue({
      id: 'STF-001',
      phoneNumber: '0903311101',
      firstName: 'Nguyen',
      lastName: 'An',
      email: 'staff@example.com',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      roles: [],
    });

    const result = await service.create({
      id: 'STF-001',
      phoneNumber: '0903311101',
      password: 'SecurePass123',
      firstName: 'Nguyen',
      lastName: 'An',
      email: 'staff@example.com',
      roleIds: ['role-1'],
    });

    expect(databaseServiceMock.staff.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'STF-001',
        phoneNumber: '0903311101',
        passwordHash: 'hashed-password',
      }),
      include: expect.any(Object),
    });
    expect(authIdentityServiceMock.assertStaffIdAvailable).toHaveBeenCalledWith(
      'STF-001',
    );
    expect(result.id).toBe('STF-001');
  });

  it('updates staff ID', async () => {
    databaseServiceMock.staff.findUnique.mockResolvedValueOnce({
      id: 'STF-001',
      email: 'staff@example.com',
    });
    authIdentityServiceMock.assertStaffIdAvailable.mockResolvedValue(undefined);
    databaseServiceMock.staff.update.mockResolvedValue({
      id: 'STF-002',
      phoneNumber: '0903311101',
      firstName: 'Nguyen',
      lastName: 'An',
      email: 'staff@example.com',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.update('STF-001', {
      id: 'STF-002',
    });

    expect(databaseServiceMock.staff.update).toHaveBeenCalledWith({
      where: { id: 'STF-001' },
      data: {
        id: 'STF-002',
      },
      select: expect.objectContaining({
        email: true,
        isActive: true,
      }),
    });
    expect(authIdentityServiceMock.assertStaffIdAvailable).toHaveBeenCalledWith(
      'STF-002',
      'STF-001',
    );
    expect(result.id).toBe('STF-002');
  });

  it('includes staff core fields in public staff lookups', async () => {
    databaseServiceMock.staff.findUnique
      .mockResolvedValueOnce({
        id: 'STF-001',
        phoneNumber: '0903311101',
        firstName: 'Nguyen',
        lastName: 'An',
        email: 'staff@example.com',
        refreshToken: null,
        isActive: true,
        createdAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 'STF-001',
        phoneNumber: '0903311101',
        firstName: 'Nguyen',
        lastName: 'An',
        email: 'staff@example.com',
        refreshToken: null,
        isActive: true,
        createdAt: new Date(),
      });

    const byPhone = await service.findByPhoneNumber('0903311101');
    const byId = await service.findById('STF-001');

    expect(byPhone?.id).toBe('STF-001');
    expect(byId?.id).toBe('STF-001');
    expect(byPhone?.email).toBe('staff@example.com');
    expect(byId?.email).toBe('staff@example.com');
  });
});
