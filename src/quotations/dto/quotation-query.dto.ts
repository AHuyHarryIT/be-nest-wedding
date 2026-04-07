import { PaginationQueryDto } from '@/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuotationStatus } from 'generated/prisma';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryQuotationDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by customer ID (UUID format)',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Customer ID must be a valid UUID' })
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by quotation status',
    enum: QuotationStatus,
  })
  @IsEnum(QuotationStatus, { message: 'Status must be a valid quotation status' })
  @IsOptional()
  status?: QuotationStatus;

  @ApiPropertyOptional({
    description: 'Filter quotations created on or after this date (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date from must be a valid ISO 8601 date string' })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter quotations created on or before this date (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date to must be a valid ISO 8601 date string' })
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Include customer details in response',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'includeCustomer must be a boolean' })
  @Type(() => Boolean)
  includeCustomer?: boolean;

  @ApiPropertyOptional({
    description: 'Include inventory items and services in response',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'includeItems must be a boolean' })
  @Type(() => Boolean)
  includeItems?: boolean;
}
