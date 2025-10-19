import {
  ApiResponse,
  PaginatedResponse,
} from '../interfaces/api-response.interface';

export class ResponseBuilder {
  private static generateMeta() {
    return {
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  static success<T>(data: T, message = 'Request successful'): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      meta: this.generateMeta(),
    };
  }

  static created<T>(
    data: T,
    message = 'Resource created successfully',
  ): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      meta: this.generateMeta(),
    };
  }

  static updated<T>(
    data: T,
    message = 'Resource updated successfully',
  ): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      meta: this.generateMeta(),
    };
  }

  static deleted(message = 'Resource deleted successfully'): ApiResponse<null> {
    return {
      success: true,
      message,
      data: null,
      meta: this.generateMeta(),
    };
  }

  static paginated<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    },
    message = 'Request successful',
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return {
      success: true,
      message,
      data,
      pagination: {
        ...pagination,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrevious: pagination.page > 1,
      },
      meta: this.generateMeta(),
    };
  }

  static error(
    message: string,
    code: string,
    details?: any,
  ): ApiResponse<null> {
    return {
      success: false,
      message: 'Request failed',
      data: null,
      error: {
        code,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        details,
      },
      meta: this.generateMeta(),
    };
  }
}
