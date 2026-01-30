import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumber, Min, MaxLength } from 'class-validator';
import { VisibilityLevel } from 'generated/prisma';

export class UploadImageToAlbumDto {
  @ApiPropertyOptional({
    description: 'Image caption (max 500 characters)',
    example: 'Beautiful wedding moment',
    maxLength: 500,
  })
  @IsString({ message: 'Image caption must be a string' })
  @IsOptional()
  @MaxLength(500, { message: 'Image caption cannot exceed 500 characters' })
  caption?: string;

  @ApiPropertyOptional({
    description: 'Sort order in album (minimum 0)',
    example: 1,
    minimum: 0,
  })
  @IsNumber({ allowInfinity: false, allowNaN: false }, { message: 'Sort order must be a valid number' })
  @IsOptional()
  @Min(0, { message: 'Sort order must be at least 0' })
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Image visibility level',
    enum: VisibilityLevel,
  })
  @IsEnum(VisibilityLevel, { message: 'Visibility level must be a valid enum value' })
  @IsOptional()
  visibility?: VisibilityLevel;

  @ApiPropertyOptional({
    description: 'Image usage type',
    example: 'album',
    default: 'album',
    maxLength: 50,
  })
  @IsString({ message: 'Usage type must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Usage type cannot exceed 50 characters' })
  usageType?: string;
}
