import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { BookingStatus } from 'generated/prisma';

export class CreateBookingDto {
  @ApiProperty({
    description: 'The ID of the customer making the booking',
    example: 'uuid-customer-123',
  })
  @IsUUID()
  customerId: string;

  @ApiProperty({
    description: 'The ID of the package being booked',
    example: 'uuid-package-123',
  })
  @IsUUID()
  packageId: string;

  @ApiProperty({
    description: 'Additional notes for the booking',
    example: 'Special requirements for the event',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Status of the booking',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
    required: false,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiProperty({
    description: 'Date and time of the event',
    example: '2024-12-25T10:00:00Z',
  })
  @IsDateString()
  eventDate: string;

  @ApiProperty({
    description: 'Total price of the booking',
    example: 5000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPrice?: number;
}
