import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BookingStatus } from 'generated/prisma';
import { CreateBookingDto } from './create-booking.dto';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @ApiPropertyOptional({
    enum: BookingStatus,
    description: 'Updated booking status',
    example: BookingStatus.CONFIRMED,
  })
  @IsEnum(BookingStatus, { message: 'Status must be a valid booking status' })
  @IsOptional()
  status?: BookingStatus;
}
