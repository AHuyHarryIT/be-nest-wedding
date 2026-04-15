import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePublicInquiryDto {
  @ApiProperty({ description: 'Public visitor full name', example: 'Jane Doe' })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(120, { message: 'Name cannot exceed 120 characters' })
  name: string;

  @ApiProperty({
    description: 'Public visitor email address',
    example: 'jane@example.com',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  email: string;

  @ApiProperty({
    description: 'Inquiry message from visitor',
    example: 'We want a full-day wedding package.',
  })
  @IsString({ message: 'Message must be a string' })
  @IsNotEmpty({ message: 'Message is required' })
  @MaxLength(2000, { message: 'Message cannot exceed 2000 characters' })
  message: string;

  @ApiPropertyOptional({
    description: 'Optional contact phone number',
    example: '0903111222',
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(40, { message: 'Phone cannot exceed 40 characters' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Optional package preference',
    example: 'Premium',
  })
  @IsOptional()
  @IsString({ message: 'Package interest must be a string' })
  @MaxLength(160, { message: 'Package interest cannot exceed 160 characters' })
  packageInterest?: string;
}
