import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiResponse,
  ApiResponseCommonMetadata,
  ApiResponseNoStatusOptions,
  getSchemaPath,
} from '@nestjs/swagger';

export const ApiStandardResponse = <TModel extends Type<any>>(
  model: TModel,
  options?: {
    description?: string;
    status?: number;
  },
) => {
  return applyDecorators(
    ApiResponse({
      status: options?.status || 200,
      description: options?.description || 'Success',
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Request successful' },
              data: {
                $ref: getSchemaPath(model),
              },
              meta: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string', format: 'date-time' },
                  version: { type: 'string', example: '1.0.0' },
                  requestId: { type: 'string' },
                },
              },
            },
          },
        ],
      },
    }),
  );
};

export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
  options?: {
    description?: string;
  },
) => {
  return applyDecorators(
    ApiOkResponse({
      description:
        options?.description || 'Paginated list retrieved successfully',
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Request successful' },
              data: {
                type: 'array',
                items: {
                  $ref: getSchemaPath(model),
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number', example: 1 },
                  limit: { type: 'number', example: 10 },
                  total: { type: 'number', example: 100 },
                  totalPages: { type: 'number', example: 10 },
                  hasNext: { type: 'boolean', example: true },
                  hasPrevious: { type: 'boolean', example: false },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string', format: 'date-time' },
                  version: { type: 'string', example: '1.0.0' },
                  requestId: { type: 'string' },
                },
              },
            },
          },
        ],
      },
    }),
  );
};

export const ApiErrorResponse = (options?: {
  status?: number;
  description?: string;
}) => {
  return applyDecorators(
    ApiResponse({
      status: options?.status || 400,
      description: options?.description || 'Error occurred',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Request failed' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'BAD_REQUEST' },
              message: { type: 'string', example: 'Invalid input data' },
              details: { type: 'object' },
            },
          },
          meta: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              version: { type: 'string', example: '1.0.0' },
              requestId: { type: 'string' },
            },
          },
        },
      },
    }),
  );
};

export const ApiSuccessResponse = (options?: ApiResponseCommonMetadata) => {
  return applyDecorators(
    ApiResponse({
      status: options?.status || 200,
      description: options?.description || 'Operation successful',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: {
            type: 'string',
            example: options?.description || 'Request successful',
          },
          data: { type: 'object', nullable: true },
          meta: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              version: { type: 'string', example: '1.0.0' },
              requestId: { type: 'string' },
            },
          },
        },
      },
    }),
  );
};

export const ApiCreatedSuccessResponse = (
  options?: ApiResponseNoStatusOptions,
) => {
  return ApiSuccessResponse({
    status: 201,
    description: options?.description || 'Resource created successfully',
  });
};

export const ApiUpdatedSuccessResponse = (options?: {
  description?: string;
}) => {
  return ApiSuccessResponse({
    status: 200,
    description: options?.description || 'Resource updated successfully',
  });
};

export const ApiDeletedSuccessResponse = (options?: {
  description?: string;
}) => {
  return ApiSuccessResponse({
    status: 200,
    description: options?.description || 'Resource deleted successfully',
  });
};
