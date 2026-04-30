import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import {
  ErrorResponseDto,
  SuccessResponseDto,
  PaginatedResponseDto,
  FieldErrorDto,
} from '../exceptions';
import {
  PaginationQueryDto,
  PaymentResponseDto,
  OrderResponseDto,
  BookingResponseDto,
} from '../dtos';
import type { SwaggerOperationSchema, SwaggerResponseSchema } from '../types';

/**
 * Swagger documentation setup
 * Configures OpenAPI/Swagger for the entire application
 * with consistent error responses and global schemas
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Wedding Studio API')
    .setDescription(
      'Comprehensive RESTful API for wedding photography and services management. ' +
        'Includes booking management, payment processing, and role-based access control.',
    )
    .setVersion('1.0.0')
    .setContact(
      'Support',
      'https://github.com/AHuyHarryIT/be-nest-wedding',
      'support@weddingstudio.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for authentication',
        name: 'authorization',
        in: 'header',
      },
      'bearer',
    )
    .addServer(
      `http://localhost:${process.env.PORT || 3000}`,
      'Local Development',
    )
    .addServer('https://api.weddingstudio.com', 'Production')
    .setTermsOfService('https://weddingstudio.com/terms')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      ErrorResponseDto,
      SuccessResponseDto,
      PaginatedResponseDto,
      FieldErrorDto,
      PaginationQueryDto,
      PaymentResponseDto,
      OrderResponseDto,
      BookingResponseDto,
    ],
    deepScanRoutes: true,
  });

  // Add global response schemas for common error scenarios
  Object.values(document.paths || {}).forEach((pathItem) => {
    Object.values(pathItem || {}).forEach(
      (operation: SwaggerOperationSchema) => {
        if (!operation.responses) return;

        // Add 400 Bad Request with validation errors if POST/PATCH/PUT
        const method =
          operation.operationId?.split('_')[0]?.toLowerCase() || '';
        if (['post', 'patch', 'put'].includes(method)) {
          operation.responses['400'] = {
            description: 'Bad Request - Validation failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponseDto',
                },
              },
            },
          };
        }

        // Add 401 Unauthorized for protected routes
        if (operation.security) {
          operation.responses['401'] = {
            description: 'Unauthorized - Invalid or missing JWT token',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponseDto',
                },
              },
            },
          };

          operation.responses['403'] = {
            description: 'Forbidden - Insufficient permissions',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponseDto',
                },
              },
            },
          };
        }

        // Add 404 Not Found
        const method2 =
          operation.operationId?.split('_')[0]?.toLowerCase() || '';
        if (['get', 'patch', 'delete'].includes(method2)) {
          operation.responses['404'] = {
            description: 'Not Found - Resource does not exist',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponseDto',
                },
              },
            },
          };
        }

        // Add 500 Internal Server Error
        operation.responses['500'] = {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponseDto',
              },
            },
          },
        };
      },
    );
  });

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customCssUrl:
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui.css',
    customSiteTitle: 'Wedding Studio API Documentation',
  });

  console.log(
    `📚 Swagger documentation available at http://localhost:${process.env.PORT || 3000}/api/docs`,
  );
}

/**
 * Common response schema references for Swagger
 * Use in @ApiResponse decorators to reference standard error schemas
 */
export const SwaggerResponseSchemas = {
  errorResponse: {
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponseDto',
        },
      },
    },
  },
  successResponse: (
    description: string,
    schemaRef?: string,
  ): SwaggerResponseSchema => ({
    description,
    content: {
      'application/json': {
        schema: schemaRef
          ? { $ref: `#/components/schemas/${schemaRef}` }
          : { $ref: '#/components/schemas/SuccessResponseDto' },
      },
    },
  }),
  paginatedResponse: (
    schemaRef: string,
    description: string,
  ): SwaggerResponseSchema => ({
    description,
    content: {
      'application/json': {
        schema: {
          $ref: `#/components/schemas/PaginatedResponseDto${schemaRef}`,
        },
      },
    },
  }),
};
