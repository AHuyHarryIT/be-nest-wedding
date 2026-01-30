import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsPositive,
  Min,
  Max,
  IsString,
  IsEnum,
} from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based index)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive({ message: 'Page must be a positive number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page (1-100)',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive({ message: 'Limit must be a positive number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Search term for filtering results (trimmed)',
    example: 'wedding',
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  search?: string;

  @ApiPropertyOptional({
    description: 'Field name to sort results by',
    example: 'created_at',
  })
  @IsOptional()
  @IsString({ message: 'Sort field must be a string' })
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order (ascending or descending)',
    enum: ['asc', 'desc'],
    default: 'desc',
    example: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: 'Sort order must be either "asc" or "desc"',
  })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
