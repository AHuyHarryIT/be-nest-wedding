import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse,
  PaginatedResponse,
} from '../interfaces/api-response.interface';
import { Request, Response } from 'express';

interface PaginatedData<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | PaginatedResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | PaginatedResponse<T>> {
    return next.handle().pipe(
      map((data: any): ApiResponse<T> | PaginatedResponse<T> => {
        // Check if the response is already formatted
        if (this.isFormattedResponse(data)) {
          return data as ApiResponse<T> | PaginatedResponse<T>;
        }

        // Handle paginated responses
        if (this.isPaginatedData(data)) {
          return {
            success: true,
            message: 'Request successful',
            data: data.data as T[],
            pagination: data.pagination,
            meta: {
              timestamp: new Date().toISOString(),
              version: process.env.API_VERSION || '1.0.0',
              requestId: this.generateRequestId(),
            },
          } as PaginatedResponse<T>;
        }

        // Handle regular responses
        return {
          success: true,
          message: this.getSuccessMessage(context),
          data: data as T,
          meta: {
            timestamp: new Date().toISOString(),
            version: process.env.API_VERSION || '1.0.0',
            requestId: this.generateRequestId(),
          },
        } as ApiResponse<T>;
      }),
    );
  }

  private isFormattedResponse(
    data: any,
  ): data is ApiResponse | PaginatedResponse {
    return Boolean(data && typeof data === 'object' && 'success' in data);
  }

  private isPaginatedData(data: any): data is PaginatedData {
    return Boolean(
      data &&
        typeof data === 'object' &&
        'data' in data &&
        'pagination' in data,
    );
  }

  private getSuccessMessage(context: ExecutionContext): string {
    const method = context.switchToHttp().getRequest<Request>().method;

    switch (method) {
      case 'POST':
        return 'Resource created successfully';
      case 'PUT':
      case 'PATCH':
        return 'Resource updated successfully';
      case 'DELETE':
        return 'Resource deleted successfully';
      case 'GET':
      default:
        return 'Request successful';
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
