import { PaginationQueryDto } from '@/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from 'generated/prisma';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryBookingSessionDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by booking ID' })
  @IsUUID()
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({
    description: 'Filter by session status',
    enum: BookingStatus,
  })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Include booking details',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeBooking?: boolean;

  @ApiPropertyOptional({
    description: 'Include staff',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeStaff?: boolean;

  @ApiPropertyOptional({
    description: 'Include services',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeServices?: boolean;
}
