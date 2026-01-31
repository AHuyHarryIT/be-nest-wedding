import { PaginationQueryDto } from '@/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class QueryServiceDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by service active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean value' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value as boolean;
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum service price filter (minimum 0)',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber(
    { allowInfinity: false, allowNaN: false },
    { message: 'Minimum price must be a valid number' },
  )
  @Min(0, { message: 'Minimum price cannot be negative' })
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum service price filter (minimum 0)',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber(
    { allowInfinity: false, allowNaN: false },
    { message: 'Maximum price must be a valid number' },
  )
  @Min(0, { message: 'Maximum price cannot be negative' })
  maxPrice?: number;
}
