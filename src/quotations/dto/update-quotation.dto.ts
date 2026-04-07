import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuotationStatus } from 'generated/prisma';

export class UpdateQuotationDto {
  @ApiPropertyOptional({
    description: 'Title of the quotation',
    example: 'Updated Wedding Package',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Internal notes for the quotation',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Date until when the quotation is valid',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Valid until must be a valid ISO 8601 date string' },
  )
  validUntil?: string;

  @ApiPropertyOptional({
    description: 'Overall discount percentage (0-100)',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Discount percent must be a number' })
  @Min(0, { message: 'Discount percent cannot be negative' })
  @Max(100, { message: 'Discount percent cannot exceed 100' })
  @Type(() => Number)
  discountPercent?: number;

  @ApiPropertyOptional({
    description: 'Tax/VAT percentage (0-100)',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Tax percent must be a number' })
  @Min(0, { message: 'Tax percent cannot be negative' })
  @Max(100, { message: 'Tax percent cannot exceed 100' })
  @Type(() => Number)
  taxPercent?: number;
}
