import { PaginationQueryDto } from '@/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from 'generated/prisma';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryBookingDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by booking status',
    enum: BookingStatus,
  })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Include customer details',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeCustomer?: boolean;

  @ApiPropertyOptional({
    description: 'Include package details',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includePackage?: boolean;

  @ApiPropertyOptional({
    description: 'Include packages and services details',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includePackages?: boolean;

  @ApiPropertyOptional({
    description: 'Include services',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeServices?: boolean;
}
