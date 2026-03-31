import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

/**
 * Booking status enum
 */
export enum BookingStatusEnum {
  PENDING = 'PENDING',
  DEPOSIT_PAID = 'DEPOSIT_PAID',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

/**
 * Create Booking DTO
 */
export class CreateBookingDto {
  @ApiProperty({
    description: 'Customer ID',
    type: String,
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4')
  customerId: string;

  @ApiProperty({
    description: 'Event date (ISO 8601)',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  eventDate: Date;

  @ApiProperty({
    description: 'Total price in VND',
    type: Number,
    example: 5000000,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalPrice: number;

  @ApiProperty({
    description: 'Booking notes',
    type: String,
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @ApiProperty({
    description: 'Array of package IDs',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  packageIds?: string[];

  @ApiProperty({
    description: 'Array of service IDs',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  serviceIds?: string[];
}

/**
 * Update Booking DTO
 */
export class UpdateBookingDto {
  @ApiProperty({
    description: 'Booking status',
    enum: BookingStatusEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(BookingStatusEnum)
  status?: BookingStatusEnum;

  @ApiProperty({
    description: 'Event date (ISO 8601)',
    type: String,
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  eventDate?: Date;

  @ApiProperty({
    description: 'Total price in VND',
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalPrice?: number;

  @ApiProperty({
    description: 'Booking notes',
    type: String,
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

/**
 * Create Booking Session DTO
 */
export class CreateBookingSessionDto {
  @ApiProperty({
    description: 'Session title',
    type: String,
    maxLength: 200,
  })
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiProperty({
    description: 'Location name',
    type: String,
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  locationName?: string;

  @ApiProperty({
    description: 'Address',
    type: String,
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  address?: string;

  @ApiProperty({
    description: 'Session start time (ISO 8601)',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  startsAt: Date;

  @ApiProperty({
    description: 'Session end time (ISO 8601)',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  endsAt: Date;

  @ApiProperty({
    description: 'Array of staff IDs',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  staffIds?: string[];

  @ApiProperty({
    description: 'Array of service IDs',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  serviceIds?: string[];
}

/**
 * Booking Query DTO
 */
export class BookingQueryDto {
  @ApiProperty({
    description: 'Filter by customer ID',
    type: String,
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID('4')
  customerId?: string;

  @ApiProperty({
    description: 'Filter by booking status',
    enum: BookingStatusEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(BookingStatusEnum)
  status?: BookingStatusEnum;

  @ApiProperty({
    description: 'Start event date (ISO 8601)',
    type: String,
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  fromDate?: Date;

  @ApiProperty({
    description: 'End event date (ISO 8601)',
    type: String,
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  toDate?: Date;

  @ApiProperty({
    description: 'Minimum total price',
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiProperty({
    description: 'Maximum total price',
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;
}

/**
 * Booking Response DTO
 */
export class BookingResponseDto {
  @Expose()
  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  id: string;

  @Expose()
  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  customerId: string;

  @Expose()
  @ApiProperty({
    enum: BookingStatusEnum,
  })
  status: BookingStatusEnum;

  @Expose()
  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  eventDate: Date;

  @Expose()
  @ApiProperty({
    type: Number,
  })
  totalPrice: number;

  @Expose()
  @ApiProperty({
    type: String,
    nullable: true,
  })
  notes: string | null;

  @Expose()
  @ApiProperty({
    type: Date,
    format: 'date-time',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    type: Date,
    format: 'date-time',
  })
  updatedAt: Date;

  // Exclude sensitive fields
  @Exclude()
  deletedAt?: Date;

  @Exclude()
  cancelledAt?: Date;
}
