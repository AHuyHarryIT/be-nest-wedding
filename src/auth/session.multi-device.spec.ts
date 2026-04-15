import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthIdentityService } from './auth-identity.service';

describe('Multi-device session contract', () => {
  let service: AuthService;

  const databaseServiceMock = {
    customer: {
      findUnique: jest.fn(),
    },
    staff: {
      findUnique: jest.fn(),
    },
  };

  const authIdentityServiceMock = {
    findById: jest.fn(),
    updateRefreshToken: jest.fn(),
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

  it('bootstraps multi-device contract scaffold', () => {
    expect(service).toBeDefined();
  });

  it.todo(
    'D-03: customer identities can list active sessions across multiple devices with session metadata',
  );

  it.todo(
    'D-03: staff identities can list active sessions across multiple devices with session metadata',
  );

  it.todo(
    'D-03: selective revoke by session ID invalidates only the targeted device session',
  );

  it.todo(
    'D-04: standard logout revokes current session only while other sessions remain active until explicit selective revoke',
  );

  it.todo(
    'D-03: selective revoke behavior is available and auditable for both customer and staff identities',
  );
});
