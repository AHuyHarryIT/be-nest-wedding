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

export const ApiUnauthorizedResponse = () => {
  return applyDecorators(
    ApiResponse({
      status: 401,
      description: 'Unauthorized access',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Request failed' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'UNAUTHORIZED' },
              message: { type: 'string', example: 'Unauthorized' },
              details: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Unauthorized' },
                  statusCode: { type: 'number', example: 401 },
                },
              },
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

export const ApiForbiddenResponse = (options?: { description?: string }) => {
  return applyDecorators(
    ApiResponse({
      status: 403,
      description: options?.description || 'Forbidden access',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Request failed' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'FORBIDDEN' },
              message: { type: 'string', example: 'Forbidden' },
              details: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Forbidden' },
                  statusCode: { type: 'number', example: 403 },
                },
              },
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

export const ApiNotFoundResponse = (options?: { description?: string }) => {
  return applyDecorators(
    ApiResponse({
      status: 404,
      description: options?.description || 'Resource not found',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Request failed' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'NOT_FOUND' },
              message: { type: 'string', example: 'Resource not found' },
              details: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Resource not found' },
                  statusCode: { type: 'number', example: 404 },
                },
              },
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

export const ApiConflictResponse = (options?: { description?: string }) => {
  return applyDecorators(
    ApiResponse({
      status: 409,
      description: options?.description || 'Conflict occurred',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Request failed' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'CONFLICT' },
              message: { type: 'string', example: 'Conflict occurred' },
              details: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Conflict occurred' },
                  statusCode: { type: 'number', example: 409 },
                },
              },
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
