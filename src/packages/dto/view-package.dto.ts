import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsNumber,
  IsBoolean,
  IsDate,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ViewPackageImageDto {
  @ApiProperty({ description: 'Image ID', example: 'uuid-image-1' })
  @IsUUID('4')
  id: string;

  @ApiProperty({
    description: 'Image URL',
    example:
      'https://res.cloudinary.com/demo/image/upload/v1/wedding/packages/gallery/photo.jpg',
  })
  @IsString()
  imageUrl: string;

  @ApiProperty({
    description: 'Cloudinary public ID',
    example: 'wedding/packages/gallery/photo_1234567890',
  })
  @IsString()
  cloudinaryPublicId: string;

  @ApiProperty({ description: 'Display order', example: 0 })
  @IsNumber()
  sortOrder: number;
}

export class ViewPackageDto {
  @ApiProperty({
    description: 'Package ID',
    example: 'uuid-1234',
  })
  @IsUUID('4')
  id: string;

  @ApiProperty({
    description: 'Package name',
    example: 'Premium Wedding Package',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Package description',
    example:
      'Comprehensive wedding package with photography, videography, and more',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description: string | null;

  @ApiPropertyOptional({
    description: 'Package price',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Is package active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Cover image URL',
    nullable: true,
    example:
      'https://res.cloudinary.com/demo/image/upload/v1/wedding/packages/cover/cover.jpg',
  })
  @IsOptional()
  @IsString()
  coverImageUrl: string | null;

  @ApiPropertyOptional({
    description: 'Cover image Cloudinary public ID',
    nullable: true,
    example: 'wedding/packages/cover/cover_1234567890',
  })
  @IsOptional()
  @IsString()
  coverImagePublicId: string | null;

  @ApiPropertyOptional({
    description: 'Ordered package gallery images',
    type: [ViewPackageImageDto],
  })
  @IsOptional()
  @Type(() => ViewPackageImageDto)
  images?: ViewPackageImageDto[];

  @ApiProperty({
    description: 'Creation date',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    description: 'Update date',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Deletion date',
    example: null,
    nullable: true,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deletedAt: Date | null;
}
