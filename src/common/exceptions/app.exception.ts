import { HttpException, HttpStatus } from '@nestjs/common';

export interface AppExceptionOptions {
  code?: string;
  message: string;
  statusCode?: HttpStatus;
  details?: any;
  cause?: Error;
}

export interface AppExceptionResponse {
  code: string;
  message: string;
  details?: any;
}

/**
 * Base custom exception for the application
 * Provides consistent error structure with code, message, statusCode, and details
 */
export class AppException extends HttpException {
  public readonly code: string;
  public readonly details?: any;

  constructor(options: AppExceptionOptions) {
    const {
      code = 'INTERNAL_ERROR',
      message,
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
      details,
      cause,
    } = options;

    const errorResponse: AppExceptionResponse = {
      code,
      message,
      ...(details && { details }),
    };

    super(errorResponse, statusCode, { cause: cause as any });

    this.code = code;
    this.details = details;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, AppException.prototype);
  }
}

/**
 * Validation exception for input validation failures
 */
export class ValidationException extends AppException {
  constructor(message: string, details?: any) {
    super({
      code: 'VALIDATION_ERROR',
      message,
      statusCode: HttpStatus.BAD_REQUEST,
      details,
    });
  }
}

/**
 * Not found exception for missing resources
 */
export class ResourceNotFoundException extends AppException {
  constructor(resource: string, identifier?: any) {
    super({
      code: 'RESOURCE_NOT_FOUND',
      message: `${resource} not found`,
      statusCode: HttpStatus.NOT_FOUND,
      details: identifier ? { identifier } : undefined,
    });
  }
}

/**
 * Conflict exception for business logic violations
 */
export class ConflictException extends AppException {
  constructor(message: string, code = 'CONFLICT', details?: any) {
    super({
      code,
      message,
      statusCode: HttpStatus.CONFLICT,
      details,
    });
  }
}

/**
 * Forbidden exception for authorization failures
 */
export class ForbiddenException extends AppException {
  constructor(message = 'Access denied', code = 'FORBIDDEN', details?: any) {
    super({
      code,
      message,
      statusCode: HttpStatus.FORBIDDEN,
      details,
    });
  }
}

/**
 * Unprocessable entity exception for business logic violations
 */
export class UnprocessableEntityException extends AppException {
  constructor(message: string, code = 'UNPROCESSABLE_ENTITY', details?: any) {
    super({
      code,
      message,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    });
  }
}

/**
 * Invalid state exception for operations on invalid entity states
 */
export class InvalidStateException extends AppException {
  constructor(resource: string, currentState: string, requiredState: string) {
    super({
      code: 'INVALID_STATE',
      message: `Cannot perform this operation on ${resource} in ${currentState} state. Required state: ${requiredState}`,
      statusCode: HttpStatus.CONFLICT,
      details: { currentState, requiredState },
    });
  }
}
