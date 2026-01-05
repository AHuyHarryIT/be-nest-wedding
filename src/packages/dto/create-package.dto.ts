import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  Min,
  IsArray,
  IsUUID,
} from 'class-validator';
import { Prisma, Package } from 'generated/prisma';
import { Transform } from 'class-transformer';

export class CreatePackageDto implements Prisma.PackageCreateInput {
  @ApiProperty({
    description: 'The name of the package',
    example: 'Premium Wedding Package',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'The slug of the package',
    example: 'premium-wedding-package',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiProperty({
    description: 'The description of the package',
    example:
      'Comprehensive wedding package with photography, videography, and more',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The price of the package',
    example: 5000,
    required: false,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return typeof value === 'number' ? value : 0;
  })
  price?: number;

  @ApiProperty({
    description: 'Whether the package is active',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value === true || value === 1;
  })
  isActive?: boolean;

  @ApiProperty({
    description: 'Array of service IDs to associate with this package',
    example: ['service-id-1', 'service-id-2'],
    required: false,
    isArray: true,
    type: 'string',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  serviceIds?: string[];
}

export class CreatePackageResponseDto implements Package {
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
