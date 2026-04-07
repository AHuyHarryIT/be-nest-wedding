import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ReminderStatus } from 'generated/prisma';

export class UpdateReminderDto {
  @ApiPropertyOptional({
    enum: ReminderStatus,
    description: 'Status of the reminder',
    example: 'TRIGGERED',
  })
  @IsOptional()
  @IsEnum(ReminderStatus)
  status?: ReminderStatus;

  @ApiPropertyOptional({
    description: 'Scheduled date/time for the reminder',
    example: '2026-05-15T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Title of the reminder',
    example: 'Updated reminder title',
  })
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Message content of the reminder',
  })
  @IsOptional()
  message?: string;
}
