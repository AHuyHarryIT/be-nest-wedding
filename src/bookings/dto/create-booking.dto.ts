import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { BookingStatus } from 'generated/prisma';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Customer ID',
    example: 'uuid-customer-1234',
  })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({
    description: 'Package ID',
    example: 'uuid-package-1234',
  })
  @IsString()
  @IsNotEmpty()
  packageId: string;

  @ApiProperty({
    description: 'Event date',
    example: '2024-12-31T18:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  eventDate: string;

  @ApiProperty({
    description: 'Notes for the booking',
    example: 'Special requirements here',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Total price',
    example: 5000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @ApiProperty({
    description: 'Status of the booking',
    enum: BookingStatus,
    example: BookingStatus.PENDING,
    required: false,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
