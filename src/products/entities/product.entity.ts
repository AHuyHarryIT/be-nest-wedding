import { ApiProperty } from '@nestjs/swagger';

export class Product {
  @ApiProperty({
    description: 'Unique identifier for the product',
    example: 'uuid-1234',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the product',
    example: 'Product Name',
  })
  name: string;

  @ApiProperty({
    description: 'The description of the product',
    example: 'This is a sample product description',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'The price of the product',
    example: 99.99,
  })
  price: number;

  @ApiProperty({
    description: 'The stock quantity of the product',
    example: 50,
  })
  stockQty: number;

  @ApiProperty({
    description: 'Whether the product is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'The creation timestamp',
    example: '2023-10-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The last update timestamp',
    example: '2023-10-01T12:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'The deletion timestamp, if deleted',
    example: null,
    required: false,
  })
  deletedAt?: Date;

  @ApiProperty({
    description: 'The file ID of the product image',
    example: 'uuid-file-id',
    required: false,
  })
  imageFileId?: string;
}
