import { PaginationDto } from '../dto/response.dto';

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationDto;
}

export class PaginationHelper {
  /**
   * Calculate skip value for Prisma
   */
  static getSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Calculate pagination metadata
   */
  static getPaginationMeta(
    page: number,
    limit: number,
    total: number,
  ): PaginationDto {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Create paginated response
   */
  static createPaginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
  ): PaginatedResult<T> {
    return {
      data,
      pagination: this.getPaginationMeta(page, limit, total),
    };
  }

  /**
   * Get default pagination params
   */
  static getDefaultParams(): PaginationParams {
    return {
      page: 1,
      limit: 10,
      sortOrder: 'desc',
    };
  }

  /**
   * Merge params with defaults
   */
  static mergeWithDefaults(
    params: Partial<PaginationParams>,
  ): PaginationParams {
    return {
      ...this.getDefaultParams(),
      ...params,
    };
  }
}
