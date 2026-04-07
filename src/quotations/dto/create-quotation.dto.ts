import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { QuotationStatus } from 'generated/prisma';
import { Type } from 'class-transformer';
import { AddQuotationInventoryItemDto, AddQuotationServiceItemDto } from './add-quotation-item.dto';

export class CreateQuotationDto {
  @ApiProperty({
    description: 'Customer ID (UUID)',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Customer ID must be a valid UUID' })
  customerId: string;

  @ApiProperty({
    description: 'Title of the quotation',
    example: 'Wedding Photography Package',
    maxLength: 255,
  })
  @IsString({ message: 'Title must be a string' })
  title: string;

  @ApiPropertyOptional({
    description: 'Internal notes for the quotation',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Date until when the quotation is valid',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Valid until must be a valid ISO 8601 date string' },
  )
  validUntil?: string;

  @ApiPropertyOptional({
    description: 'Subtotal amount (auto-calculated if not provided)',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Subtotal must be a number' })
  @Min(0, { message: 'Subtotal cannot be negative' })
  subtotal?: number;

  @ApiPropertyOptional({
    description: 'Overall discount percentage (0-100)',
    example: 10,
    default: 0,
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
    default: 0,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Tax percent must be a number' })
  @Min(0, { message: 'Tax percent cannot be negative' })
  @Max(100, { message: 'Tax percent cannot exceed 100' })
  @Type(() => Number)
  taxPercent?: number;

  @ApiPropertyOptional({
    description: 'Initial inventory items in the quotation',
    type: [AddQuotationInventoryItemDto],
  })
  @IsOptional()
  @IsArray({ message: 'Inventory items must be an array' })
  @ValidateNested({ each: true })
  @Type(() => AddQuotationInventoryItemDto)
  inventoryItems?: AddQuotationInventoryItemDto[];

  @ApiPropertyOptional({
    description: 'Initial service items in the quotation',
    type: [AddQuotationServiceItemDto],
  })
  @IsOptional()
  @IsArray({ message: 'Service items must be an array' })
  @ValidateNested({ each: true })
  @Type(() => AddQuotationServiceItemDto)
  serviceItems?: AddQuotationServiceItemDto[];
}
