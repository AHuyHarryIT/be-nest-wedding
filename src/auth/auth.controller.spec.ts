import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('uses cookie refresh token and keeps it stable in response cookies (D-01)', async () => {
    authServiceMock.refreshTokens.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'stable-refresh-token',
    });

    const request = {
      cookies: {
        refresh_token: 'stable-refresh-token',
      },
    } as any;

    const response = {
      cookie: jest.fn(),
    } as any;

    const result = await controller.refresh(request, response);

    expect(authServiceMock.refreshTokens).toHaveBeenCalledWith({
      refreshToken: 'stable-refresh-token',
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'stable-refresh-token',
      expect.any(Object),
    );
    expect(result).toEqual({ message: 'Tokens refreshed successfully' });
  });

  it('throws Unauthorized when refresh cookie is missing (D-02)', async () => {
    const request = { cookies: {} } as any;
    const response = { cookie: jest.fn() } as any;

    await expect(controller.refresh(request, response)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('passes through changePassword request to auth service', async () => {
    authServiceMock.changePassword.mockResolvedValue({
      message: 'Password changed successfully',
    });

    const user = {
      userId: 'staff-1',
      userType: 'staff',
    } as any;

    const dto = {
      currentPassword: 'old-password',
      newPassword: 'new-password',
    };

    const result = await controller.changePassword(user, dto as any);

    expect(authServiceMock.changePassword).toHaveBeenCalledWith(
      'staff-1',
      dto,
      'staff',
    );
    expect(result).toEqual({ message: 'Password changed successfully' });
  });

  it('passes cookie-identified session token to logout service (D-04)', async () => {
    authServiceMock.logout.mockResolvedValue({
      message: 'Successfully logged out',
    });

    const user = {
      userId: 'customer-1',
      userType: 'customer',
    } as any;

    const request = {
      cookies: {
        refresh_token: 'current-session-token',
      },
    } as any;

    const response = {
      clearCookie: jest.fn(),
    } as any;

    const result = await (controller as any).logout(user, request, response);

    expect(response.clearCookie).toHaveBeenCalledWith('access_token');
    expect(response.clearCookie).toHaveBeenCalledWith('refresh_token');
    expect(response.clearCookie).toHaveBeenCalledWith('staff_access_token');
    expect(response.clearCookie).toHaveBeenCalledWith('staff_refresh_token');

    expect(authServiceMock.logout).toHaveBeenCalledWith(
      'current-session-token',
      'customer-1',
      'customer',
    );

    expect(result).toEqual({ message: 'Successfully logged out' });
  });
});
