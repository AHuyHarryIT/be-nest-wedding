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

@Injectable()
export class AuthService {
  constructor(
    private databaseService: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  private async generateTokens(userId: string, phoneNumber: string) {
    const payload: JwtPayload = { sub: userId, phoneNumber };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: JWT_ACCESS_CONFIG.expiresIn,
    });

    // Generate a refresh token (hex string, no special characters)
    const refreshToken = this.generateRefreshToken();

    console.log(
      '[GenerateTokens] Created token',
      'Length:',
      refreshToken.length,
      'First 20 chars:',
      refreshToken.substring(0, 20),
    );

    // Calculate expiry by adding milliseconds to current time
    // REFRESH_JWT_CONFIG.expiresIn is in milliseconds (e.g., 604800000 for 7 days)
    const expiryTimeMs = Number(REFRESH_JWT_CONFIG.expiresIn) || 604800000;
    const refreshTokenExpiry = new Date(Date.now() + expiryTimeMs);

    // Store refresh token in database
    await this.databaseService.user.update({
      where: { id: userId },
      data: {
        refreshToken: refreshToken.trim(),
        refreshTokenExpiry,
      },
    });

    console.log(
      '[GenerateTokens] Stored in DB for user',
      userId,
      'Expiry:',
      refreshTokenExpiry.toISOString(),
    );

    return {
      accessToken,
      refreshToken: refreshToken.trim(),
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { phoneNumber, password, firstName, lastName, email } = registerDto;

    // Check if user already exists
    const existingUser = await this.databaseService.user.findUnique({
      where: { phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException('User with this phone number already exists');
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmailUser = await this.databaseService.user.findFirst({
        where: { email },
      });

      if (existingEmailUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Hash password
    const saltRounds = this.configService.get<number>('HASH_SALT', 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.databaseService.user.create({
      data: {
        phoneNumber,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        email,
        isActive: true,
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.phoneNumber,
    );

    const { ...userWithoutPassword } = user;

    return {
      message: 'User registered successfully. Tokens set in cookies.',
      user: userWithoutPassword,
      accessToken, // For cookie setting
      refreshToken, // For cookie setting
    } as AuthResponseDto;
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { phoneNumber, password } = loginDto;

    // Find user by phone number
    const user = await this.databaseService.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.phoneNumber,
    );

    const { ...userWithoutPassword } = user;

    return {
      message: 'Login successful. Tokens set in cookies.',
      user: userWithoutPassword,
      accessToken, // For cookie setting
      refreshToken, // For cookie setting
    } as AuthResponseDto;
  }

  async validateUser(userId: string) {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find user
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.databaseService.user.update({
      where: { id: userId },
      data: { passwordHash: hashedNewPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const { firstName, lastName, email } = updateProfileDto;

    // Check if email already exists (if provided and different)
    if (email) {
      const existingEmailUser = await this.databaseService.user.findFirst({
        where: {
          email,
          NOT: { id: userId },
        },
      });

      if (existingEmailUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Update user
    const updatedUser = await this.databaseService.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        email,
      },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });

    return updatedUser;
  }

  async refreshTokens(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken } = refreshTokenDto;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    // Trim the token to remove any whitespace
    const trimmedToken = refreshToken.trim();
    console.log(
      '[RefreshTokens] Token length:',
      trimmedToken.length,
      'Token (first 20 chars):',
      trimmedToken.substring(0, 20),
    );

    // Find user with this refresh token
    const user = await this.databaseService.user.findFirst({
      where: {
        refreshToken: trimmedToken,
        isActive: true,
      },
    });

    if (!user) {
      // Check if token exists but user is inactive
      const inactiveUser = await this.databaseService.user.findFirst({
        where: {
          refreshToken: trimmedToken,
        },
      });

      if (inactiveUser) {
        throw new UnauthorizedException('User account is inactive');
      }

      // Check if any user has a refresh token at all
      const anyToken = await this.databaseService.user.findFirst({
        where: {
          refreshToken: {
            not: null,
          },
        },
      });

      if (anyToken) {
        console.log(
          '[RefreshTokens] Found token in DB (first 20 chars):',
          anyToken.refreshToken?.substring(0, 20),
        );
      } else {
        console.log('[RefreshTokens] No tokens found in database');
      }

      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Check if token is expired
    if (!user.refreshTokenExpiry || user.refreshTokenExpiry < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Generate new tokens
    return this.generateTokens(user.id, user.phoneNumber);
  }

  async validateOrRefreshAccessToken(
    userId: string,
    refreshToken: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string | null;
    needsRefresh: boolean;
  }> {
    // Verify refresh token exists and is not expired
    const user = await this.databaseService.user.findFirst({
      where: {
        id: userId,
        refreshToken: refreshToken.trim(),
        isActive: true,
      },
    });

    if (!user) {
      console.log('[ValidateOrRefresh] User or refresh token not found');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!user.refreshTokenExpiry || user.refreshTokenExpiry < new Date()) {
      console.log('[ValidateOrRefresh] Refresh token expired');
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Generate new access token
    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        phoneNumber: user.phoneNumber,
      },
      {
        expiresIn: JWT_ACCESS_CONFIG.expiresIn,
      },
    );

    console.log(
      '[ValidateOrRefresh] Generated new access token for user',
      userId,
    );

    return {
      accessToken,
      refreshToken: null, // No need to refresh the refresh token yet
      needsRefresh: false,
    };
  }

  async logout(userId: string): Promise<MessageResponseDto> {
    // Invalidate refresh token
    await this.databaseService.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpiry: null,
      },
    });

    return {
      message: 'Successfully logged out',
    };
  }

  async refreshToken(userId: string): Promise<{ access_token: string }> {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Generate new JWT token
    const payload: JwtPayload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
    };

    const accessToken = this.jwtService.sign(payload);

    return { access_token: accessToken };
  }
}
