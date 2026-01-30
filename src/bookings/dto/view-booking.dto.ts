import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from 'generated/prisma';

export class ViewBookingDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customerId: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty()
  eventDate: Date;

  @ApiProperty()
  totalPrice: number;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  deletedAt?: Date;

  @ApiPropertyOptional({
    description: 'Order details with payment information',
    example: {
      id: 'uuid',
      totalPrice: 10000000,
      depositAmount: 3000000,
      remainingAmount: 7000000,
      depositPaid: 3000000,
      remainingPaid: 0,
      status: 'PARTIAL',
      totalPaid: 3000000,
      isPaid: false,
      pendingAmount: 7000000,
    },
  })
  order?: any;

  @ApiPropertyOptional({
    description: 'Order list for this booking',
    type: [Object],
  })
  orders?: any[];
}
