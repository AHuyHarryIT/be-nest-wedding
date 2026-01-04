import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Prisma, Product } from 'generated/prisma';

export class CreateProductDto implements Prisma.ProductCreateInput {
  @ApiProperty({
    description: 'The name of the product',
    example: 'Product 12',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The description of the product',
    example: 'This is a sample product',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The price of the product',
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price: number = 0;

  @ApiProperty({
    description: 'The stock quantity of the product',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQty: number = 0;

  @ApiProperty({
    description: 'Whether the product is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive: boolean = false;

  @ApiProperty({
    description: 'The category ID of the product',
    example: 'uuid-category-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    description: 'The product image file ID (stored in File storage)',
    example: 'uuid-file-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  imageFileId?: string;

  @ApiProperty({
    description: 'The OneDrive folder ID for storing product images',
    example: 'folder-id-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  oneDriveFolderId?: string;
}

export class CreateProductResponseDto implements Product {
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

  @ApiProperty({
    description: 'The description of the product',
    example: 'This is a sample product',
    required: false,
  })
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'The price of the product',
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price: number = 0;

  @ApiProperty({
    description: 'The stock quantity of the product',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQty: number = 0;

  @ApiProperty({
    description: 'Whether the product is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive: boolean = false;

  @ApiProperty({
    description: 'The category ID of the product',
    example: 'uuid-category-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryId: string | null;

  @ApiProperty({
    description: 'The file ID of the product image',
    example: 'uuid-file-id',
    required: false,
  })
  @IsOptional()
  @IsString()
  imageFileId: string | null;

  @ApiProperty({
    description: 'The OneDrive folder ID for product images',
    example: 'uuid-folder-id',
    required: false,
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

  @ApiProperty({
    description: 'The deletion timestamp of the product, if deleted',
    example: null,
    required: false,
  })
  @IsOptional()
  deletedAt: Date | null;
}
