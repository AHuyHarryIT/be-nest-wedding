import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ResponseMetaDto {
  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  version: string;

  @ApiProperty({ required: false })
  requestId?: string;
}

export class ErrorDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  details?: any;

  @ApiProperty({ required: false })
  stack?: string;
}

export class PaginationRequestDto {
  @ApiPropertyOptional({ 
    description: 'Page number (1-indexed)', 
    default: 1,
    example: 1,
    minimum: 1,
  })
  @IsNumber({ allowInfinity: false, allowNaN: false }, { message: 'Page must be a valid number' })
  @Min(1, { message: 'Page must be at least 1' })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ 
    description: 'Number of items per page', 
    default: 10,
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsNumber({ allowInfinity: false, allowNaN: false }, { message: 'Limit must be a valid number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class PaginationDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNext: boolean;

  @ApiProperty()
  hasPrevious: boolean;
}

export class ApiResponseDto<T = any> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  data?: T;

  @ApiProperty({ type: ErrorDto, required: false })
  error?: ErrorDto;

  @ApiProperty({ type: ResponseMetaDto, required: false })
  meta?: ResponseMetaDto;
}

export class PaginatedResponseDto<T = any> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [Object] })
  data: T[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;

  @ApiProperty({ type: ResponseMetaDto, required: false })
  meta?: ResponseMetaDto;
}
