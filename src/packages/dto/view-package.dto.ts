import { ApiProperty } from '@nestjs/swagger';
import { Package } from 'generated/prisma';

export class ViewPackageDto implements Package {
  @ApiProperty({
    example: 'uuid-1234',
  })
  id: string;

  @ApiProperty({
    example: 'Premium Wedding Package',
  })
  name: string;

  @ApiProperty({
    example: 'premium-wedding-package',
    required: false,
    nullable: true,
  })
  slug: string | null;

  @ApiProperty({
    example:
      'Comprehensive wedding package with photography, videography, and more',
    required: false,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example: 5000,
    required: false,
  })
  price: number;

  @ApiProperty({
    example: true,
    required: false,
  })
  isActive: boolean;

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    example: null,
    required: false,
    nullable: true,
  })
  deletedAt: Date | null;
}
