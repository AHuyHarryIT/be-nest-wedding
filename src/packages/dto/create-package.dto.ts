import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  ArrayMinSize,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePackageDto {
  @ApiProperty({
    description: 'The name of the package',
    example: 'Premium Wedding Package',
    maxLength: 255,
  })
  @IsString({ message: 'Package name must be a string' })
  @IsNotEmpty({ message: 'Package name is required' })
  @MaxLength(255, { message: 'Package name cannot exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'The description of the package',
    example:
      'Comprehensive wedding package with photography, videography, and more',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Package description must be a string' })
  @MaxLength(1000, {
    message: 'Package description cannot exceed 1000 characters',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'The price of the package',
    example: 5000,
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

  @ApiPropertyOptional({
    description: 'Whether the package is active',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Array of service IDs to associate with this package',
    example: ['service-id-1', 'service-id-2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  serviceIds?: string[];
}

export class CreatePackageResponseDto {
  @ApiProperty({
    description: 'Package ID',
    example: 'uuid-1234',
  })
  id: string;

  @ApiProperty({
    description: 'Package name',
    example: 'Premium Wedding Package',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Package description',
    example:
      'Comprehensive wedding package with photography, videography, and more',
    nullable: true,
  })
  description: string | null;

  @ApiPropertyOptional({
    description: 'Package price',
    example: 5000,
  })
  price: number;

  @ApiPropertyOptional({
    description: 'Is package active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation date',
    example: '2025-01-01T00:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Update date',
    example: '2025-01-01T00:00:00.000Z',
  })
  updated_at: Date;

  @ApiPropertyOptional({
    description: 'Deletion date',
    example: null,
    nullable: true,
  })
  deleted_at: Date | null;
}
