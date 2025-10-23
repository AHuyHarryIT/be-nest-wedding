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
import { JwtPayload } from './jwt-cookie.strategy';

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
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.generateRefreshToken();
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

    // Store refresh token in database
    await this.databaseService.user.update({
      where: { id: userId },
      data: {
        refreshToken,
        refreshTokenExpiry,
      },
    });

    return {
      accessToken,
      refreshToken,
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
    const { refresh_token } = refreshTokenDto;

    // Find user with this refresh token
    const user = await this.databaseService.user.findFirst({
      where: {
        refreshToken: refresh_token,
        refreshTokenExpiry: {
          gt: new Date(), // Token not expired
        },
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Generate new tokens
    return this.generateTokens(user.id, user.phoneNumber);
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
