import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from 'generated/prisma';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class PayRemainingDto {
  @ApiProperty({
    description: 'Booking ID',
    example: 'uuid-1234',
  })
  @IsUUID('4')
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({
    description:
      'Amount to pay for remaining (must cover full remaining amount)',
    example: 7000000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  paymentAmount: number;

  @ApiPropertyOptional({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER,
  })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Payment note',
    example: 'Final payment for wedding',
  })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({
    description: 'Transaction ID from payment gateway',
    example: 'txn-abc123',
  })
  @IsString()
  @IsOptional()
  txnId?: string;
}
