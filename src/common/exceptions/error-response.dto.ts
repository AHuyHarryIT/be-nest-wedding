import { ApiProperty } from '@nestjs/swagger';

/**
 * Validation error details for a single field
 */
export class FieldErrorDto {
  @ApiProperty({
    description: 'Field name that failed validation',
    example: 'email',
  })
  field: string;

  @ApiProperty({
    description: 'Error code for this validation failure',
    example: 'isEmail',
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'email must be an email',
  })
  message: string;

  @ApiProperty({
    description: 'Received value that failed validation',
    example: 'invalid-email',
    required: false,
  })
  value?: any;
}

/**
 * Standard error response DTO
 * Used for all error responses across the API
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'Whether the request was successful',
    example: false,
  })
  success: boolean = false;

  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error code for categorizing the error',
    example: 'VALIDATION_ERROR',
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Validation failed',
  })
  message: string;

  @ApiProperty({
    description: 'Additional error details',
    example: null,
    required: false,
  })
  details?: any;

  @ApiProperty({
    description: 'Validation field errors (if validation error)',
    type: [FieldErrorDto],
    required: false,
  })
  errors?: FieldErrorDto[];

  @ApiProperty({
    description: 'Timestamp of error occurrence',
    example: '2024-01-30T10:30:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path that caused the error',
    example: '/api/payments',
  })
  path: string;
}

/**
 * Success response DTO for single resource
 */
export class SuccessResponseDto<T> {
  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success: boolean = true;

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Success message',
    example: 'Operation completed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Response data - varies by endpoint',
    example: {},
    required: false,
  })
  data: T;

  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-30T10:30:00Z',
  })
  timestamp: string;
}

/**
 * Paginated response DTO
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success: boolean = true;

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Success message',
    example: 'Records retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of records retrieved',
    type: [Object],
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Total number of records',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Number of records returned',
    example: 10,
  })
  count: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasMore: boolean;

  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-30T10:30:00Z',
  })
  timestamp: string;
}
