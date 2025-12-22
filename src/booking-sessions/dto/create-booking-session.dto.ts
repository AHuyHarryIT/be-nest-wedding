import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from 'generated/prisma';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateBookingSessionDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsUUID()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({ description: 'Session title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Location name' })
  @IsString()
  @IsOptional()
  locationName?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'Session start time',
    example: '2024-12-31T10:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startsAt: string;

  @ApiProperty({
    description: 'Session end time',
    example: '2024-12-31T18:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endsAt: string;

  @ApiPropertyOptional({
    description: 'Session status',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}
