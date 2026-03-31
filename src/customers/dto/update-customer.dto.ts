import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({
    description: 'Customer first name',
    example: 'Nguyen',
    nullable: true,
  })
  @IsString({ message: 'First name must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'First name cannot exceed 100 characters' })
  firstName?: string | null;

  @ApiPropertyOptional({
    description: 'Customer last name',
    example: 'An',
    nullable: true,
  })
  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'Last name cannot exceed 100 characters' })
  lastName?: string | null;

  @ApiPropertyOptional({
    description: 'Customer email address',
    example: 'customer@example.com',
    nullable: true,
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsOptional()
  email?: string | null;

  @ApiPropertyOptional({
    description: 'Customer avatar URL',
    example: 'https://cdn.example.com/avatar.jpg',
    nullable: true,
  })
  @IsString({ message: 'Avatar URL must be a string' })
  @IsOptional()
  @MaxLength(2048, { message: 'Avatar URL cannot exceed 2048 characters' })
  avatarUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Customer wedding date',
    example: '2026-10-10T00:00:00.000Z',
    nullable: true,
  })
  @IsDateString({}, { message: 'Wedding date must be a valid ISO date' })
  @IsOptional()
  weddingDate?: Date | null;

  @ApiPropertyOptional({
    description: 'Customer wedding venue',
    example: 'The Grand Hall',
    nullable: true,
  })
  @IsString({ message: 'Wedding venue must be a string' })
  @IsOptional()
  @MaxLength(255, { message: 'Wedding venue cannot exceed 255 characters' })
  weddingVenue?: string | null;

  @ApiPropertyOptional({
    description: 'Whether customer receives email notifications',
    example: true,
  })
  @IsBoolean({ message: 'emailNotifications must be a boolean value' })
  @IsOptional()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Whether customer receives SMS notifications',
    example: true,
  })
  @IsBoolean({ message: 'smsNotifications must be a boolean value' })
  @IsOptional()
  smsNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Whether customer receives marketing emails',
    example: false,
  })
  @IsBoolean({ message: 'marketingEmails must be a boolean value' })
  @IsOptional()
  marketingEmails?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the customer account is active',
    example: true,
  })
  @IsBoolean({ message: 'isActive must be a boolean value' })
  @IsOptional()
  isActive?: boolean;
}
