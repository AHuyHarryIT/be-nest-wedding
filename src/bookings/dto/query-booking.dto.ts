import { PaginationQueryDto } from '@/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { BookingStatus } from 'generated/prisma';

export class QueryBookingDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: BookingStatus,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
  })
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by package ID',
  })
  @IsOptional()
  packageId?: string;

  @ApiPropertyOptional({
    description: 'Filter by event date from',
  })
  @IsOptional()
  @IsDateString()
  eventDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by event date to',
  })
  @IsOptional()
  @IsDateString()
  eventDateTo?: string;
}
