import { ApiProperty } from '@nestjs/swagger';

/**
 * Generic API response wrapper for paginated data
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of data items',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Total number of records matching query',
    type: Number,
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Number of records skipped',
    type: Number,
    example: 0,
  })
  skip: number;

  @ApiProperty({
    description: 'Number of records returned',
    type: Number,
    example: 10,
  })
  take: number;

  @ApiProperty({
    description: 'Number of pages',
    type: Number,
    example: 10,
  })
  pages: number;

  @ApiProperty({
    description: 'Current page number (1-based)',
    type: Number,
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Whether there are more pages',
    type: Boolean,
    example: true,
  })
  hasMore: boolean;

  constructor(data: T[], total: number, skip: number, take: number) {
    this.data = data;
    this.total = total;
    this.skip = skip;
    this.take = take;
    this.pages = Math.ceil(total / take) || 1;
    this.page = Math.floor(skip / take) + 1;
    this.hasMore = skip + take < total;
  }
}

/**
 * Generic API response wrapper for single item
 */
export class SingleResponseDto<T> {
  @ApiProperty({
    description: 'Response data',
  })
  data: T;

  @ApiProperty({
    description: 'Response message',
    type: String,
  })
  message: string;

  constructor(data: T, message = 'Success') {
    this.data = data;
    this.message = message;
  }
}
