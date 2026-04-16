import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConflictException } from '@/common/exceptions/app.exception';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import {
  LoginDto,
  RegisterDto,
  AuthResponseDto,
  ChangePasswordDto,
  UpdateProfileDto,
  RefreshTokenDto,
  MessageResponseDto,
} from './dto/auth.dto';
import { JWT_ACCESS_CONFIG } from './config/jwt.config';
import { REFRESH_JWT_CONFIG } from './config/refresh-jwt.config';
import { JwtPayload } from './types/jwt';
import {
  AuthIdentityService,
  type AuthIdentityRecord,
  type AuthUserType,
} from './auth-identity.service';
import { normalizeVietnamesePhoneNumber } from '@/common/utils/phone.util';

@Injectable()
export class AuthService {
  constructor(
    private databaseService: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly authIdentityService: AuthIdentityService,
  ) {}

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  private async generateTokens(
    userId: string,
    phoneNumber: string,
    userType: AuthUserType,
  ) {
    const payload: JwtPayload = { sub: userId, phoneNumber, userType };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: JWT_ACCESS_CONFIG.expiresIn,
    });

    const refreshToken = this.generateRefreshToken();
    const expiryTimeMs = Number(REFRESH_JWT_CONFIG.expiresIn) || 604800000;
    const refreshTokenExpiry = new Date(Date.now() + expiryTimeMs);

    await this.authIdentityService.updateRefreshToken(
      userType,
      userId,
      refreshToken.trim(),
      refreshTokenExpiry,
    );

    return {
      accessToken,
      refreshToken: refreshToken.trim(),
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { phoneNumber, password, firstName, lastName, email } = registerDto;
    const normalizedPhoneNumber = normalizeVietnamesePhoneNumber(phoneNumber);

    await this.authIdentityService.assertPhoneNumberAvailable(
      normalizedPhoneNumber,
    );

    if (email) {
      await this.authIdentityService.assertEmailAvailable(email);
    }

    let hashedPassword: string;
    try {
      hashedPassword = await bcrypt.hash(password, 10);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Password hashing failed: ${errorMsg}`);
    }

    const user = await this.databaseService.customer.create({
      data: {
        phoneNumber: normalizedPhoneNumber,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        email,
        isActive: true,
      },
    });

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.phoneNumber,
      'customer',
    );

    return {
      message: 'User registered successfully. Tokens set in cookies.',
      user,
      accessToken,
      refreshToken,
    } as AuthResponseDto;
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { phoneNumber, password } = loginDto;
    const normalizedPhoneNumber = normalizeVietnamesePhoneNumber(phoneNumber);
    const user = await this.authIdentityService.findByPhoneNumber(
      normalizedPhoneNumber,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.phoneNumber,
      user.userType,
    );

    return {
      message: 'Login successful. Tokens set in cookies.',
      user,
      accessToken,
      refreshToken,
    } as AuthResponseDto;
  }

  async validateUser(userId: string, userType?: AuthUserType) {
    const user = userType
      ? await this.authIdentityService.findById(userType, userId)
      : await this.findAnyIdentityById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.toPublicUser(user);
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
    userType?: AuthUserType,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;
    const user = userType
      ? await this.authIdentityService.findById(userType, userId)
      : await this.findAnyIdentityById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    if (user.userType === 'customer') {
      await this.databaseService.customer.update({
        where: { id: userId },
        data: { passwordHash: hashedNewPassword },
      });
    } else {
      await this.databaseService.staff.update({
        where: { id: userId },
        data: { passwordHash: hashedNewPassword },
      });
    }

    return { message: 'Password changed successfully' };
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    userType?: AuthUserType,
  ) {
    const { firstName, lastName, email, phoneNumber } = updateProfileDto;
    const user = userType
      ? await this.authIdentityService.findById(userType, userId)
      : await this.findAnyIdentityById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const normalizedPhoneNumber = phoneNumber
      ? normalizeVietnamesePhoneNumber(phoneNumber)
      : undefined;

    if (email && email !== user.email) {
      try {
        await this.authIdentityService.assertEmailAvailable(email);
      } catch (error) {
        if (this.isConflictError(error)) {
          throw new ConflictException(
            'User with this email already exists',
            'CONFLICT',
            {
              fields: [
                {
                  field: 'email',
                  code: 'CONFLICT',
                  message: 'User with this email already exists',
                },
              ],
            },
          );
        }

        throw error;
      }
    }

    if (normalizedPhoneNumber && normalizedPhoneNumber !== user.phoneNumber) {
      try {
        await this.authIdentityService.assertPhoneNumberAvailable(
          normalizedPhoneNumber,
        );
      } catch (error) {
        if (this.isConflictError(error)) {
          throw new ConflictException(
            'User with this phone number already exists',
            'CONFLICT',
            {
              fields: [
                {
                  field: 'phoneNumber',
                  code: 'CONFLICT',
                  message: 'User with this phone number already exists',
                },
              ],
            },
          );
        }

        throw error;
      }
    }

    const updateData = {
      firstName,
      lastName,
      email,
      phoneNumber: normalizedPhoneNumber,
    };

    const updatedUser =
      user.userType === 'customer'
        ? await this.databaseService.customer.update({
            where: { id: userId },
            data: updateData,
          })
        : await this.databaseService.staff.update({
            where: { id: userId },
            data: updateData,
          });

    return this.toPublicUser({
      ...updatedUser,
      userType: user.userType,
    } as AuthIdentityRecord);
  }

  async refreshTokens(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken } = refreshTokenDto;

    if (!refreshToken?.trim()) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const session =
      await this.authIdentityService.findAuthSessionByRefreshToken(
        refreshToken,
      );

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!session.identity.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const user = await this.authIdentityService.findById(
      session.identity.userType,
      session.identity.userId,
    );

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
      },
      {
        expiresIn: JWT_ACCESS_CONFIG.expiresIn,
      },
    );

    return {
      accessToken,
      refreshToken: refreshToken.trim(),
    };
  }

  async validateOrRefreshAccessToken(
    userId: string,
    refreshToken: string,
    userType?: AuthUserType,
  ): Promise<{
    accessToken: string;
    refreshToken: string | null;
    needsRefresh: boolean;
  }> {
    const user = userType
      ? await this.authIdentityService.findById(userType, userId)
      : await this.findAnyIdentityById(userId);

    if (
      !user ||
      !user.isActive ||
      !user.refreshToken ||
      user.refreshToken.trim() !== refreshToken.trim()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!user.refreshTokenExpiry || user.refreshTokenExpiry < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
      },
      {
        expiresIn: JWT_ACCESS_CONFIG.expiresIn,
      },
    );

    return {
      accessToken,
      refreshToken: null,
      needsRefresh: false,
    };
  }

  async logout(
    refreshToken: string,
    userId: string,
    userType?: AuthUserType,
  ): Promise<MessageResponseDto> {
    const user = userType
      ? await this.authIdentityService.findById(userType, userId)
      : await this.findAnyIdentityById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const revoked =
      await this.authIdentityService.revokeAuthSessionByRefreshToken(
        refreshToken,
        {
          userType: user.userType,
          userId: user.id,
        },
      );

    if (!revoked) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return {
      message: 'Successfully logged out',
    };
  }

  async refreshToken(
    userId: string,
    userType?: AuthUserType,
  ): Promise<{ access_token: string }> {
    const user = userType
      ? await this.authIdentityService.findById(userType, userId)
      : await this.findAnyIdentityById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const payload: JwtPayload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      userType: user.userType,
    };

    const accessToken = this.jwtService.sign(payload);

    return { access_token: accessToken };
  }

  private async findAnyIdentityById(
    userId: string,
  ): Promise<AuthIdentityRecord | null> {
    const customer = await this.authIdentityService.findById(
      'customer',
      userId,
    );
    if (customer) return customer;
    return this.authIdentityService.findById('staff', userId);
  }

  private isConflictError(error: unknown): boolean {
    if (error instanceof ConflictException) {
      return true;
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'getStatus' in error &&
      typeof (error as { getStatus?: () => unknown }).getStatus === 'function'
    ) {
      return (error as { getStatus: () => number }).getStatus() === 409;
    }

    return false;
  }

  private toPublicUser(user: AuthIdentityRecord) {
    const jobs = user.jobs ?? (user.job ? [user.job] : []);
    const primaryJob = user.job ?? user.jobs?.[0] ?? null;

    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      email: user.email ?? null,
      jobIds: user.jobIds ?? jobs.map((job) => job.id),
      jobs,
      jobId: user.jobId ?? primaryJob?.id ?? null,
      job: primaryJob
        ? {
            id: primaryJob.id,
            name: primaryJob.name,
            description: primaryJob.description ?? null,
            isActive: primaryJob.isActive,
          }
        : null,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
