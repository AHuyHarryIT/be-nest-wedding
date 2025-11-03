import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { BookingStatus } from 'generated/prisma';

export class CreateBookingSessionDto {
  @ApiProperty({
    description: 'Booking ID',
    example: 'uuid-booking-1234',
  })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({
    description: 'Session title',
    example: 'Wedding Ceremony',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Location name',
    example: 'Grand Hotel Ballroom',
    required: false,
  })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiProperty({
    description: 'Address',
    example: '123 Main Street',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Session start time',
    example: '2024-12-31T18:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startsAt: string;

  @ApiProperty({
    description: 'Session end time',
    example: '2024-12-31T22:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endsAt: string;

  @ApiProperty({
    description: 'Status of the session',
    enum: BookingStatus,
    example: BookingStatus.PENDING,
    required: false,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
