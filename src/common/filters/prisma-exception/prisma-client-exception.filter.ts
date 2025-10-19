import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from 'generated/prisma';
import { ErrorResponse } from '../../interfaces/api-response.interface';

@Catch(
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientValidationError,
)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, code } = this.mapPrismaClientError(exception);

    const errorResponse: ErrorResponse = {
      success: false,
      message: 'Database operation failed',
      error: {
        code,
        message,
        details:
          process.env.NODE_ENV === 'development'
            ? {
                originalMessage:
                  exception instanceof Error ? exception.message : 'Unknown',
                path: request.url,
                method: request.method,
              }
            : undefined,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        requestId: this.generateRequestId(),
      },
    };

    this.logger.error(`Prisma Client Error: ${message}`, exception);

    response.status(status).json(errorResponse);
  }

  private mapPrismaClientError(exception: unknown): {
    status: HttpStatus;
    message: string;
    code: string;
  } {
    if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Unknown database error occurred',
        code: 'UNKNOWN_DATABASE_ERROR',
      };
    }

    if (exception instanceof Prisma.PrismaClientRustPanicError) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database engine encountered an internal error',
        code: 'DATABASE_ENGINE_ERROR',
      };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to initialize database connection',
        code: 'DATABASE_INITIALIZATION_ERROR',
      };
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: this.extractValidationMessage(exception.message),
        code: 'DATABASE_VALIDATION_ERROR',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected database error occurred',
      code: 'DATABASE_ERROR',
    };
  }

  private extractValidationMessage(fullMessage: string): string {
    // Extract more user-friendly message from Prisma validation error
    const lines = fullMessage.split('\n');

    // Look for lines that contain validation issues
    for (const line of lines) {
      if (line.includes('Unknown argument') || line.includes('Unknown field')) {
        return 'Invalid field or argument provided';
      }
      if (line.includes('Missing required')) {
        return 'Required field is missing';
      }
      if (line.includes('Invalid value')) {
        return 'Invalid value provided for field';
      }
    }

    return 'Invalid query parameters or data structure';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
