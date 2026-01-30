import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from 'generated/prisma';
import {
  IsUUID,
  IsString,
  IsEnum,
  IsNumber,
  IsDate,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ViewBookingOrderDto {
  @ApiPropertyOptional({
    description: 'Total price for the order',
    example: 10000000,
  })
  totalPrice?: number;

  @ApiPropertyOptional({
    description: 'Deposit amount',
    example: 3000000,
  })
  depositAmount?: number;

  @ApiPropertyOptional({
    description: 'Remaining amount',
    example: 7000000,
  })
  remainingAmount?: number;

  @ApiPropertyOptional({
    description: 'Deposit paid amount',
    example: 3000000,
  })
  depositPaid?: number;

  @ApiPropertyOptional({
    description: 'Remaining paid amount',
    example: 0,
  })
  remainingPaid?: number;

  @ApiPropertyOptional({
    description: 'Order status',
    enum: ['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED', 'CANCELLED'],
  })
  status?: string;

  @ApiPropertyOptional({
    description: 'Total paid amount',
    example: 3000000,
  })
  totalPaid?: number;

  @ApiPropertyOptional({
    description: 'Is payment complete',
    example: false,
  })
  isPaid?: boolean;

  @ApiPropertyOptional({
    description: 'Pending amount',
    example: 7000000,
  })
  pendingAmount?: number;
}

export class ViewBookingDto {
  @ApiProperty({
    description: 'Booking ID',
    example: 'uuid-1234',
  })
  @IsUUID('4')
  id: string;

  @ApiProperty({
    description: 'Customer ID',
    example: 'uuid-customer-1',
  })
  @IsUUID('4')
  customerId: string;

  @ApiPropertyOptional({
    description: 'Booking notes',
    example: 'Special requests for the wedding',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Booking status',
    enum: BookingStatus,
  })
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @ApiProperty({
    description: 'Event date',
    example: '2024-12-31T10:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  eventDate: Date;

  @ApiProperty({
    description: 'Total price',
    example: 10000000,
    minimum: 0,
  })
  @IsNumber()
  totalPrice: number;

  @ApiPropertyOptional({
    description: 'Cancelled date',
    example: null,
    nullable: true,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  cancelled_at?: Date;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  created_at: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  updated_at: Date;

  @ApiPropertyOptional({
    description: 'Deletion date',
    example: null,
    nullable: true,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deleted_at?: Date;

  @ApiPropertyOptional({
    description: 'Order details with payment information',
    type: ViewBookingOrderDto,
  })
  @IsOptional()
  order?: ViewBookingOrderDto;

  @ApiPropertyOptional({
    description: 'Order list for this booking',
    type: [ViewBookingOrderDto],
  })
  @IsOptional()
  orders?: ViewBookingOrderDto[];
}
