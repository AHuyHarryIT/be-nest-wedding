import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from 'generated/prisma';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'Customer user ID' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ description: 'Package ID' })
  @IsUUID()
  @IsNotEmpty()
  packageId: string;

  @ApiPropertyOptional({ description: 'Booking notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Event date', example: '2024-12-31T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  eventDate: string;

  @ApiPropertyOptional({ description: 'Total price', default: 0 })
  @IsNumber()
  @IsOptional()
  totalPrice?: number;

  @ApiPropertyOptional({
    description: 'Booking status',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}
