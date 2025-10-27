import { PaginationQueryDto } from '@/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class QueryProductDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'The active status of the product',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum stock quantity of the product',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({
    description: 'Maximum stock quantity of the product',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStock?: number;
}
