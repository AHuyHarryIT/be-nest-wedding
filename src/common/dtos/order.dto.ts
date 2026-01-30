import {
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * Order status enum
 */
export enum OrderStatusEnum {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

/**
 * Create Order DTO
 */
export class CreateOrderDto {
  @ApiProperty({
    description: 'Booking ID',
    type: String,
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4')
  bookingId: string;

  @ApiProperty({
    description: 'Total price in VND',
    type: Number,
    example: 5000000,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalPrice: number;

  @ApiProperty({
    description: 'Order notes (public)',
    type: String,
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @ApiProperty({
    description: 'Order internal notes (staff only)',
    type: String,
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  internalNotes?: string;
}

/**
 * Update Order DTO
 */
export class UpdateOrderDto {
  @ApiProperty({
    description: 'Order status',
    enum: OrderStatusEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrderStatusEnum)
  status?: OrderStatusEnum;

  @ApiProperty({
    description: 'Total price in VND',
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalPrice?: number;

  @ApiProperty({
    description: 'Order notes (public)',
    type: String,
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @ApiProperty({
    description: 'Order internal notes (staff only)',
    type: String,
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  internalNotes?: string;
}

/**
 * Cancel Order DTO
 */
export class CancelOrderDto {
  @ApiProperty({
    description: 'Cancellation reason',
    type: String,
    maxLength: 500,
  })
  @IsString()
  @Length(1, 500)
  reason: string;
}

/**
 * Order Query DTO
 */
export class OrderQueryDto {
  @ApiProperty({
    description: 'Filter by booking ID',
    type: String,
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID('4')
  bookingId?: string;

  @ApiProperty({
    description: 'Filter by order status',
    enum: OrderStatusEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrderStatusEnum)
  status?: OrderStatusEnum;

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
    description: 'Minimum total price',
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiProperty({
    description: 'Maximum total price',
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;
}

/**
 * Order Financial Summary Response DTO
 */
export class OrderFinancialSummaryDto {
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
  totalPrice: number;

  @Expose()
  @ApiProperty({
    type: Number,
  })
  totalPaid: number;

  @Expose()
  @ApiProperty({
    type: Number,
  })
  totalRefunded: number;

  @Expose()
  @ApiProperty({
    type: Number,
  })
  balanceRemaining: number;

  @Expose()
  @ApiProperty({
    enum: OrderStatusEnum,
  })
  status: OrderStatusEnum;

  @Expose()
  @ApiProperty({
    type: Number,
  })
  paymentCount: number;

  @Expose()
  @ApiProperty({
    type: Number,
  })
  refundCount: number;
}

/**
 * Order Response DTO
 */
export class OrderResponseDto {
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
  bookingId: string;

  @Expose()
  @ApiProperty({
    type: String,
  })
  referenceNumber: string;

  @Expose()
  @ApiProperty({
    type: Number,
  })
  totalPrice: number;

  @Expose()
  @ApiProperty({
    type: Number,
  })
  totalPaid: number;

  @Expose()
  @ApiProperty({
    type: Number,
  })
  totalRefunded: number;

  @Expose()
  @ApiProperty({
    type: Number,
  })
  balanceRemaining: number;

  @Expose()
  @ApiProperty({
    enum: OrderStatusEnum,
  })
  status: OrderStatusEnum;

  @Expose()
  @ApiProperty({
    type: String,
    nullable: true,
  })
  notes: string | null;

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
  cancellationReason?: string;

  @Exclude()
  cancelledAt?: Date;

  @Exclude()
  deletedAt?: Date;
}
