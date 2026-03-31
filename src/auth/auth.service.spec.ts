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
    },
  };
  const authIdentityServiceMock = {
    assertPhoneNumberAvailable: jest.fn(),
    assertEmailAvailable: jest.fn(),
    updateRefreshToken: jest.fn(),
    findByPhoneNumber: jest.fn(),
    findById: jest.fn(),
    findByRefreshToken: jest.fn(),
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
});
