import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaymentMethod, PaymentStatus } from 'generated/prisma';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'The ID of the order this payment is for',
    example: 'uuid-order-123',
  })
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 1000,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({
    description: 'Provider transaction ID',
    example: 'txn_123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  providerTxnId?: string;

  @ApiProperty({
    description: 'Date and time when payment was made',
    example: '2024-12-25T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
