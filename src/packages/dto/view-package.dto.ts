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
