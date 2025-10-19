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

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, code } = this.mapPrismaError(exception);

    const errorResponse: ErrorResponse = {
      success: false,
      message: 'Database operation failed',
      error: {
        code,
        message,
        details:
          process.env.NODE_ENV === 'development'
            ? {
                prismaCode: exception.code,
                meta: exception.meta,
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

    this.logger.error(
      `Prisma Error: ${exception.code} - ${message}`,
      exception.stack,
    );

    response.status(status).json(errorResponse);
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: HttpStatus;
    message: string;
    code: string;
  } {
    switch (exception.code) {
      case 'P2000':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'The provided value is too long for the column',
          code: 'VALUE_TOO_LONG',
        };

      case 'P2001':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'The record searched for does not exist',
          code: 'RECORD_NOT_FOUND',
        };

      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: this.getUniqueConstraintMessage(exception),
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
        };

      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Foreign key constraint failed',
          code: 'FOREIGN_KEY_CONSTRAINT_FAILED',
        };

      case 'P2004':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'A constraint failed on the database',
          code: 'CONSTRAINT_FAILED',
        };

      case 'P2005':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'The value stored in the database is invalid',
          code: 'INVALID_VALUE',
        };

      case 'P2006':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'The provided value is not valid',
          code: 'INVALID_VALUE_PROVIDED',
        };

      case 'P2007':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Data validation error',
          code: 'DATA_VALIDATION_ERROR',
        };

      case 'P2008':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Failed to parse the query',
          code: 'QUERY_PARSE_ERROR',
        };

      case 'P2009':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Failed to validate the query',
          code: 'QUERY_VALIDATION_ERROR',
        };

      case 'P2010':
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Raw query failed',
          code: 'RAW_QUERY_FAILED',
        };

      case 'P2011':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Null constraint violation',
          code: 'NULL_CONSTRAINT_VIOLATION',
        };

      case 'P2012':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Missing a required value',
          code: 'MISSING_REQUIRED_VALUE',
        };

      case 'P2013':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Missing the required argument',
          code: 'MISSING_REQUIRED_ARGUMENT',
        };

      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'The change would violate the required relation',
          code: 'RELATION_VIOLATION',
        };

      case 'P2015':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'A related record could not be found',
          code: 'RELATED_RECORD_NOT_FOUND',
        };

      case 'P2016':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Query interpretation error',
          code: 'QUERY_INTERPRETATION_ERROR',
        };

      case 'P2017':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'The records for relation are not connected',
          code: 'RECORDS_NOT_CONNECTED',
        };

      case 'P2018':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'The required connected records were not found',
          code: 'CONNECTED_RECORDS_NOT_FOUND',
        };

      case 'P2019':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Input error',
          code: 'INPUT_ERROR',
        };

      case 'P2020':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Value out of range for the type',
          code: 'VALUE_OUT_OF_RANGE',
        };

      case 'P2021':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'The table does not exist in the current database',
          code: 'TABLE_NOT_FOUND',
        };

      case 'P2022':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'The column does not exist in the current database',
          code: 'COLUMN_NOT_FOUND',
        };

      case 'P2023':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Inconsistent column data',
          code: 'INCONSISTENT_COLUMN_DATA',
        };

      case 'P2024':
        return {
          status: HttpStatus.REQUEST_TIMEOUT,
          message:
            'Timed out fetching a new connection from the connection pool',
          code: 'CONNECTION_TIMEOUT',
        };

      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: this.getRecordNotFoundMessage(exception),
          code: 'RECORD_NOT_FOUND_FOR_OPERATION',
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'An unexpected database error occurred',
          code: 'DATABASE_ERROR',
        };
    }
  }

  private getUniqueConstraintMessage(
    exception: Prisma.PrismaClientKnownRequestError,
  ): string {
    const target = exception.meta?.target;
    if (Array.isArray(target) && target.length > 0) {
      const fields = target.join(', ');
      return `A record with this ${fields} already exists`;
    }
    return 'A record with these values already exists';
  }

  private getRecordNotFoundMessage(
    exception: Prisma.PrismaClientKnownRequestError,
  ): string {
    const cause = exception.meta?.cause;
    if (typeof cause === 'string') {
      return cause;
    }
    return 'Record to update not found';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
