import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

/**
 * Payment status and method enums
 */
export enum PaymentMethodEnum {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  E_WALLET = 'E_WALLET',
}

export enum PaymentTypeEnum {
  DEPOSIT = 'DEPOSIT',
  REMAINING = 'REMAINING',
  INSTALLMENT = 'INSTALLMENT',
  FULL = 'FULL',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum PaymentStatusEnum {
  PENDING = 'PENDING',
  PARTIAL_PAID = 'PARTIAL_PAID',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  ABANDONED = 'ABANDONED',
  REFUNDED = 'REFUNDED',
}

/**
 * Create Payment DTO
 * Used when creating new payment records
 */
export class CreatePaymentDto {
  @ApiProperty({
    description: 'Order ID to associate with payment',
    type: String,
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4')
  orderId: string;

  @ApiProperty({
    description: 'Payment amount in VND',
    type: Number,
    example: 1000000,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethodEnum,
    example: PaymentMethodEnum.BANK_TRANSFER,
  })
  @IsEnum(PaymentMethodEnum)
  method: PaymentMethodEnum;

  @ApiProperty({
    description: 'Payment type',
    enum: PaymentTypeEnum,
    required: false,
    example: PaymentTypeEnum.REMAINING,
  })
  @IsOptional()
  @IsEnum(PaymentTypeEnum)
  paymentType?: PaymentTypeEnum = PaymentTypeEnum.REMAINING;

  @ApiProperty({
    description: 'Payment description',
    type: String,
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiProperty({
    description: 'Due date for payment (ISO 8601)',
    type: String,
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiProperty({
    description: 'Internal notes',
    type: String,
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

/**
 * Update Payment DTO
 * Used when updating payment records
 */
export class UpdatePaymentDto {
  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatusEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentStatusEnum)
  status?: PaymentStatusEnum;

  @ApiProperty({
    description: 'Payment description',
    type: String,
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiProperty({
    description: 'Due date for payment (ISO 8601)',
    type: String,
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiProperty({
    description: 'Internal notes',
    type: String,
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

/**
 * Payment Query DTO
 * Used for filtering payments in list endpoints
 */
export class PaymentQueryDto {
  @ApiProperty({
    description: 'Filter by order ID',
    type: String,
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID('4')
  orderId?: string;

  @ApiProperty({
    description: 'Filter by payment status',
    enum: PaymentStatusEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentStatusEnum)
  status?: PaymentStatusEnum;

  @ApiProperty({
    description: 'Filter by payment method',
    enum: PaymentMethodEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethodEnum)
  method?: PaymentMethodEnum;

  @ApiProperty({
    description: 'Filter by payment type',
    enum: PaymentTypeEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentTypeEnum)
  paymentType?: PaymentTypeEnum;

  @ApiProperty({
    description: 'Start date (ISO 8601)',
    type: String,
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  fromDate?: Date;

  @ApiProperty({
    description: 'End date (ISO 8601)',
    type: String,
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  toDate?: Date;

  @ApiProperty({
    description: 'Minimum amount',
    type: Number,
    required: false,
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiProperty({
    description: 'Maximum amount',
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;
}

/**
 * Payment Response DTO
 * Safe response object with sensitive fields excluded
 */
export class PaymentResponseDto {
  @Expose()
  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  id: string;

  @Expose()
  @ApiProperty({
    type: String,
    format: 'uuid',
  })
  orderId: string;

  @Expose()
  @ApiProperty({
    type: Number,
  })
  paymentSequence: number;

  @Expose()
  @ApiProperty({
    enum: PaymentTypeEnum,
  })
  paymentType: PaymentTypeEnum;

  @Expose()
  @ApiProperty({
    type: Number,
  })
  amount: number;

  @Expose()
  @ApiProperty({
    enum: PaymentMethodEnum,
  })
  method: PaymentMethodEnum;

  @Expose()
  @ApiProperty({
    enum: PaymentStatusEnum,
  })
  status: PaymentStatusEnum;

  @Expose()
  @ApiProperty({
    type: String,
    nullable: true,
  })
  description: string | null;

  @Expose()
  @ApiProperty({
    type: Date,
    format: 'date-time',
    nullable: true,
  })
  dueDate: Date | null;

  @Expose()
  @ApiProperty({
    type: Number,
  })
  attemptCount: number;

  @Expose()
  @ApiProperty({
    type: Date,
    format: 'date-time',
    nullable: true,
  })
  lastAttemptAt: Date | null;

  @Expose()
  @ApiProperty({
    type: Date,
    format: 'date-time',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    type: Date,
    format: 'date-time',
  })
  updatedAt: Date;

  // Exclude sensitive fields
  @Exclude()
  internalNotes?: string;

  @Exclude()
  successfulAttemptId?: string;

  @Exclude()
  cancelledAt?: Date;

  @Exclude()
  cancellationReason?: string;
}
