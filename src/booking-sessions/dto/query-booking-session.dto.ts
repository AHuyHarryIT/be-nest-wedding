import { PaginationQueryDto } from '@/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { BookingStatus } from 'generated/prisma';

export class QueryBookingSessionDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: BookingStatus,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Filter by booking ID',
  })
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({
    description: 'Filter by start date from',
  })
  @IsOptional()
  @IsDateString()
  startsFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by start date to',
  })
  @IsOptional()
  @IsDateString()
  startsTo?: string;
}
