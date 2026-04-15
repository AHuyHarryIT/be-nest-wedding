import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import { AuthIdentityService } from './auth-identity.service';

describe('Session contract', () => {
  let service: AuthService;

  const databaseServiceMock = {
    customer: {
      create: jest.fn(),
    },
    staff: {
      update: jest.fn(),
    },
  };

  const authIdentityServiceMock = {
    updateRefreshToken: jest.fn(),
    findByRefreshToken: jest.fn(),
    findById: jest.fn(),
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
    sign: jest.fn(),
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

  it('bootstraps the session-contract scaffold module', () => {
    expect(service).toBeDefined();
  });

  it.todo(
    'D-01: refresh rotates access token only and keeps refresh token stable across /auth/refresh calls',
  );

  it.todo(
    'D-02: invalid or expired refresh token clears auth cookies/state and forces immediate re-login',
  );

  it.todo('D-04: logout revokes current session only, not all active sessions');

  it.todo(
    'D-05: no idle-timeout branch is introduced; session validity remains token-expiry/refresh based',
  );

  it.todo(
    'D-14: customer and staff identities follow one shared session-policy contract for refresh/logout semantics',
  );
});
