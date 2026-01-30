import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Standard pagination query parameters
 * Used in all list endpoints
 */
export class PaginationQueryDto {
  @ApiProperty({
    description: 'Number of records to skip',
    type: Number,
    required: false,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiProperty({
    description: 'Number of records to return',
    type: Number,
    required: false,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 10;

  @ApiProperty({
    description: 'Sort field and direction (field:asc or field:desc)',
    type: String,
    required: false,
    example: 'createdAt:desc',
  })
  @IsOptional()
  sortBy?: string;

  @ApiProperty({
    description: 'Search keyword (optional)',
    type: String,
    required: false,
  })
  @IsOptional()
  search?: string;
}
