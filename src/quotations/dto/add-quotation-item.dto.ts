import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for adding items to a quotation (inventory items or services)
 */
export class AddQuotationItemDtoBase {
  @ApiProperty({ description: 'Quantity of the item', example: 1, minimum: 1 })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ description: 'Unit price for this item', example: 500000, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Unit price must be a valid number' })
  @Min(0, { message: 'Unit price cannot be negative' })
  unitPrice: number;

  @ApiPropertyOptional({
    description: 'Discount percentage (0-100)',
    example: 10,
    default: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Discount percent must be a number' })
  @Min(0, { message: 'Discount percent cannot be negative' })
  @Type(() => Number)
  discountPercent?: number;
}

export class AddQuotationInventoryItemDto extends AddQuotationItemDtoBase {
  @ApiProperty({
    description: 'Inventory item ID (UUID)',
    example: 'uuid-inventory-item',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Item ID must be a valid UUID' })
  itemId: string;
}

export class AddQuotationServiceItemDto extends AddQuotationItemDtoBase {
  @ApiProperty({
    description: 'Service ID (UUID)',
    example: 'uuid-service-id',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Service ID must be a valid UUID' })
  serviceId: string;
}

/**
 * DTO for removing items from a quotation
 */
export class RemoveQuotationInventoryItemDto {
  @ApiProperty({
    description: 'Inventory item ID to remove (UUID)',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Item ID must be a valid UUID' })
  itemId: string;
}

export class RemoveQuotationServiceItemDto {
  @ApiProperty({
    description: 'Service item ID to remove (UUID)',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Service ID must be a valid UUID' })
  serviceId: string;
}
