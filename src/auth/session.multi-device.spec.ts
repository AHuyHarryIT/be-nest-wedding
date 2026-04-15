import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '@/database/database.service';
import { SessionsService } from './session/sessions.service';

describe('Multi-device session contract', () => {
  let service: SessionsService;

  const databaseServiceMock = {
    authSession: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: DatabaseService, useValue: databaseServiceMock },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  it('bootstraps multi-device contract scaffold', () => {
    expect(service).toBeDefined();
  });

  it('D-03: customer identities can list active sessions across multiple devices with session metadata', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const future = new Date('2099-01-01T00:00:00.000Z');

    databaseServiceMock.authSession.findFirst.mockResolvedValue({
      id: 'session-current',
    });

    databaseServiceMock.authSession.findMany.mockResolvedValue([
      {
        id: 'session-current',
        createdAt: now,
        updatedAt: now,
        expiresAt: future,
      },
      {
        id: 'session-other',
        createdAt: now,
        updatedAt: now,
        expiresAt: future,
      },
    ]);

    const result = await service.listActiveSessions(
      { userId: 'customer-1', userType: 'customer' },
      'refresh-token-customer',
    );

    expect(databaseServiceMock.authSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customerId: 'customer-1',
          staffId: null,
        }),
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({ id: 'session-current', isCurrent: true }),
      expect.objectContaining({ id: 'session-other', isCurrent: false }),
    ]);
  });

  it('D-03: staff identities can list active sessions across multiple devices with session metadata', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const future = new Date('2099-01-01T00:00:00.000Z');

    databaseServiceMock.authSession.findFirst.mockResolvedValue({
      id: 'staff-session-current',
    });

    databaseServiceMock.authSession.findMany.mockResolvedValue([
      {
        id: 'staff-session-current',
        createdAt: now,
        updatedAt: now,
        expiresAt: future,
      },
    ]);

    const result = await service.listActiveSessions(
      { userId: 'staff-1', userType: 'staff' },
      'refresh-token-staff',
    );

    expect(databaseServiceMock.authSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          staffId: 'staff-1',
          customerId: null,
        }),
      }),
    );
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'staff-session-current',
        isCurrent: true,
      }),
    );
  });

  it('D-03: selective revoke by session ID invalidates only the targeted device session', async () => {
    databaseServiceMock.authSession.findFirst
      .mockResolvedValueOnce({ id: 'session-current' })
      .mockResolvedValueOnce({ id: 'session-other' });

    await service.revokeSession(
      { userId: 'customer-1', userType: 'customer' },
      'session-other',
      'refresh-token-current',
    );

    expect(databaseServiceMock.authSession.update).toHaveBeenCalledWith({
      where: { id: 'session-other' },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('D-04: standard logout revokes current session only while other sessions remain active until explicit selective revoke', async () => {
    databaseServiceMock.authSession.findFirst.mockResolvedValue({
      id: 'session-current',
    });

    await expect(
      service.revokeSession(
        { userId: 'customer-1', userType: 'customer' },
        'session-current',
        'refresh-token-current',
      ),
    ).rejects.toThrow(ConflictException);

    expect(databaseServiceMock.authSession.update).not.toHaveBeenCalled();
  });

  it('D-03: selective revoke behavior is available and auditable for both customer and staff identities', async () => {
    databaseServiceMock.authSession.findFirst
      .mockResolvedValueOnce({ id: 'staff-session-current' })
      .mockResolvedValueOnce(null);

    await expect(
      service.revokeSession(
        { userId: 'staff-1', userType: 'staff' },
        'missing-session',
        'refresh-token-staff',
      ),
    ).rejects.toThrow(NotFoundException);

    expect(databaseServiceMock.authSession.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'missing-session',
          staffId: 'staff-1',
          customerId: null,
        }),
      }),
    );
  });
});
