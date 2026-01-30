import type { GenericRecord } from '../types';

export interface ApiResponse<T = GenericRecord<unknown>> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: GenericRecord<unknown>;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T = GenericRecord<unknown>> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}

export interface ErrorResponse extends ApiResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: GenericRecord<unknown>;
    stack?: string;
  };
}
