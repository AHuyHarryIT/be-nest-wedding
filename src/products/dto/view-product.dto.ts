import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDate,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ViewProductDto {
  @ApiProperty({
    description: 'The unique identifier of the product',
    example: 'uuid-1234',
  })
  @IsUUID('4')
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

  @ApiProperty({
    description: 'The creation timestamp of the product',
    example: '2023-10-01T12:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    description: 'The last update timestamp of the product',
    example: '2023-10-01T12:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'The deletion timestamp of the product, if deleted',
    example: null,
    nullable: true,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deletedAt: Date | null;

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
}
