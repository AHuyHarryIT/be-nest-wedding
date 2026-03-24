import { ApiProperty } from '@nestjs/swagger';

export class Package {
  @ApiProperty({
    description: 'Unique identifier for the package',
    example: 'uuid-1234',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the package',
    example: 'Wedding Photography Package',
  })
  name: string;

  @ApiProperty({
    description: 'The description of the package',
    example:
      'Comprehensive wedding photography package including ceremony and reception coverage',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'The price of the package',
    example: 1999.99,
  })
  price: number;

  @ApiProperty({
    description: 'Whether the package is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Cover image URL',
    required: false,
    example:
      'https://res.cloudinary.com/demo/image/upload/v1/wedding/packages/cover/sample.jpg',
  })
  coverImageUrl?: string;

  @ApiProperty({
    description: 'Cloudinary public ID for cover image',
    required: false,
    example: 'wedding/packages/cover/sample_1234567890',
  })
  coverImagePublicId?: string;

  @ApiProperty({
    description: 'Ordered gallery images',
    required: false,
    type: [Object],
    example: [
      {
        id: 'uuid-image-1',
        imageUrl:
          'https://res.cloudinary.com/demo/image/upload/v1/wedding/packages/gallery/photo-1.jpg',
        cloudinaryPublicId: 'wedding/packages/gallery/photo-1_123',
        sortOrder: 0,
      },
    ],
  })
  images?: Array<{
    id: string;
    imageUrl: string;
    cloudinaryPublicId: string;
    sortOrder: number;
  }>;

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
}
