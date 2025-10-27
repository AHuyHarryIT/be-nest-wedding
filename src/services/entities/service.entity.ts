import { ApiProperty } from '@nestjs/swagger';
import { Service } from 'generated/prisma';

export class ServiceEntity implements Service {
  @ApiProperty({
    example: 'uuid-1234',
  })
  id: string;

  @ApiProperty({
    example: 'Wedding Photography',
  })
  name: string;

  @ApiProperty({
    example: 'wedding-photography',
    required: false,
    nullable: true,
  })
  slug: string | null;

  @ApiProperty({
    example: 'Professional wedding photography service',
    required: false,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example: 1500,
  })
  price: number;

  @ApiProperty({
    example: true,
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
