import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'The name of the product',
    example: 'Product 12',
    maxLength: 255,
  })
  @IsString({ message: 'Product name must be a string' })
  @IsNotEmpty({ message: 'Product name is required' })
  @MaxLength(255, { message: 'Product name cannot exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'The description of the product',
    example: 'This is a sample product',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Product description must be a string' })
  @MaxLength(1000, {
    message: 'Product description cannot exceed 1000 characters',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'The price of the product',
    example: 100,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: 'The stock quantity of the product',
    example: 50,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQty?: number;

  @ApiPropertyOptional({
    description: 'Whether the product is active',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'The category ID of the product',
    example: 'uuid-category-123',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'The product image file ID (stored in File storage)',
    example: 'uuid-file-123',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Image file ID must be a valid UUID' })
  imageFileId?: string;

  @ApiPropertyOptional({
    description: 'The OneDrive folder ID for storing product images',
    example: 'folder-id-123',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'OneDrive folder ID must be a string' })
  @MaxLength(255, {
    message: 'OneDrive folder ID cannot exceed 255 characters',
  })
  oneDriveFolderId?: string;
}

export class CreateProductResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the product',
    example: 'uuid-1234',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'The name of the product',
    example: 'Product 12',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'The description of the product',
    example: 'This is a sample product',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description: string | null;

  @ApiPropertyOptional({
    description: 'The price of the product',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'The stock quantity of the product',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQty: number;

  @ApiPropertyOptional({
    description: 'Whether the product is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'The category ID of the product',
    example: 'uuid-category-123',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  categoryId: string | null;

  @ApiPropertyOptional({
    description: 'The file ID of the product image',
    example: 'uuid-file-id',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  imageFileId: string | null;

  @ApiPropertyOptional({
    description: 'The OneDrive folder ID for product images',
    example: 'uuid-folder-id',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  oneDriveFolderId: string | null;

  @ApiProperty({
    description: 'The creation timestamp of the product',
    example: '2023-10-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The last update timestamp of the product',
    example: '2023-10-01T12:00:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'The deletion timestamp of the product, if deleted',
    example: null,
    nullable: true,
  })
  @IsOptional()
  deletedAt: Date | null;
}
