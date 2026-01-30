# Swagger/OpenAPI Documentation Best Practices

**Goal:** Complete API documentation with proper decorators, schemas, and examples.

---

## 1. Swagger Setup

File: [src/main.ts](src/main.ts)

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Wedding Management API')
    .setDescription('Complete API for wedding service management and payment processing')
    .setVersion('1.0.0')
    .setContact({
      name: 'API Support',
      url: 'https://support.example.com',
      email: 'support@example.com',
    })
    .setLicense(
      'Proprietary',
      'https://example.com/license',
    )
    .setExternalDoc(
      'OpenAPI JSON',
      '/api-docs-json',
    )
    .addBearerAuth()
    .addServer('http://localhost:3000', 'Development')
    .addServer('https://api.example.com', 'Production')
    .addTag('Auth', 'Authentication & Authorization')
    .addTag('Users', 'User Management')
    .addTag('Payments', 'Payment Processing')
    .addTag('Orders', 'Order Management')
    .addTag('Bookings', 'Booking Management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true,
    },
  });

  await app.listen(3000);
}
bootstrap();
```

---

## 2. Complete Controller with Swagger

File: [src/modules/payments/payments.controller.ts](src/modules/payments/payments.controller.ts)

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  QueryPaymentDto,
  PaymentDto,
  PaymentDetailsDto,
} from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Create Payment
   * Creates a new payment record for an order.
   * Validates order exists and has remaining balance.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new payment',
    description: 'Creates a payment record for an order. Amount must match remaining balance.',
    operationId: 'createPayment',
  })
  @ApiBody({
    type: CreatePaymentDto,
    description: 'Payment creation payload',
    examples: {
      cash: {
        value: {
          orderId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 5000000,
          method: 'CASH',
          description: 'Deposit payment',
        },
        description: 'Cash payment example',
      },
      eWallet: {
        value: {
          orderId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 1000000,
          method: 'E_WALLET',
          description: 'E-wallet payment',
          dueDate: '2026-03-15T00:00:00Z',
        },
        description: 'E-wallet with due date',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    type: PaymentDto,
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        orderId: '550e8400-e29b-41d4-a716-446655440001',
        paymentSequence: 1,
        amount: 5000000,
        method: 'CASH',
        status: 'PENDING',
        createdAt: '2026-01-30T10:00:00Z',
        updatedAt: '2026-01-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    schema: {
      example: {
        message: [
          'amount must be a number conforming to the specified constraints',
          'orderId must be a UUID',
        ],
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
    schema: {
      example: {
        message: 'Order not found',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  async create(@Body() createPaymentDto: CreatePaymentDto): Promise<PaymentDto> {
    return this.paymentsService.create(createPaymentDto);
  }

  /**
   * Get All Payments
   * Retrieves paginated list of payments with optional filters.
   */
  @Get()
  @ApiOperation({
    summary: 'Get all payments',
    description: 'Returns a paginated list of payments with optional filtering by status, method, or order.',
    operationId: 'getAllPayments',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (1-based)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Records per page (1-100)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'PARTIAL_PAID', 'SUCCESSFUL', 'FAILED', 'CANCELLED'],
    description: 'Filter by payment status',
  })
  @ApiQuery({
    name: 'method',
    required: false,
    enum: ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'E_WALLET'],
    description: 'Filter by payment method',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'dueDate', 'amount', 'status'],
    example: 'createdAt',
    description: 'Sort field',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Sort order',
  })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved successfully',
    type: [PaymentDto],
    schema: {
      type: 'array',
      items: {
        $ref: '#/components/schemas/PaymentDto',
      },
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          orderId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 1000000,
          method: 'E_WALLET',
          status: 'PENDING',
          createdAt: '2026-01-30T10:00:00Z',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          orderId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 4000000,
          method: 'CASH',
          status: 'SUCCESSFUL',
          createdAt: '2026-01-31T10:00:00Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(@Query() query: QueryPaymentDto): Promise<PaymentDto[]> {
    return this.paymentsService.findMany(query);
  }

  /**
   * Get Payment by ID
   * Retrieves a single payment record with full details.
   */
  @Get(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Payment ID (UUID)',
  })
  @ApiOperation({
    summary: 'Get payment by ID',
    description: 'Returns detailed information for a specific payment.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment retrieved successfully',
    type: PaymentDto,
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        orderId: '550e8400-e29b-41d4-a716-446655440001',
        paymentSequence: 1,
        paymentType: 'REMAINING',
        amount: 1000000,
        method: 'E_WALLET',
        status: 'PENDING',
        description: 'Remaining payment',
        dueDate: '2026-03-15T00:00:00Z',
        attemptCount: 0,
        createdAt: '2026-01-30T10:00:00Z',
        updatedAt: '2026-01-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async findOne(@Param('id') id: string): Promise<PaymentDto> {
    return this.paymentsService.findOne(id);
  }

  /**
   * Get Payment Details
   * Retrieves payment with related order and attempt history.
   */
  @Get(':id/details')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Payment ID (UUID)',
  })
  @ApiOperation({
    summary: 'Get detailed payment information',
    description: 'Returns payment with related order details and attempt history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved successfully',
    type: PaymentDetailsDto,
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        orderId: '550e8400-e29b-41d4-a716-446655440001',
        amount: 1000000,
        method: 'E_WALLET',
        status: 'PENDING',
        order: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          bookingId: '550e8400-e29b-41d4-a716-446655440002',
          totalPrice: 5000000,
          totalPaid: 4000000,
          status: 'UNPAID',
        },
        attempts: [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            attemptNumber: 1,
            status: 'FAILED',
            resultCode: 'TRANSACTION_DECLINED',
            createdAt: '2026-01-30T11:00:00Z',
          },
        ],
        gatewayTransactions: [
          {
            id: '550e8400-e29b-41d4-a716-446655440020',
            gatewayProvider: 'MOMO',
            gatewayTransactionId: 'MOMO123456',
            amount: 1000000,
            gatewayStatus: 'FAILED',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async getDetails(@Param('id') id: string): Promise<PaymentDetailsDto> {
    return this.paymentsService.getDetails(id);
  }

  /**
   * Update Payment
   * Updates payment details (status, due date, notes).
   */
  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Payment ID (UUID)',
  })
  @ApiOperation({
    summary: 'Update payment',
    description: 'Updates payment details. Only status and dates can be updated.',
  })
  @ApiBody({
    type: UpdatePaymentDto,
    description: 'Payment update payload (all fields optional)',
    examples: {
      updateStatus: {
        value: { status: 'PARTIAL_PAID' },
        description: 'Update payment status',
      },
      updateDueDate: {
        value: { dueDate: '2026-04-15T00:00:00Z' },
        description: 'Extend due date',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Payment updated successfully',
    type: PaymentDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data',
  })
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ): Promise<PaymentDto> {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  /**
   * Cancel Payment
   * Cancels a payment with reason.
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Payment ID (UUID)',
  })
  @ApiOperation({
    summary: 'Cancel a payment',
    description: 'Cancels payment and sets status to CANCELLED.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Cancellation reason',
          example: 'Customer requested cancellation',
          maxLength: 500,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Payment cancelled successfully',
    type: PaymentDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async cancel(
    @Param('id') id: string,
    @Body() body?: { reason?: string },
  ): Promise<PaymentDto> {
    return this.paymentsService.cancel(id, body?.reason);
  }

  /**
   * Delete Payment
   * Deletes payment record permanently.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Payment ID (UUID)',
  })
  @ApiOperation({
    summary: 'Delete payment',
    description: 'Permanently deletes payment record. Admin only.',
  })
  @ApiResponse({
    status: 204,
    description: 'Payment deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.paymentsService.remove(id);
  }
}
```

---

## 3. ApiProperty Decorators - Complete Reference

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ✅ Good: Complete documentation
export class PaymentDto {
  @ApiProperty({
    description: 'Unique identifier for the payment',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
    readOnly: true,
  })
  id: string;

  @ApiProperty({
    description: 'Payment amount in VND',
    example: 1000000,
    minimum: 1000,
    maximum: 999999999,
    type: Number,
  })
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: 'E_WALLET',
  })
  method: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Optional payment notes',
    example: 'Deposit payment for wedding',
    type: String,
    maxLength: 500,
    nullable: true,
  })
  notes?: string;

  @ApiProperty({
    description: 'When payment was created',
    example: '2026-01-30T10:00:00Z',
    format: 'date-time',
    readOnly: true,
  })
  createdAt: Date;
}

// ❌ Bad: Missing documentation
export class BadPaymentDto {
  @ApiProperty()  // No description, example, or type
  id: string;

  @ApiProperty()  // No validation constraints
  amount: number;
}
```

---

## 4. Error Response Documentation

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Standardized error response schema
 */
export class ErrorResponseSchema {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  error: string;
}

// In controller:
@ApiResponse({
  status: 400,
  description: 'Bad Request - Validation failed',
  schema: {
    example: {
      statusCode: 400,
      timestamp: '2026-01-30T10:00:00Z',
      path: '/payments',
      message: [
        'amount must be a number',
        'method must be a valid enum value',
      ],
      error: 'Bad Request',
    },
  },
})
@ApiResponse({
  status: 404,
  description: 'Not Found - Resource does not exist',
  schema: {
    example: {
      statusCode: 404,
      timestamp: '2026-01-30T10:00:00Z',
      path: '/payments/invalid-id',
      message: 'Payment not found',
      error: 'Not Found',
    },
  },
})
@ApiResponse({
  status: 500,
  description: 'Internal Server Error',
  schema: {
    example: {
      statusCode: 500,
      timestamp: '2026-01-30T10:00:00Z',
      path: '/payments',
      message: 'Internal server error',
      error: 'Internal Server Error',
    },
  },
})
```

---

## 5. Pagination Documentation

```typescript
@Get()
@ApiOperation({ summary: 'Get all payments' })
@ApiQuery({
  name: 'page',
  required: false,
  type: Number,
  description: 'Page number (1-based)',
  example: 1,
})
@ApiQuery({
  name: 'limit',
  required: false,
  type: Number,
  description: 'Records per page',
  example: 20,
})
@ApiResponse({
  status: 200,
  description: 'Paginated payment list',
  schema: {
    example: {
      data: [
        { id: '...', amount: 1000000 },
        { id: '...', amount: 2000000 },
      ],
      total: 100,
      page: 1,
      limit: 20,
      totalPages: 5,
    },
  },
})
async findAll(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20,
): Promise<any> {
  // Implementation
}
```

---

## 6. Module-Level Swagger Configuration

```typescript
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

/**
 * Payments Module
 *
 * Handles all payment processing, gateway integrations, and payment tracking.
 *
 * **Features:**
 * - Payment creation and validation
 * - Multiple payment methods (Cash, Bank Transfer, Card, E-Wallet)
 * - Payment tracking and status updates
 * - Refund processing
 * - Payment plans and installments
 * - Gateway transaction logging
 *
 * **Enums Used:**
 * - PaymentStatus: PENDING, PARTIAL_PAID, SUCCESSFUL, FAILED, CANCELLED, ABANDONED, REFUNDED
 * - PaymentMethod: CASH, BANK_TRANSFER, CREDIT_CARD, E_WALLET
 * - PaymentType: DEPOSIT, REMAINING, INSTALLMENT, FULL, ADJUSTMENT
 *
 * @example
 * POST /payments - Create payment
 * GET /payments - List payments
 * GET /payments/:id - Get payment details
 */
@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
```

---

## 7. Swagger Decorators Checklist

### Controller Level:
- [ ] `@ApiTags()` - Group related endpoints
- [ ] `@ApiBearerAuth()` - Mark endpoints requiring auth
- [ ] `@ApiUnauthorizedResponse()` - Auth failure response

### Method Level:
- [ ] `@ApiOperation()` - Describe the operation
- [ ] `@ApiResponse()` - Document all possible responses (200, 201, 400, 404, 500)
- [ ] `@ApiBody()` - Document request body with examples
- [ ] `@ApiParam()` - Document path parameters
- [ ] `@ApiQuery()` - Document query parameters

### Field Level:
- [ ] `@ApiProperty()` - Required fields with description
- [ ] `@ApiPropertyOptional()` - Optional fields
- [ ] All have `description`, `example`, and type info

---

## 8. API Documentation Best Practices

| Item | Rule | Reason |
|------|------|--------|
| **Operation ID** | Unique, camelCase | For code generation |
| **Descriptions** | Clear, concise | Developer understanding |
| **Examples** | Realistic, valid | Easy testing |
| **Status Codes** | All possible codes | Complete documentation |
| **Error Schemas** | Include examples | Error handling guide |
| **Required** | Explicitly marked | Clear field requirements |
| **Limits** | Min/Max documented | Validation reference |
| **Deprecated** | Marked clearly | Migration guidance |

---

## 9. Testing Swagger Documentation

```bash
# Generate OpenAPI spec
npm run build

# Validate with swagger-cli
npx swagger-cli validate ./dist/openapi.json

# Convert to HTML
npx redoc-cli bundle -o docs/api.html dist/openapi.json

# Generate client SDK
npm install @openapi-generator/openapi-generator-cli
openapi-generator generate -i dist/openapi.json -g typescript-axios -o generated/api-client
```

---

## 10. OpenAPI Document Export

```typescript
// In main.ts after setup
import * as fs from 'fs';

const document = SwaggerModule.createDocument(app, config);

// Save OpenAPI spec
fs.writeFileSync(
  './openapi.json',
  JSON.stringify(document, null, 2),
);

SwaggerModule.setup('api', app, document);
```

Access at: `http://localhost:3000/api`  
OpenAPI JSON: `http://localhost:3000/api-json`

---

