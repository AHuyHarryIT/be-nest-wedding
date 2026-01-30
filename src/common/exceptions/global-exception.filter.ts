import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../exceptions/app.exception';
import { ErrorResponseDto } from '../exceptions/error-response.dto';
import type { ClassValidatorError, GenericRecord } from '../types';

/**
 * Global exception filter for handling all exceptions
 * Provides consistent error response format across the API
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${errorResponse.statusCode} - ${errorResponse.message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponseDto {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: GenericRecord<unknown> | undefined;
    let errors: string[] | undefined;

    if (exception instanceof AppException) {
      // Custom application exceptions
      const response = exception.getResponse() as Record<string, unknown>;
      statusCode = exception.getStatus();
      code = (response.code as string) || 'INTERNAL_ERROR';
      message = (response.message as string) || message;
      details = response.details as GenericRecord<unknown>;
    } else if (exception instanceof HttpException) {
      // Built-in NestJS HTTP exceptions
      statusCode = exception.getStatus();
      const response = exception.getResponse() as
        | Record<string, unknown>
        | string;

      if (typeof response === 'object') {
        message =
          (response.message as string) || (response.error as string) || message;
        code = this.mapHttpStatusToCode(statusCode);

        // Handle validation errors from class-validator
        if (
          statusCode === HttpStatus.BAD_REQUEST &&
          Array.isArray(response.message)
        ) {
          const validationErrors = this.formatValidationErrors(
            response.message as ClassValidatorError[],
          );
          errors = validationErrors;
          message = 'Validation failed';
        }
      } else {
        message = response;
        code = this.mapHttpStatusToCode(statusCode);
      }
    } else if (exception instanceof Error) {
      // Standard JavaScript errors
      message = exception.message || message;
      code = 'INTERNAL_ERROR';
      if (process.env.NODE_ENV !== 'production') {
        details = { stack: exception.stack };
      }
    }

    return {
      success: false,
      statusCode,
      code,
      message,
      details,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
  }

  private mapHttpStatusToCode(statusCode: number): string {
    const statusMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
    };

    return statusMap[statusCode] || 'INTERNAL_ERROR';
  }

  private formatValidationErrors(errors: ClassValidatorError[]): string[] {
    if (!Array.isArray(errors)) {
      return [];
    }

    return errors
      .map((error: ClassValidatorError | string) => {
        if (typeof error === 'string') {
          return error;
        }
        if (error.constraints) {
          return Object.values(error.constraints).join(', ');
        }
        if (typeof error === 'object' && error !== null && 'message' in error) {
          return (error as GenericRecord<unknown>).message as string;
        }
        return 'Unknown validation error';
      })
      .filter(Boolean);
  }
}
