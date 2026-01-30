import { PaginationQueryDto } from '@/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class QueryProductDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by product active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum stock quantity filter (minimum 0)',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber(
    { allowInfinity: false, allowNaN: false },
    { message: 'Minimum stock must be a valid number' },
  )
  @Min(0, { message: 'Minimum stock cannot be negative' })
  minStock?: number;

  @ApiPropertyOptional({
    description: 'Maximum stock quantity filter (minimum 0)',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber(
    { allowInfinity: false, allowNaN: false },
    { message: 'Maximum stock must be a valid number' },
  )
  @Min(0, { message: 'Maximum stock cannot be negative' })
  maxStock?: number;
}
