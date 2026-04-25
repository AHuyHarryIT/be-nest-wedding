import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ItemType, RentalStatus } from 'generated/prisma';

export class UpdateInventoryItemDto {
  @ApiPropertyOptional({ description: 'Name of the inventory item' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description of the inventory item' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Type of the inventory item',
    enum: ItemType,
  })
  @IsOptional()
  @IsEnum(ItemType)
  type?: ItemType;

  @ApiPropertyOptional({ description: 'SKU' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Cost price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ description: 'Sell price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sellPrice?: number;

  @ApiPropertyOptional({ description: 'Rental deposit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rentalDeposit?: number;

  @ApiPropertyOptional({ description: 'Rental price per day' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rentalPricePerDay?: number;

  @ApiPropertyOptional({ description: 'Stock count' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  stockCount?: number;

  @ApiPropertyOptional({ description: 'Checked out count' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  checkedOutCount?: number;

  @ApiPropertyOptional({ description: 'Low stock threshold' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({
    description: 'Rental status',
    enum: ['AVAILABLE', 'CHECKED_OUT', 'MAINTENANCE', 'DAMAGED'],
  })
  @IsOptional()
  @IsString()
  rentalStatus?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the item is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  isActive?: boolean;
}
