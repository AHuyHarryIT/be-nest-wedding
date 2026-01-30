/**
 * Common type definitions for the application
 * Provides strict typing for common patterns and API structures
 */

/**
 * Generic record type for flexible key-value pairs with known value types
 */
export type GenericRecord<T = unknown> = Record<string, T>;

/**
 * Common request/response field constraint type
 */
export interface CommonFieldConstraints {
  [field: string]: string | string[];
}

/**
 * Database query filter type
 */
export interface QueryFilter<T = GenericRecord<unknown>> {
  where?: GenericRecord<unknown>;
  skip?: number;
  take?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
  include?: GenericRecord<boolean | GenericRecord<unknown>>;
  select?: GenericRecord<boolean>;
  data?: Partial<T>;
}

/**
 * Swagger operation schema type
 */
export interface SwaggerOperationSchema {
  operationId?: string;
  security?: GenericRecord<unknown>[];
  responses: Record<string, SwaggerResponseSchema>;
  [key: string]: unknown;
}

/**
 * Swagger response schema type
 */
export interface SwaggerResponseSchema {
  description: string;
  content?: SwaggerContent;
  [key: string]: unknown;
}

/**
 * Swagger content type
 */
export interface SwaggerContent {
  'application/json'?: SwaggerSchemaRef;
  [key: string]: unknown;
}

/**
 * Swagger schema reference
 */
export interface SwaggerSchemaRef {
  schema?: GenericRecord<unknown>;
  [key: string]: unknown;
}

/**
 * Validation error constraint type
 */
export interface ValidationErrorConstraint {
  [field: string]: string | string[];
}

/**
 * Class-validator error object
 */
export interface ClassValidatorError {
  constraints?: ValidationErrorConstraint;
  message?: string;
  property?: string;
  children?: ClassValidatorError[];
  value?: unknown;
  [key: string]: unknown;
}

/**
 * Validation error response type
 */
export type ValidationErrorResponse =
  | string
  | ClassValidatorError
  | GenericRecord<unknown>;

/**
 * HTTP response object type
 */
export interface HttpResponseObject {
  message?: string;
  error?: string;
  statusCode?: number;
  code?: string;
  details?: GenericRecord<unknown>;
  timestamp?: string;
  path?: string;
  [key: string]: unknown;
}

/**
 * Exception context type
 */
export interface ExceptionContext {
  statusCode: number;
  body: HttpResponseObject;
}

/**
 * Prisma CRUD options generic
 */
export interface PrismaCrudOptions<T = GenericRecord<unknown>> {
  where?: GenericRecord<unknown>;
  data?: Partial<T>;
  include?: GenericRecord<boolean | GenericRecord<unknown>>;
  select?: GenericRecord<boolean>;
  skip?: number;
  take?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

/**
 * Generic pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
