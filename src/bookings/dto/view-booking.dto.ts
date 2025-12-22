import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from 'generated/prisma';

export class ViewBookingDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  packageId: string;

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
}
