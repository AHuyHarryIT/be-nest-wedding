import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  const databaseServiceMock = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      upsert: jest.fn(),
    },
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
    databaseServiceMock.user.findUnique.mockResolvedValue(null);
    databaseServiceMock.user.findFirst.mockResolvedValue(null);
    databaseServiceMock.role.upsert.mockResolvedValue({
      id: 'customer-role-id',
      name: 'customer',
    });
    databaseServiceMock.user.create.mockResolvedValue({
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
    databaseServiceMock.user.update.mockResolvedValue({
      id: 'user-id',
      refreshToken: 'refresh-token',
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    jwtServiceMock.signAsync.mockResolvedValue('access-token');

    const result = await service.register({
      phoneNumber: '+84981234567',
      password: 'password123',
      firstName: 'Task',
      lastName: 'Runner',
      email: 'task.runner@example.com',
    });

    expect(databaseServiceMock.role.upsert).toHaveBeenCalledWith({
      where: { name: 'customer' },
      update: {},
      create: {
        name: 'customer',
        description: 'Customer with basic read permissions',
      },
    });
    expect(databaseServiceMock.user.create).toHaveBeenCalledWith({
      data: {
        phoneNumber: '+84981234567',
        passwordHash: 'hashed-password',
        firstName: 'Task',
        lastName: 'Runner',
        email: 'task.runner@example.com',
        isActive: true,
        roles: {
          create: [
            {
              roleId: 'customer-role-id',
            },
          ],
        },
      },
    });
    expect(result.message).toContain('registered successfully');
  });
});
