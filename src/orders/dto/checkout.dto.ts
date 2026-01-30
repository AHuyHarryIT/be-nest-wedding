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
} from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsUUID()
  @IsNotEmpty()
  bookingId: string;

  @ApiPropertyOptional({ description: 'Make deposit payment (default: false)' })
  @IsBoolean()
  @IsOptional()
  makeDeposit?: boolean;

  @ApiPropertyOptional({
    description:
      'Deposit amount in money or percentage (0-100). Only used if makeDeposit is true',
    example: 30,
  })
  @IsNumber()
  @IsOptional()
  depositValue?: number;

  @ApiPropertyOptional({
    description:
      'Is deposit value a percentage? (default: true if makeDeposit)',
  })
  @IsBoolean()
  @IsOptional()
  isDepositPercentage?: boolean;

  @ApiPropertyOptional({
    description: 'Payment method for this transaction',
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Payment note' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: 'Transaction ID from payment gateway' })
  @IsString()
  @IsOptional()
  txnId?: string;
}
