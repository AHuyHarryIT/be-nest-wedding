import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ReminderType, ReminderStatus } from 'generated/prisma';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common';

export class ReminderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ReminderType,
    description: 'Filter by reminder type',
    example: 'BOOKING_REMINDER',
  })
  @IsOptional()
  @IsEnum(ReminderType)
  type?: ReminderType;

  @ApiPropertyOptional({
    enum: ReminderStatus,
    description: 'Filter by reminder status',
    example: 'PENDING',
  })
  @IsOptional()
  @IsEnum(ReminderStatus)
  status?: ReminderStatus;

  @ApiPropertyOptional({
    description: 'Filter by booking ID',
  })
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
  })
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by inventory item ID',
  })
  @IsOptional()
  itemId?: string;
}
