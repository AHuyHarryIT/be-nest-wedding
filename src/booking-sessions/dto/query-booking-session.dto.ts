import { PaginationQueryDto } from '@/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from 'generated/prisma';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryBookingSessionDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by booking ID (UUID format)',
    example: 'uuid-1234',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Booking ID must be a valid UUID' })
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({
    description: 'Filter by session booking status',
    enum: BookingStatus,
    example: BookingStatus.PENDING,
  })
  @IsEnum(BookingStatus, { message: 'Status must be a valid booking status' })
  @IsOptional()
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Include complete booking details in response',
    default: false,
  })
  @IsBoolean({ message: 'includeBooking must be a boolean value' })
  @IsOptional()
  @Type(() => Boolean)
  includeBooking?: boolean;

  @ApiPropertyOptional({
    description: 'Include staff members assigned to session',
    default: false,
  })
  @IsBoolean({ message: 'includeStaff must be a boolean value' })
  @IsOptional()
  @Type(() => Boolean)
  includeStaff?: boolean;

  @ApiPropertyOptional({
    description: 'Include services included in session',
    default: false,
  })
  @IsBoolean({ message: 'includeServices must be a boolean value' })
  @IsOptional()
  @Type(() => Boolean)
  includeServices?: boolean;
}
