import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from 'generated/prisma';

export class ViewBookingDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: 'uuid-1234',
  })
  id: string;

  @ApiProperty({
    description: 'Customer ID',
    example: 'uuid-customer-1234',
  })
  customerId: string;

  @ApiProperty({
    description: 'Package ID',
    example: 'uuid-package-1234',
  })
  packageId: string;

  @ApiProperty({
    description: 'Event date',
    example: '2024-12-31T18:00:00Z',
  })
  eventDate: Date;

  @ApiProperty({
    description: 'Notes for the booking',
    example: 'Special requirements here',
    required: false,
  })
  notes: string | null;

  @ApiProperty({
    description: 'Total price',
    example: 5000,
  })
  totalPrice: number;

  @ApiProperty({
    description: 'Status of the booking',
    enum: BookingStatus,
    example: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @ApiProperty({
    description: 'Cancellation timestamp',
    required: false,
  })
  cancelledAt: Date | null;

  @ApiProperty({
    description: 'Created timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated timestamp',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Deletion timestamp',
    required: false,
  })
  deletedAt: Date | null;
}
