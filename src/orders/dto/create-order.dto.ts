import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { OrderStatus } from 'generated/prisma';

export class CreateOrderDto {
  @ApiProperty({
    description: 'The ID of the booking this order is for',
    example: 'uuid-booking-123',
  })
  @IsUUID()
  bookingId: string;

  @ApiProperty({
    description: 'The ID of the customer',
    example: 'uuid-customer-123',
  })
  @IsUUID()
  customerId: string;

  @ApiProperty({
    description: 'Total amount of the order',
    example: 5000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiProperty({
    description: 'Status of the order',
    enum: OrderStatus,
    default: OrderStatus.UNPAID,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
