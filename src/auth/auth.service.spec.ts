import { UnauthorizedException } from '@nestjs/common';
import { ConflictException } from '@/common/exceptions/app.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthIdentityService } from './auth-identity.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  const databaseServiceMock = {
    customer: {
      create: jest.fn(),
      update: jest.fn(),
    },
    staff: {
      update: jest.fn(),
    },
  };
  const authIdentityServiceMock = {
    assertPhoneNumberAvailable: jest.fn(),
    assertEmailAvailable: jest.fn(),
    updateRefreshToken: jest.fn(),
    findByPhoneNumber: jest.fn(),
    findById: jest.fn(),
    findByRefreshToken: jest.fn(),
    findAuthSessionByRefreshToken: jest.fn(),
    revokeAuthSessionByRefreshToken: jest.fn(),
  };
  const jwtServiceMock = {
    signAsync: jest.fn(),
  };
  const configServiceMock = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: databaseServiceMock },
        { provide: AuthIdentityService, useValue: authIdentityServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('assigns the customer role when registering a new user', async () => {
    authIdentityServiceMock.assertPhoneNumberAvailable.mockResolvedValue(
      undefined,
    );
    authIdentityServiceMock.assertEmailAvailable.mockResolvedValue(undefined);
    databaseServiceMock.customer.create.mockResolvedValue({
      id: 'user-id',
      phoneNumber: '+84981234567',
      passwordHash: 'hashed-password',
      firstName: 'Task',
      lastName: 'Runner',
      email: 'task.runner@example.com',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });
    authIdentityServiceMock.updateRefreshToken.mockResolvedValue(undefined);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    jwtServiceMock.signAsync.mockResolvedValue('access-token');

    const result = await service.register({
      phoneNumber: '+84981234567',
      password: 'password123',
      firstName: 'Task',
      lastName: 'Runner',
      email: 'task.runner@example.com',
    });

    expect(
      authIdentityServiceMock.assertPhoneNumberAvailable,
    ).toHaveBeenCalledWith('0981234567');
    expect(databaseServiceMock.customer.create).toHaveBeenCalledWith({
      data: {
        phoneNumber: '0981234567',
        passwordHash: 'hashed-password',
        firstName: 'Task',
        lastName: 'Runner',
        email: 'task.runner@example.com',
        isActive: true,
      },
    });
    expect(authIdentityServiceMock.updateRefreshToken).toHaveBeenCalled();
    expect(result.message).toContain('registered successfully');
  });

  it('normalizes phone number before login lookup', async () => {
    authIdentityServiceMock.findByPhoneNumber.mockResolvedValue({
      id: 'staff-1',
      userType: 'staff',
      phoneNumber: '0987654321',
      passwordHash: 'hashed-password',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    authIdentityServiceMock.updateRefreshToken.mockResolvedValue(undefined);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue('access-token');

    await service.login({
      phoneNumber: '+84987654321',
      password: '123456',
    });

    expect(authIdentityServiceMock.findByPhoneNumber).toHaveBeenCalledWith(
      '0987654321',
    );
  });

  it('D-01: keeps refresh token stable while rotating access token during refresh', async () => {
    const stableRefreshToken = ' stable-refresh-token ';

    authIdentityServiceMock.findAuthSessionByRefreshToken.mockResolvedValue({
      id: 'session-1',
      tokenHash: 'hashed-token',
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      revokedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      identity: {
        userType: 'customer',
        userId: 'customer-1',
        isActive: true,
      },
    });

    authIdentityServiceMock.findById.mockResolvedValue({
      id: 'customer-1',
      userType: 'customer',
      phoneNumber: '0903319999',
      passwordHash: 'hashed-password',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    jwtServiceMock.signAsync.mockResolvedValue('new-access-token');

    const result = await service.refreshTokens({
      refreshToken: stableRefreshToken,
    });

    expect(
      authIdentityServiceMock.findAuthSessionByRefreshToken,
    ).toHaveBeenCalledWith(stableRefreshToken);
    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: stableRefreshToken.trim(),
    });
    expect(authIdentityServiceMock.updateRefreshToken).not.toHaveBeenCalled();
  });

  it('D-02: throws Unauthorized when refresh session is invalid or expired', async () => {
    authIdentityServiceMock.findAuthSessionByRefreshToken.mockResolvedValue(
      null,
    );

    await expect(
      service.refreshTokens({ refreshToken: 'expired-token' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(authIdentityServiceMock.findByRefreshToken).not.toHaveBeenCalled();
  });

  it('changes password for staff user when current password is correct', async () => {
    authIdentityServiceMock.findById.mockResolvedValue({
      id: 'staff-1',
      userType: 'staff',
      phoneNumber: '0987654321',
      passwordHash: 'old-password-hash',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-password-hash');
    databaseServiceMock.staff.update.mockResolvedValue({ id: 'staff-1' });

    const result = await service.changePassword(
      'staff-1',
      {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      },
      'staff',
    );

    expect(authIdentityServiceMock.findById).toHaveBeenCalledWith(
      'staff',
      'staff-1',
    );
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'old-password',
      'old-password-hash',
    );
    expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 10);
    expect(databaseServiceMock.staff.update).toHaveBeenCalledWith({
      where: { id: 'staff-1' },
      data: { passwordHash: 'new-password-hash' },
    });
    expect(result).toEqual({ message: 'Password changed successfully' });
  });

  it('throws UnauthorizedException when current password is incorrect', async () => {
    authIdentityServiceMock.findById.mockResolvedValue({
      id: 'staff-1',
      userType: 'staff',
      phoneNumber: '0987654321',
      passwordHash: 'old-password-hash',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.changePassword(
        'staff-1',
        {
          currentPassword: 'wrong-password',
          newPassword: 'new-password',
        },
        'staff',
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(databaseServiceMock.staff.update).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when user is not found for changePassword', async () => {
    authIdentityServiceMock.findById.mockResolvedValue(null);

    await expect(
      service.changePassword(
        'staff-404',
        {
          currentPassword: 'old-password',
          newPassword: 'new-password',
        },
        'staff',
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(databaseServiceMock.staff.update).not.toHaveBeenCalled();
  });

  it('updateProfile normalizes phone and persists normalized value for customer updates', async () => {
    authIdentityServiceMock.findById.mockResolvedValue({
      id: 'customer-1',
      userType: 'customer',
      phoneNumber: '0911222333',
      passwordHash: 'hashed-password',
      firstName: 'Old',
      lastName: 'Name',
      email: 'old@example.com',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    authIdentityServiceMock.assertPhoneNumberAvailable.mockResolvedValue(
      undefined,
    );

    databaseServiceMock.customer.update.mockResolvedValue({
      id: 'customer-1',
      phoneNumber: '0981234567',
      passwordHash: 'hashed-password',
      firstName: 'New',
      lastName: 'Name',
      email: 'new@example.com',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await service.updateProfile(
      'customer-1',
      {
        firstName: 'New',
        lastName: 'Name',
        email: 'new@example.com',
        phoneNumber: '+84981234567',
      },
      'customer',
    );

    expect(
      authIdentityServiceMock.assertPhoneNumberAvailable,
    ).toHaveBeenCalledWith('0981234567');
    expect(databaseServiceMock.customer.update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: {
        firstName: 'New',
        lastName: 'Name',
        email: 'new@example.com',
        phoneNumber: '0981234567',
      },
    });
  });

  it('updateProfile skips availability assertions when email and phone are unchanged', async () => {
    authIdentityServiceMock.findById.mockResolvedValue({
      id: 'customer-1',
      userType: 'customer',
      phoneNumber: '0981234567',
      passwordHash: 'hashed-password',
      firstName: 'Old',
      lastName: 'Name',
      email: 'same@example.com',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    databaseServiceMock.customer.update.mockResolvedValue({
      id: 'customer-1',
      phoneNumber: '0981234567',
      passwordHash: 'hashed-password',
      firstName: 'Old',
      lastName: 'Name',
      email: 'same@example.com',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await service.updateProfile(
      'customer-1',
      {
        firstName: 'Old',
        lastName: 'Name',
        email: 'same@example.com',
        phoneNumber: '+84981234567',
      },
      'customer',
    );

    expect(authIdentityServiceMock.assertEmailAvailable).not.toHaveBeenCalled();
    expect(
      authIdentityServiceMock.assertPhoneNumberAvailable,
    ).not.toHaveBeenCalled();
  });

  it('updateProfile maps email conflict to deterministic details.fields metadata', async () => {
    authIdentityServiceMock.findById.mockResolvedValue({
      id: 'customer-1',
      userType: 'customer',
      phoneNumber: '0981234567',
      passwordHash: 'hashed-password',
      firstName: 'Old',
      lastName: 'Name',
      email: 'old@example.com',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    authIdentityServiceMock.assertEmailAvailable.mockRejectedValue(
      new ConflictException('existing'),
    );

    await expect(
      service.updateProfile(
        'customer-1',
        {
          email: 'taken@example.com',
        },
        'customer',
      ),
    ).rejects.toMatchObject({
      message: 'User with this email already exists',
      getResponse: expect.any(Function),
    });

    await service
      .updateProfile(
        'customer-1',
        {
          email: 'taken@example.com',
        },
        'customer',
      )
      .catch((error) => {
        const response = error.getResponse();
        expect(response.details.fields).toEqual([
          {
            field: 'email',
            code: 'CONFLICT',
            message: 'User with this email already exists',
          },
        ]);
      });
  });

  it('updateProfile maps phone conflict to deterministic details.fields metadata', async () => {
    authIdentityServiceMock.findById.mockResolvedValue({
      id: 'customer-1',
      userType: 'customer',
      phoneNumber: '0911222333',
      passwordHash: 'hashed-password',
      firstName: 'Old',
      lastName: 'Name',
      email: 'old@example.com',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    authIdentityServiceMock.assertPhoneNumberAvailable.mockRejectedValue(
      new ConflictException('existing'),
    );

    await expect(
      service.updateProfile(
        'customer-1',
        {
          phoneNumber: '+84981234567',
        },
        'customer',
      ),
    ).rejects.toMatchObject({
      message: 'User with this phone number already exists',
      getResponse: expect.any(Function),
    });

    await service
      .updateProfile(
        'customer-1',
        {
          phoneNumber: '+84981234567',
        },
        'customer',
      )
      .catch((error) => {
        const response = error.getResponse();
        expect(response.details.fields).toEqual([
          {
            field: 'phoneNumber',
            code: 'CONFLICT',
            message: 'User with this phone number already exists',
          },
        ]);
      });
  });

  it('D-04: revokes only cookie-bound current session on logout', async () => {
    authIdentityServiceMock.findById.mockResolvedValue({
      id: 'customer-1',
      userType: 'customer',
      phoneNumber: '0903319999',
      passwordHash: 'hashed-password',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    authIdentityServiceMock.revokeAuthSessionByRefreshToken.mockResolvedValue(
      true,
    );

    const result = await (service as any).logout(
      'current-session-refresh-token',
      'customer-1',
      'customer',
    );

    expect(
      authIdentityServiceMock.revokeAuthSessionByRefreshToken,
    ).toHaveBeenCalledWith('current-session-refresh-token', {
      userType: 'customer',
      userId: 'customer-1',
    });
    expect(authIdentityServiceMock.updateRefreshToken).not.toHaveBeenCalled();
    expect(result).toEqual({ message: 'Successfully logged out' });
  });
});
