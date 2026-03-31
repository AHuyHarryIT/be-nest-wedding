import { PaginationQueryDto } from '@/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from 'generated/prisma';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryBookingDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by customer ID (UUID format)',
    example: 'uuid-customer-1',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Customer ID must be a valid UUID' })
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by booking status',
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  @IsEnum(BookingStatus, { message: 'Status must be a valid booking status' })
  @IsOptional()
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Include customer details in response',
    default: false,
  })
  @IsBoolean({ message: 'includeCustomer must be a boolean value' })
  @IsOptional()
  @Type(() => Boolean)
  includeCustomer?: boolean;

  @ApiPropertyOptional({
    description: 'Include main package details in response',
    default: false,
  })
  @IsBoolean({ message: 'includePackage must be a boolean value' })
  @IsOptional()
  @Type(() => Boolean)
  includePackage?: boolean;

  @ApiPropertyOptional({
    description: 'Include all packages and services details in response',
    default: false,
  })
  @IsBoolean({ message: 'includePackages must be a boolean value' })
  @IsOptional()
  @Type(() => Boolean)
  includePackages?: boolean;

  @ApiPropertyOptional({
    description: 'Include services details in response',
    default: false,
  })
  @IsBoolean({ message: 'includeServices must be a boolean value' })
  @IsOptional()
  @Type(() => Boolean)
  includeServices?: boolean;

  @ApiPropertyOptional({
    description: 'Include assigned staff details in response',
    default: false,
  })
  @IsBoolean({ message: 'includeStaffs must be a boolean value' })
  @IsOptional()
  @Type(() => Boolean)
  includeStaffs?: boolean;
}
