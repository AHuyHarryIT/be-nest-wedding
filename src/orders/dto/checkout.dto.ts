import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from 'generated/prisma';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CheckoutDto {
  @ApiProperty({
    description: 'Booking ID (UUID format)',
    example: 'uuid-1234',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Booking ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Booking ID is required' })
  bookingId: string;

  @ApiPropertyOptional({
    description: 'Make deposit payment (default: false)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  makeDeposit?: boolean;

  @ApiPropertyOptional({
    description:
      'Deposit amount in money or percentage (0-100). Only used if makeDeposit is true',
    example: 30,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  depositValue?: number;

  @ApiPropertyOptional({
    description:
      'Is deposit value a percentage? (default: true if makeDeposit)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isDepositPercentage?: boolean;

  @ApiPropertyOptional({
    description: 'Payment method for this transaction',
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER,
  })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Payment note (max 500 characters)',
    example: 'Payment for wedding booking',
    maxLength: 500,
  })
  @IsString({ message: 'Note must be a string' })
  @IsOptional()
  @MaxLength(500, { message: 'Note cannot exceed 500 characters' })
  note?: string;

  @ApiPropertyOptional({
    description: 'Transaction ID from payment gateway (max 255 characters)',
    example: 'txn-abc123',
    maxLength: 255,
  })
  @IsString({ message: 'Transaction ID must be a string' })
  @IsOptional()
  @MaxLength(255, { message: 'Transaction ID cannot exceed 255 characters' })
  txnId?: string;
}
