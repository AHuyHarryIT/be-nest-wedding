# DTO & Validation Best Practices

**Goal:** Standardize DTOs with comprehensive validation and Swagger documentation.

---

## 1. DTO File Structure & Naming

```
src/modules/payments/dto/
├── create-payment.dto.ts      # Input: POST /payments
├── update-payment.dto.ts      # Input: PATCH /payments/:id
├── query-payment.dto.ts       # Input: GET /payments (filters, pagination)
├── payment.dto.ts             # Output: Response DTO
├── payment-details.dto.ts     # Output: Detailed response
└── index.ts                   # Barrel export
```

---

## 2. Create DTO - Complete Example

File: [src/modules/payments/dto/create-payment.dto.ts](src/modules/payments/dto/create-payment.dto.ts)

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsPositive,
  Min,
  Max,
  IsISO8601,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, PaymentType } from '@prisma/client';

/**
 * DTO for creating a new payment record.
 * Used in: POST /payments
 */
export class CreatePaymentDto {
  /**
   * Order ID (UUID)
   * The order must exist and belong to the authenticated user's booking
   */
  @ApiProperty({
    description: 'Order ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  /**
   * Payment amount in VND
   * Must be positive and match the order balance
   */
  @ApiProperty({
    description: 'Payment amount in VND',
    example: 1000000,
    minimum: 1000,
    maximum: 999999999,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(1000, { message: 'Minimum payment is 1,000 VND' })
  @Max(999999999, { message: 'Maximum payment is 999,999,999 VND' })
  @Type(() => Number)
  amount: number;

  /**
   * Payment method
   * Options: CASH, BANK_TRANSFER, CREDIT_CARD, E_WALLET
   */
  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: 'E_WALLET',
  })
  @IsEnum(PaymentMethod, {
    message: `Payment method must be one of: ${Object.values(PaymentMethod).join(', ')}`,
  })
  @IsNotEmpty()
  method: PaymentMethod;

  /**
   * Payment type (optional)
   * Defaults to REMAINING if not specified
   */
  @ApiPropertyOptional({
    description: 'Payment type',
    enum: PaymentType,
    example: 'REMAINING',
    default: 'REMAINING',
  })
  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;

  /**
   * Payment description
   * Free-form text, max 500 characters
   */
  @ApiPropertyOptional({
    description: 'Payment description',
    example: 'Deposit for wedding booking',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  /**
   * Due date for payment
   * ISO 8601 format, optional
   */
  @ApiPropertyOptional({
    description: 'Due date (ISO 8601 format)',
    example: '2026-03-15T00:00:00Z',
  })
  @IsISO8601()
  @IsOptional()
  dueDate?: string;

  /**
   * Internal notes (admin only)
   * Not exposed to customer
   */
  @ApiPropertyOptional({
    description: 'Internal notes (admin only)',
    example: 'Customer called to confirm payment',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  internalNotes?: string;
}
```

---

## 3. Update DTO - Complete Example

File: [src/modules/payments/dto/update-payment.dto.ts](src/modules/payments/dto/update-payment.dto.ts)

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsISO8601,
  MaxLength,
} from 'class-validator';
import { PaymentStatus } from '@prisma/client';

/**
 * DTO for updating an existing payment record.
 * Used in: PATCH /payments/:id
 * All fields are optional - provide only what needs to be updated
 */
export class UpdatePaymentDto {
  /**
   * Update payment status
   * Only admins can update status directly
   */
  @ApiPropertyOptional({
    description: 'Payment status',
    enum: PaymentStatus,
    example: 'PARTIAL_PAID',
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  /**
   * Update payment description
   */
  @ApiPropertyOptional({
    description: 'Payment description',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  /**
   * Update due date
   */
  @ApiPropertyOptional({
    description: 'New due date (ISO 8601 format)',
    example: '2026-04-15T00:00:00Z',
  })
  @IsISO8601()
  @IsOptional()
  dueDate?: string;

  /**
   * Update internal notes
   */
  @ApiPropertyOptional({
    description: 'Internal notes',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  internalNotes?: string;
}
```

---

## 4. Query/Filter DTO - Pagination & Filters

File: [src/modules/payments/dto/query-payment.dto.ts](src/modules/payments/dto/query-payment.dto.ts)

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsUUID,
  Type,
} from 'class-validator';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

/**
 * DTO for filtering and pagination.
 * Used in: GET /payments
 */
export class QueryPaymentDto {
  /**
   * Order ID filter (optional)
   */
  @ApiPropertyOptional({
    description: 'Filter by order ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  orderId?: string;

  /**
   * Status filter (optional)
   */
  @ApiPropertyOptional({
    description: 'Filter by payment status',
    enum: PaymentStatus,
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  /**
   * Payment method filter (optional)
   */
  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod;

  /**
   * Pagination: page number (1-based)
   */
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  /**
   * Pagination: records per page
   */
  @ApiPropertyOptional({
    description: 'Records per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  /**
   * Sort field
   * Default: createdAt
   */
  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: ['createdAt', 'dueDate', 'amount', 'status'],
  })
  @IsOptional()
  sortBy?: 'createdAt' | 'dueDate' | 'amount' | 'status' = 'createdAt';

  /**
   * Sort order
   */
  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  /**
   * Get skip value for pagination
   */
  getSkip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }

  /**
   * Get take value for pagination
   */
  getTake(): number {
    return this.limit ?? 20;
  }
}
```

---

## 5. Response DTO - Output Schema

File: [src/modules/payments/dto/payment.dto.ts](src/modules/payments/dto/payment.dto.ts)

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { PaymentStatus, PaymentMethod, PaymentType } from '@prisma/client';

/**
 * Payment response DTO
 * Returned in API responses
 * Uses class-transformer @Exclude() to hide sensitive fields
 */
export class PaymentDto {
  @ApiProperty({
    description: 'Payment ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Order ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  orderId: string;

  @ApiProperty({
    description: 'Payment sequence number within order',
    example: 1,
  })
  paymentSequence: number;

  @ApiProperty({
    description: 'Payment type',
    enum: PaymentType,
    example: 'REMAINING',
  })
  paymentType: PaymentType;

  @ApiProperty({
    description: 'Payment amount in VND',
    example: 1000000,
  })
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: 'E_WALLET',
  })
  method: PaymentMethod;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: 'PENDING',
  })
  status: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Payment description',
    example: 'Deposit for wedding booking',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Due date',
    example: '2026-03-15T00:00:00Z',
  })
  dueDate?: Date;

  @ApiProperty({
    description: 'Number of payment attempts',
    example: 0,
  })
  attemptCount: number;

  @ApiPropertyOptional({
    description: 'Last payment attempt date',
    example: '2026-02-10T10:30:00Z',
  })
  lastAttemptAt?: Date;

  @ApiPropertyOptional({
    description: 'Cancellation reason',
    example: 'Customer requested cancellation',
  })
  cancellationReason?: string;

  @ApiPropertyOptional({
    description: 'Cancelled date',
    example: '2026-02-05T15:45:00Z',
  })
  cancelledAt?: Date;

  @ApiProperty({
    description: 'Created at',
    example: '2026-01-30T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at',
    example: '2026-01-30T10:00:00Z',
  })
  updatedAt: Date;

  /**
   * Hide internal notes from response
   */
  @Exclude()
  internalNotes?: string;

  /**
   * Hide internal payment notes
   */
  @Exclude()
  notes?: string;
}
```

---

## 6. Detailed Response DTO - With Relations

File: [src/modules/payments/dto/payment-details.dto.ts](src/modules/payments/dto/payment-details.dto.ts)

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentDto } from './payment.dto';
import { OrderDto } from '../../orders/dto/order.dto';

/**
 * Detailed payment response including related order data
 * Returned in: GET /payments/:id/details
 */
export class PaymentDetailsDto extends PaymentDto {
  @ApiPropertyOptional({
    description: 'Related order information',
    type: OrderDto,
  })
  order?: OrderDto;

  @ApiPropertyOptional({
    description: 'Payment attempts history',
    type: 'array',
    example: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        attemptNumber: 1,
        status: 'FAILED',
        resultCode: 'INSUFFICIENT_FUNDS',
      },
    ],
  })
  attempts?: any[];

  @ApiPropertyOptional({
    description: 'Gateway transactions',
    type: 'array',
    example: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        gatewayProvider: 'MOMO',
        gatewayTransactionId: 'MOMO12345',
        amount: 1000000,
        status: 'FAILED',
      },
    ],
  })
  gatewayTransactions?: any[];
}
```

---

## 7. Barrel Export - index.ts

File: [src/modules/payments/dto/index.ts](src/modules/payments/dto/index.ts)

```typescript
export * from './create-payment.dto';
export * from './update-payment.dto';
export * from './query-payment.dto';
export * from './payment.dto';
export * from './payment-details.dto';
```

---

## 8. Using DTOs in Controller

File: [src/modules/payments/payments.controller.ts](src/modules/payments/payments.controller.ts)

```typescript
import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { ApiTags, ApiProperty, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  QueryPaymentDto,
  PaymentDto,
  PaymentDetailsDto,
} from './dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Create payment
   */
  @Post()
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    type: PaymentDto,
  })
  async create(@Body() createPaymentDto: CreatePaymentDto): Promise<PaymentDto> {
    return this.paymentsService.create(createPaymentDto);
  }

  /**
   * Get all payments with filters
   */
  @Get()
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved successfully',
    type: [PaymentDto],
  })
  async findAll(@Query() query: QueryPaymentDto): Promise<PaymentDto[]> {
    return this.paymentsService.findMany(query);
  }

  /**
   * Get payment by ID
   */
  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Payment retrieved',
    type: PaymentDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async findOne(@Param('id') id: string): Promise<PaymentDto> {
    return this.paymentsService.findOne(id);
  }

  /**
   * Get detailed payment info
   */
  @Get(':id/details')
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved',
    type: PaymentDetailsDto,
  })
  async getDetails(@Param('id') id: string): Promise<PaymentDetailsDto> {
    return this.paymentsService.getDetails(id);
  }

  /**
   * Update payment
   */
  @Patch(':id')
  @ApiResponse({
    status: 200,
    description: 'Payment updated successfully',
    type: PaymentDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ): Promise<PaymentDto> {
    return this.paymentsService.update(id, updatePaymentDto);
  }
}
```

---

## 9. Common Validation Decorators

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@IsNotEmpty()` | Field required | Phone number |
| `@IsOptional()` | Field optional | Middle name |
| `@IsString()` | Must be string | Email, name |
| `@IsNumber()` | Must be number | Amount |
| `@IsPositive()` | Must be > 0 | Price |
| `@Min(value)` | Minimum value | `@Min(0)` |
| `@Max(value)` | Maximum value | `@Max(100)` |
| `@MaxLength(n)` | Max characters | `@MaxLength(255)` |
| `@MinLength(n)` | Min characters | `@MinLength(6)` |
| `@IsEmail()` | Valid email format | Email |
| `@IsUUID()` | Valid UUID | ID |
| `@IsEnum(e)` | Enum value | Status |
| `@IsISO8601()` | ISO date format | Dates |
| `@Matches(regex)` | Regex pattern | Phone |
| `@IsPhoneNumber()` | Phone format | Phone (lib) |
| `@Transform()` | Transform value | Type coercion |
| `@Type()` | Class transformer | Number parsing |

---

## 10. Validation Pipe Configuration

File: [src/main.ts](src/main.ts)

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe with comprehensive configuration
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // Remove non-declared properties
      forbidNonWhitelisted: true,    // Throw error on extra properties
      skipMissingProperties: false,  // Validate missing required fields
      transform: true,              // Transform payload to DTO class
      transformOptions: {
        enableImplicitConversion: true,
      },
      errorHttpStatusCode: 400,      // Bad request on validation error
    }),
  );

  await app.listen(3000);
}
bootstrap();
```

---

## 11. Custom Validators Example

```typescript
import { registerDecorator, ValidationOptions, ValidatorConstraint } from 'class-validator';

@ValidatorConstraint({ async: false })
class IsCurrencyConstraint {
  validate(value: any) {
    return typeof value === 'number' && value > 0 && Number.isFinite(value);
  }

  defaultMessage() {
    return 'Amount must be a positive number';
  }
}

export function IsCurrency(validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCurrencyConstraint,
    });
  };
}

// Usage
export class CreateOrderDto {
  @IsCurrency()
  amount: number;
}
```

---

## 12. DTO Best Practices Checklist

- [ ] Separate DTOs for Create, Update, Query
- [ ] Response DTO with `@Exclude()` for sensitive fields
- [ ] All fields have `@ApiProperty()` or `@ApiPropertyOptional()`
- [ ] Numeric fields have `@Min()`, `@Max()`, or `@IsPositive()`
- [ ] String fields have `@MaxLength()` validation
- [ ] Enums use `@IsEnum()` with message
- [ ] Dates use `@IsISO8601()` or `@Type()`
- [ ] Required fields have `@IsNotEmpty()` or no `@IsOptional()`
- [ ] Optional fields have `@IsOptional()`
- [ ] Complex objects nested in separate DTOs
- [ ] Example values in `@ApiProperty()`
- [ ] Query DTO has pagination fields (page, limit)
- [ ] Query DTO has sort fields
- [ ] No `any` types anywhere
- [ ] All imports from `class-validator`, `class-transformer`, `@nestjs/swagger`

---

