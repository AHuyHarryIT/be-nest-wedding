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

  const transactionMock = {
    staff: {
      update: jest.fn(),
    },
    authSession: {
      updateMany: jest.fn(),
    },
  };

  const databaseServiceMock = {
    job: {
      findFirst: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
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
    $transaction: jest.fn(async (callback: any) => callback(transactionMock)),
  } as any;

  const configServiceMock = {
    get: jest.fn().mockReturnValue(10),
  } as unknown as ConfigService;

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    databaseServiceMock.role.findMany.mockReset();
    databaseServiceMock.role.findUnique.mockReset();
    databaseServiceMock.job.findFirst.mockReset();
    databaseServiceMock.staff.create.mockReset();
    databaseServiceMock.staff.findMany.mockReset();
    databaseServiceMock.staff.findUnique.mockReset();
    databaseServiceMock.staff.count.mockReset();
    databaseServiceMock.staff.update.mockReset();
    databaseServiceMock.staff.delete.mockReset();
    databaseServiceMock.staffRole.createMany.mockReset();
    databaseServiceMock.staffRole.deleteMany.mockReset();
    databaseServiceMock.$transaction.mockClear();
    transactionMock.staff.update.mockReset();
    transactionMock.authSession.updateMany.mockReset();
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
    databaseServiceMock.job.findFirst
      .mockResolvedValueOnce({ id: 'job-1' })
      .mockResolvedValueOnce({ id: 'job-2' });
    databaseServiceMock.staff.findUnique.mockResolvedValueOnce(null);
    databaseServiceMock.staff.create.mockResolvedValue({
      id: 'STF-001',
      phoneNumber: '0903311101',
      firstName: 'Nguyen',
      lastName: 'An',
      email: 'staff@example.com',
      staffJobs: [
        {
          job: {
            id: 'job-1',
            name: 'Lead Photographer',
            description: 'Primary photography lead',
            isActive: true,
          },
        },
        {
          job: {
            id: 'job-2',
            name: 'Assistant Photographer',
            description: 'Assists with coverage',
            isActive: true,
          },
        },
      ],
      jobIds: ['job-1', 'job-2'],
      jobs: [
        {
          id: 'job-1',
          name: 'Lead Photographer',
          description: 'Primary photography lead',
          isActive: true,
        },
        {
          id: 'job-2',
          name: 'Assistant Photographer',
          description: 'Assists with coverage',
          isActive: true,
        },
      ],
      jobId: 'job-1',
      job: {
        id: 'job-1',
        name: 'Lead Photographer',
        description: 'Primary photography lead',
        isActive: true,
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      roles: [],
    });

    const result = await service.create({
      id: 'STF-001',
      phoneNumber: '+84903311101',
      password: 'SecurePass123',
      firstName: 'Nguyen',
      lastName: 'An',
      email: 'staff@example.com',
      jobIds: ['job-1', 'job-2'],
      roleIds: ['role-1'],
    });

    expect(databaseServiceMock.staff.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'STF-001',
        phoneNumber: '0903311101',
        passwordHash: 'hashed-password',
        staffJobs: {
          create: [
            {
              job: {
                connect: { id: 'job-1' },
              },
            },
            {
              job: {
                connect: { id: 'job-2' },
              },
            },
          ],
        },
      }),
      include: expect.any(Object),
    });
    expect(authIdentityServiceMock.assertStaffIdAvailable).toHaveBeenCalledWith(
      'STF-001',
    );
    expect(result.id).toBe('STF-001');
    expect(result.jobIds).toEqual(['job-1', 'job-2']);
    expect(result.jobs).toHaveLength(2);
    expect(result.job?.name).toBe('Lead Photographer');
  });

  it('creates a staff account with a managed job', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    authIdentityServiceMock.assertPhoneNumberAvailable.mockResolvedValue(
      undefined,
    );
    authIdentityServiceMock.assertEmailAvailable.mockResolvedValue(undefined);
    authIdentityServiceMock.assertStaffIdAvailable.mockResolvedValue(undefined);
    databaseServiceMock.role.findUnique.mockResolvedValue({
      id: 'role-staff',
      name: 'staff',
    });
    databaseServiceMock.job.findFirst.mockResolvedValue({
      id: 'job-1',
    });
    databaseServiceMock.staff.findUnique.mockResolvedValueOnce(null);
    databaseServiceMock.staff.create.mockResolvedValue({
      id: 'STF-002',
      phoneNumber: '0903311102',
      firstName: 'Tran',
      lastName: 'Binh',
      email: 'staff2@example.com',
      staffJobs: [
        {
          job: {
            id: 'job-1',
            name: 'Lead Photographer',
            description: 'Primary photography lead',
            isActive: true,
          },
        },
      ],
      jobIds: ['job-1'],
      jobs: [
        {
          id: 'job-1',
          name: 'Lead Photographer',
          description: 'Primary photography lead',
          isActive: true,
        },
      ],
      jobId: 'job-1',
      job: {
        id: 'job-1',
        name: 'Lead Photographer',
        description: 'Primary photography lead',
        isActive: true,
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      roles: [],
    });

    const result = await service.create({
      id: 'STF-002',
      phoneNumber: '0903311102',
      password: 'SecurePass123',
      firstName: 'Tran',
      lastName: 'Binh',
      email: 'staff2@example.com',
      jobIds: ['job-1'],
    });

    expect(databaseServiceMock.job.findFirst).toHaveBeenCalledWith({
      where: { id: 'job-1', deletedAt: null, isActive: true },
      select: { id: true },
    });
    expect(databaseServiceMock.role.findUnique).not.toHaveBeenCalled();
    expect(result.jobIds).toEqual(['job-1']);
    expect(result.job?.id).toBe('job-1');
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
      roles: [],
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

  it('updates staff managed job', async () => {
    databaseServiceMock.staff.findUnique.mockResolvedValueOnce({
      id: 'STF-001',
      email: 'staff@example.com',
    });
    databaseServiceMock.job.findFirst
      .mockResolvedValueOnce({ id: 'job-2' })
      .mockResolvedValueOnce({ id: 'job-3' });
    databaseServiceMock.staff.update.mockResolvedValue({
      id: 'STF-001',
      phoneNumber: '0903311101',
      firstName: 'Nguyen',
      lastName: 'An',
      email: 'staff@example.com',
      staffJobs: [
        {
          job: {
            id: 'job-2',
            name: 'Event Coordinator',
            description: 'Handles coordination',
            isActive: true,
          },
        },
        {
          job: {
            id: 'job-3',
            name: 'Backup Coordinator',
            description: 'Backup role',
            isActive: true,
          },
        },
      ],
      jobIds: ['job-2', 'job-3'],
      jobs: [
        {
          id: 'job-2',
          name: 'Event Coordinator',
          description: 'Handles coordination',
          isActive: true,
        },
        {
          id: 'job-3',
          name: 'Backup Coordinator',
          description: 'Backup role',
          isActive: true,
        },
      ],
      jobId: 'job-2',
      job: {
        id: 'job-2',
        name: 'Event Coordinator',
        description: 'Handles coordination',
        isActive: true,
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      roles: [],
    });

    const result = await service.update('STF-001', {
      jobIds: ['job-2', 'job-3'],
    });

    expect(databaseServiceMock.job.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'job-2', deletedAt: null, isActive: true },
      select: { id: true },
    });
    expect(databaseServiceMock.job.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 'job-3', deletedAt: null, isActive: true },
      select: { id: true },
    });
    expect(databaseServiceMock.staff.update).toHaveBeenCalledWith({
      where: { id: 'STF-001' },
      data: {
        staffJobs: {
          deleteMany: {},
          create: [
            {
              job: {
                connect: { id: 'job-2' },
              },
            },
            {
              job: {
                connect: { id: 'job-3' },
              },
            },
          ],
        },
      },
      select: expect.objectContaining({
        staffJobs: expect.any(Object),
      }),
    });
    expect(result.jobIds).toEqual(['job-2', 'job-3']);
    expect(result.jobs[0]?.name).toBe('Event Coordinator');
  });

  it('returns managed job data in staff list searches', async () => {
    databaseServiceMock.staff.count.mockResolvedValue(1);
    databaseServiceMock.staff.findMany.mockResolvedValue([
      {
        id: 'STF-001',
        phoneNumber: '0903311101',
        firstName: 'Nguyen',
        lastName: 'An',
        email: 'staff@example.com',
        staffJobs: [
          {
            job: {
              id: 'job-1',
              name: 'Lead Photographer',
              description: 'Primary photography lead',
              isActive: true,
            },
          },
          {
            job: {
              id: 'job-2',
              name: 'Assistant Photographer',
              description: 'Supports coverage',
              isActive: true,
            },
          },
        ],
        jobIds: ['job-1', 'job-2'],
        jobs: [
          {
            id: 'job-1',
            name: 'Lead Photographer',
            description: 'Primary photography lead',
            isActive: true,
          },
          {
            id: 'job-2',
            name: 'Assistant Photographer',
            description: 'Supports coverage',
            isActive: true,
          },
        ],
        jobId: 'job-1',
        job: {
          id: 'job-1',
          name: 'Lead Photographer',
          description: 'Primary photography lead',
          isActive: true,
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        roles: [
          {
            role: {
              id: 'role-1',
              name: 'staff',
              description: 'Staff role',
            },
          },
        ],
      },
    ]);

    const result = await service.findAll({
      page: 1,
      limit: 10,
      search: 'Lead',
    });

    expect(databaseServiceMock.staff.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.any(Object),
            expect.any(Object),
            expect.any(Object),
            expect.any(Object),
            expect.any(Object),
            expect.objectContaining({
              staffJobs: {
                some: {
                  job: {
                    is: {
                      name: {
                        contains: 'Lead',
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              },
            }),
          ]),
        }),
      }),
    );

    expect(result.data[0].jobIds).toEqual(['job-1', 'job-2']);
    expect(result.data[0].jobs[0]?.name).toBe('Lead Photographer');
  });

  it('includes staff core fields in public staff lookups', async () => {
    databaseServiceMock.staff.findUnique
      .mockResolvedValueOnce({
        id: 'STF-001',
        phoneNumber: '0903311101',
        firstName: 'Nguyen',
        lastName: 'An',
        email: 'staff@example.com',
        staffJobs: [
          {
            job: {
              id: 'job-1',
              name: 'Lead Photographer',
              description: 'Primary photography lead',
              isActive: true,
            },
          },
          {
            job: {
              id: 'job-2',
              name: 'Assistant Photographer',
              description: 'Supports coverage',
              isActive: true,
            },
          },
        ],
        jobIds: ['job-1', 'job-2'],
        jobs: [
          {
            id: 'job-1',
            name: 'Lead Photographer',
            description: 'Primary photography lead',
            isActive: true,
          },
          {
            id: 'job-2',
            name: 'Assistant Photographer',
            description: 'Supports coverage',
            isActive: true,
          },
        ],
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
        staffJobs: [
          {
            job: {
              id: 'job-1',
              name: 'Lead Photographer',
              description: 'Primary photography lead',
              isActive: true,
            },
          },
          {
            job: {
              id: 'job-2',
              name: 'Assistant Photographer',
              description: 'Supports coverage',
              isActive: true,
            },
          },
        ],
        jobIds: ['job-1', 'job-2'],
        jobs: [
          {
            id: 'job-1',
            name: 'Lead Photographer',
            description: 'Primary photography lead',
            isActive: true,
          },
          {
            id: 'job-2',
            name: 'Assistant Photographer',
            description: 'Supports coverage',
            isActive: true,
          },
        ],
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
    expect(byPhone?.jobIds).toEqual(['job-1', 'job-2']);
    expect(byId?.jobs?.[0]?.name).toBe('Lead Photographer');
  });

  it('resets staff password and revokes active sessions', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-password');
    databaseServiceMock.staff.findUnique.mockResolvedValueOnce({ id: 'STF-001' });
    transactionMock.staff.update.mockResolvedValue({ id: 'STF-001' });
    transactionMock.authSession.updateMany.mockResolvedValue({ count: 2 });

    const result = await service.resetPassword('STF-001', {
      newPassword: 'NewPassword123',
      confirmPassword: 'NewPassword123',
    });

    expect(databaseServiceMock.$transaction).toHaveBeenCalledTimes(1);
    expect(transactionMock.staff.update).toHaveBeenCalledWith({
      where: { id: 'STF-001' },
      data: {
        passwordHash: 'hashed-new-password',
        refreshToken: null,
        refreshTokenExpiry: null,
      },
    });
    expect(transactionMock.authSession.updateMany).toHaveBeenCalledWith({
      where: {
        staffId: 'STF-001',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      message: 'Staff password reset successfully',
    });
  });

  it('throws when resetting password for missing staff', async () => {
    databaseServiceMock.staff.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.resetPassword('STF-404', {
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      }),
    ).rejects.toThrow('User with ID "STF-404" not found');

    expect(databaseServiceMock.$transaction).not.toHaveBeenCalled();
  });
});
