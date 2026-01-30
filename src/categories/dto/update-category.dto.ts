import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Category name (max 255 characters)',
    example: 'Flowers',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Category name must be a string' })
  @MaxLength(255, { message: 'Category name cannot exceed 255 characters' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Category description (max 1000 characters)',
    example: 'Beautiful flowers for weddings',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Category description must be a string' })
  @MaxLength(1000, {
    message: 'Category description cannot exceed 1000 characters',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the category is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'is_active must be a boolean value' })
  is_active?: boolean;
}
