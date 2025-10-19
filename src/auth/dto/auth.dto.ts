import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  MinLength,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsPasswordMatch } from '../validators/password-match.validator';

export class LoginDto {
  @ApiProperty({
    description: 'Vietnamese phone number',
    example: '+84981234567',
  })
  @IsPhoneNumber('VN')
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({
    description: 'Vietnamese phone number',
    example: '+84981234567',
  })
  @IsPhoneNumber('VN')
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'currentPassword123',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    description: 'New password (minimum 6 characters)',
    example: 'newPassword123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'newPassword123',
  })
  @IsString()
  @IsNotEmpty()
  @IsPasswordMatch('newPassword', {
    message: 'Confirm password does not match new password',
  })
  confirmPassword: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'Jane',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Smith',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User email address',
    example: 'jane.smith@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Success message for authentication',
    example: 'Authentication successful.',
  })
  message: string;

  @ApiProperty({
    description: 'User information',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'e8560a4a-2d28-4cd7-a98c-b444166563e6' },
      phoneNumber: { type: 'string', example: '+84981234567' },
      firstName: { type: 'string', example: 'John', nullable: true },
      lastName: { type: 'string', example: 'Doe', nullable: true },
      email: {
        type: 'string',
        example: 'john.doe@example.com',
        nullable: true,
      },
      isActive: { type: 'boolean', example: true },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2025-10-19T10:04:19.380Z',
      },
    },
  })
  user: {
    id: string;
    phoneNumber: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    isActive: boolean;
    createdAt: Date;
  };
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token for generating new access token',
    example: 'abcd1234efgh5678ijkl9012mnop3456...',
  })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}

export class MessageResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  message: string;
}
