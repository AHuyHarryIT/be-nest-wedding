import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from 'generated/prisma';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateBookingSessionDto {
  @ApiProperty({
    description: 'Booking ID (UUID format)',
    example: 'uuid-1234',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Booking ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Booking ID is required' })
  bookingId: string;

  @ApiProperty({
    description: 'Session title (max 255 characters)',
    example: 'Wedding Photography Session',
    maxLength: 255,
  })
  @IsString({ message: 'Session title must be a string' })
  @IsNotEmpty({ message: 'Session title is required' })
  @MaxLength(255, { message: 'Session title cannot exceed 255 characters' })
  title: string;

  @ApiPropertyOptional({
    description: 'Location name (max 255 characters)',
    example: 'Grand Hotel Ballroom',
    maxLength: 255,
  })
  @IsString({ message: 'Location name must be a string' })
  @IsOptional()
  @MaxLength(255, { message: 'Location name cannot exceed 255 characters' })
  locationName?: string;

  @ApiPropertyOptional({
    description: 'Full address (max 500 characters)',
    example: '123 Main St, City, Country',
    maxLength: 500,
  })
  @IsString({ message: 'Address must be a string' })
  @IsOptional()
  @MaxLength(500, { message: 'Address cannot exceed 500 characters' })
  address?: string;

  @ApiProperty({
    description: 'Session start time in ISO 8601 format',
    example: '2024-12-31T10:00:00Z',
    format: 'date-time',
  })
  @IsDateString(
    {},
    { message: 'Start time must be a valid ISO 8601 date string' },
  )
  @IsNotEmpty({ message: 'Start time is required' })
  startsAt: string;

  @ApiProperty({
    description: 'Session end time in ISO 8601 format',
    example: '2024-12-31T18:00:00Z',
    format: 'date-time',
  })
  @IsDateString(
    {},
    { message: 'End time must be a valid ISO 8601 date string' },
  )
  @IsNotEmpty({ message: 'End time is required' })
  endsAt: string;

  @ApiPropertyOptional({
    description: 'Session booking status',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  @IsEnum(BookingStatus, { message: 'Status must be a valid booking status' })
  @IsOptional()
  status?: BookingStatus;
}
