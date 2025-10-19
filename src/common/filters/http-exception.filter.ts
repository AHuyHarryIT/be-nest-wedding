import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ErrorResponse } from '../interfaces/api-response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  // constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getHttpStatus(exception);
    const errorResponse = this.createErrorResponse(exception, request);

    this.logger.error(
      `HTTP Status: ${status} Error Message: ${errorResponse.error?.message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json(errorResponse);
  }

  private getHttpStatus(exception: unknown): number {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private createErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const status = this.getHttpStatus(exception);

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      return {
        success: false,
        message: 'Request failed',
        error: {
          code: this.getErrorCode(status),
          message: this.extractErrorMessage(response, exception),
          details: typeof response === 'object' ? response : undefined,
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: process.env.API_VERSION || '1.0.0',
          requestId: this.generateRequestId(),
        },
      };
    }

    // Handle non-HTTP exceptions
    return {
      success: false,
      message: 'Internal server error',
      error: {
        code: this.getErrorCode(status),
        message:
          exception instanceof Error
            ? exception.message
            : 'Unknown error occurred',
        details:
          process.env.NODE_ENV === 'development'
            ? {
                stack: exception instanceof Error ? exception.stack : undefined,
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
  }

  private extractErrorMessage(
    response: string | Record<string, any>,
    exception: HttpException,
  ): string {
    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object' && 'message' in response) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const message = (response as any).message;
      if (typeof message === 'string') {
        return message;
      }
      if (Array.isArray(message) && message.length > 0) {
        return message.join(', ');
      }
    }

    return exception.message;
  }

  private getErrorCode(status: number): string {
    const errorCodes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.METHOD_NOT_ALLOWED]: 'METHOD_NOT_ALLOWED',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
      [HttpStatus.BAD_GATEWAY]: 'BAD_GATEWAY',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
    };

    return errorCodes[status] || 'UNKNOWN_ERROR';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
