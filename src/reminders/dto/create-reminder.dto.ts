import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ReminderType } from 'generated/prisma';

export class CreateReminderDto {
  @ApiProperty({
    enum: ReminderType,
    description: 'Type of reminder',
    example: 'BOOKING_REMINDER',
  })
  @IsEnum(ReminderType)
  type: ReminderType;

  @ApiProperty({
    description: 'Title of the reminder',
    example: 'Wedding event reminder',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Message content of the reminder',
    example: 'Upcoming wedding event for John Doe',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Scheduled date/time for the reminder',
    example: '2026-05-15T10:00:00.000Z',
  })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({
    description: 'Associated booking ID',
  })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({
    description: 'Associated customer ID',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Associated inventory item ID',
  })
  @IsOptional()
  @IsString()
  itemId?: string;
}
