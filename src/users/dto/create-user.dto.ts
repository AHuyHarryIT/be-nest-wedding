import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  IsOptional,
  IsArray,
  IsUUID,
  Matches,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'User phone number (10-11 digits)',
    example: '0123456789',
    pattern: '^[0-9]{10,11}$',
  })
  @IsString({ message: 'Phone number must be a string' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^[0-9]{10,11}$/, {
    message: 'Phone number must be 10-11 digits',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters, maximum 255)',
    example: 'SecurePassword123',
    minLength: 6,
    maxLength: 255,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(255, { message: 'Password cannot exceed 255 characters' })
  password: string;

  @ApiPropertyOptional({
    description: 'User first name (max 100 characters)',
    example: 'John',
    nullable: true,
    maxLength: 100,
  })
  @IsString({ message: 'First name must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'First name cannot exceed 100 characters' })
  firstName?: string | null;

  @ApiPropertyOptional({
    description: 'User last name (max 100 characters)',
    example: 'Doe',
    nullable: true,
    maxLength: 100,
  })
  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'Last name cannot exceed 100 characters' })
  lastName?: string | null;

  @ApiPropertyOptional({
    description: 'User email address',
    example: 'john@example.com',
    nullable: true,
    format: 'email',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsOptional()
  email?: string | null;

  @ApiPropertyOptional({
    description: 'Staff ID code',
    example: 'STF-001',
    nullable: true,
    maxLength: 50,
  })
  @IsString({ message: 'Staff ID must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Staff ID cannot exceed 50 characters' })
  id?: string;

  @ApiPropertyOptional({
    description: 'Array of role IDs to assign to this user',
    example: ['uuid-1', 'uuid-2'],
    type: [String],
  })
  @IsArray({ message: 'Role IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one role ID is required' })
  @IsUUID('4', { each: true, message: 'Each role ID must be a valid UUID' })
  @IsOptional()
  roleIds?: string[];
}
