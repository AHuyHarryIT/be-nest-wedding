import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
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

    await this.authIdentityService.assertPhoneNumberAvailable(phoneNumber);

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
        phoneNumber,
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
    const user = await this.authIdentityService.findByPhoneNumber(phoneNumber);

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
    const { firstName, lastName, email } = updateProfileDto;
    const user = userType
      ? await this.authIdentityService.findById(userType, userId)
      : await this.findAnyIdentityById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (email && email !== user.email) {
      try {
        await this.authIdentityService.assertEmailAvailable(email);
      } catch (error) {
        if (error instanceof ConflictException) {
          throw new ConflictException('User with this email already exists');
        }
        throw error;
      }
    }

    const updatedUser =
      user.userType === 'customer'
        ? await this.databaseService.customer.update({
            where: { id: userId },
            data: { firstName, lastName, email },
          })
        : await this.databaseService.staff.update({
            where: { id: userId },
            data: { firstName, lastName, email },
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

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const user =
      await this.authIdentityService.findByRefreshToken(refreshToken);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (!user.refreshTokenExpiry || user.refreshTokenExpiry < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    return this.generateTokens(user.id, user.phoneNumber, user.userType);
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
    userId: string,
    userType?: AuthUserType,
  ): Promise<MessageResponseDto> {
    const user = userType
      ? await this.authIdentityService.findById(userType, userId)
      : await this.findAnyIdentityById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.authIdentityService.updateRefreshToken(
      user.userType,
      userId,
      null,
      null,
    );

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

  private toPublicUser(user: AuthIdentityRecord) {
    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      email: user.email ?? null,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
