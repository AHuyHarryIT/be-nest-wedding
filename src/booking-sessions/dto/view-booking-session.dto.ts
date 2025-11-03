import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from 'generated/prisma';

export class ViewBookingSessionDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: 'uuid-1234',
  })
  id: string;

  @ApiProperty({
    description: 'Booking ID',
    example: 'uuid-booking-1234',
  })
  bookingId: string;

  @ApiProperty({
    description: 'Session title',
    example: 'Wedding Ceremony',
  })
  title: string;

  @ApiProperty({
    description: 'Location name',
    required: false,
  })
  locationName: string | null;

  @ApiProperty({
    description: 'Address',
    required: false,
  })
  address: string | null;

  @ApiProperty({
    description: 'Session start time',
  })
  startsAt: Date;

  @ApiProperty({
    description: 'Session end time',
  })
  endsAt: Date;

  @ApiProperty({
    description: 'Status',
    enum: BookingStatus,
  })
  status: BookingStatus;

  @ApiProperty({
    description: 'Created timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated timestamp',
  })
  updatedAt: Date;
}
