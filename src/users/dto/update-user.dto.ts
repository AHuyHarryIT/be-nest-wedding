import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class UpdateUserDto {
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
    description: 'User active status',
    example: true,
  })
  @IsBoolean({ message: 'isActive must be a boolean value' })
  @IsOptional()
  isActive?: boolean;
}
