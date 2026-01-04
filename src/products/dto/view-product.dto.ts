import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Product } from 'generated/prisma';

export class ViewProductDto implements Product {
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
  description: string | null;

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
}
