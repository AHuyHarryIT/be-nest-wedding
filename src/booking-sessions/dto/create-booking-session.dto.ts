import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { BookingStatus } from 'generated/prisma';

export class CreateBookingSessionDto {
  @ApiProperty({
    description: 'The ID of the booking this session belongs to',
    example: 'uuid-booking-123',
  })
  @IsUUID()
  bookingId: string;

  @ApiProperty({
    description: 'Title of the session',
    example: 'Morning Photography Session',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Location name',
    example: 'Central Park',
    required: false,
  })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiProperty({
    description: 'Address of the session',
    example: '123 Main St, New York, NY',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Start date and time of the session',
    example: '2024-12-25T10:00:00Z',
  })
  @IsDateString()
  startsAt: string;

  @ApiProperty({
    description: 'End date and time of the session',
    example: '2024-12-25T14:00:00Z',
  })
  @IsDateString()
  endsAt: string;

  @ApiProperty({
    description: 'Status of the session',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
    required: false,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
