import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'The name of the category',
    example: 'Flowers',
    maxLength: 255,
  })
  @IsString({ message: 'Category name must be a string' })
  @IsNotEmpty({ message: 'Category name is required' })
  @MaxLength(255, { message: 'Category name cannot exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'The description of the category',
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
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive?: boolean;
}
