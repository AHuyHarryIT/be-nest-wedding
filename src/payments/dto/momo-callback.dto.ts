import { IsOptional, IsNumber, IsString } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class MomoCallbackDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerCode?: string;

  @ApiPropertyOptional({
    description: 'Booking ID from MOMO response (links to Order.bookingId)',
  })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  resultCode?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  transId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extraData?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  responseTime?: number;
}

/**
 * IPN Callback DTO - represents the actual IPN payload from Momo
 * This is the standard format for Momo IPN callbacks
 */
export class MomoIPNCallbackDto {
  @ApiProperty({ description: 'Partner code from Momo' })
  @IsString()
  partnerCode: string;

  @ApiProperty({ description: 'Order ID (usually bookingId)' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Request ID from initial payment request' })
  @IsString()
  requestId: string;

  @ApiProperty({ description: 'Payment amount in VND' })
  @IsString()
  amount: string;

  @ApiProperty({ description: 'Order information' })
  @IsString()
  orderInfo: string;

  @ApiProperty({ description: 'Order type' })
  @IsString()
  orderType: string;

  @ApiProperty({ description: 'Momo transaction ID' })
  @IsString()
  transId: string;

  @ApiProperty({ description: 'Result code: 0=success, others=failure' })
  @IsNumber()
  resultCode: number;

  @ApiProperty({ description: 'Response message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Payment type' })
  @IsString()
  payType: string;

  @ApiProperty({ description: 'Response time in milliseconds' })
  @IsNumber()
  responseTime: number;

  @ApiPropertyOptional({ description: 'Extra data from payment request' })
  @IsOptional()
  @IsString()
  extraData?: string;

  @ApiProperty({ description: 'HMAC SHA256 signature for verification' })
  @IsString()
  signature: string;
}

/**
 * IPN Response DTO - what we send back to Momo
 */
export class MomoIPNResponseDto {
  @ApiProperty({ description: 'Result code: 0=received successfully' })
  resultCode: number;

  @ApiProperty({ description: 'Response message' })
  message: string;
}
