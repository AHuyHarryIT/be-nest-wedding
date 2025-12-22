import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from 'generated/prisma';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsUUID()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({ description: 'Total payment amount' })
  @IsNumber()
  @IsNotEmpty()
  totalAmount: number;

  @ApiProperty({ description: 'Deposit payment method', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  depositMethod: PaymentMethod;

  @ApiProperty({ description: 'Deposit payment amount' })
  @IsNumber()
  @IsNotEmpty()
  depositAmount: number;

  @ApiPropertyOptional({
    description: 'Deposit payment status',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  depositStatus?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Deposit payment note' })
  @IsString()
  @IsOptional()
  depositNote?: string;

  @ApiPropertyOptional({ description: 'Deposit transaction ID' })
  @IsString()
  @IsOptional()
  depositTxnId?: string;
}
