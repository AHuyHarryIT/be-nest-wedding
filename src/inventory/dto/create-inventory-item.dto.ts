import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ItemType } from 'generated/prisma';

export class CreateInventoryItemDto {
  @ApiProperty({
    description: 'Name of the inventory item',
    example: 'Wedding Arch Gold',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the inventory item',
    example: 'A beautiful gold arch for ceremonies',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Type of the inventory item',
    enum: ItemType,
    example: ItemType.RENTAL,
  })
  @IsEnum(ItemType)
  type: ItemType;

  @ApiPropertyOptional({
    description: 'Stock Keeping Unit',
    example: 'ARCH-GLD-001',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: 'Cost price of the item',
    example: 500000,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({
    description: 'Selling/rental price of the item',
    example: 750000,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sellPrice?: number;

  @ApiPropertyOptional({
    description: 'Deposit amount for rental items',
    example: 200000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rentalDeposit?: number;

  @ApiPropertyOptional({
    description: 'Rental price per day for rental items',
    example: 150000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rentalPricePerDay?: number;

  @ApiPropertyOptional({
    description: 'Total stock count',
    example: 10,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  stockCount?: number;

  @ApiPropertyOptional({
    description: 'Number of checked out items (rental tracking)',
    example: 2,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  checkedOutCount?: number;

  @ApiPropertyOptional({
    description: 'Threshold for low stock alerts',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({
    description: 'Rental status for items',
    enum: ['AVAILABLE', 'CHECKED_OUT', 'MAINTENANCE', 'DAMAGED'],
    example: 'AVAILABLE',
  })
  @IsOptional()
  @IsString()
  rentalStatus?: string;

  @ApiPropertyOptional({
    description: 'Category ID',
    example: 'uuid-here',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Image URL for the item',
    example: 'https://example.com/image.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the item is active',
    example: true,
    default: true,
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
