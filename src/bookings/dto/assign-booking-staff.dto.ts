import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AssignBookingStaffItemDto {
  @ApiPropertyOptional({
    description: 'Stable source key for the service assignment row',
    example: 'package:pkg-1:service:svc-1',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Source key must be a string' })
  sourceKey?: string;

  @ApiProperty({
    description: 'Assigned staff ID',
    example: 'STF-ADMIN',
  })
  @IsString({ message: 'Staff ID must be a string' })
  staffId: string;

  @ApiPropertyOptional({
    description: 'Source service label for this assignment row',
    example: 'Seeded Assignment Package / Photography',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Service label must be a string' })
  serviceLabel?: string;

  @ApiPropertyOptional({
    description: 'Job or responsibility for the staff member on this booking',
    example: 'Main photographer',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Job must be a string' })
  job?: string;

  @ApiPropertyOptional({
    description: 'Optional service location for this booking assignment row',
    example: 'Da Nang Beach Resort',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Location name must be a string' })
  locationName?: string;

  @ApiPropertyOptional({
    description:
      'Optional service start time in HH:mm format for this assignment row',
    example: '09:30',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Start time must be a string' })
  startTime?: string;

  @ApiPropertyOptional({
    description:
      'Optional service end time in HH:mm format for this assignment row',
    example: '11:30',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'End time must be a string' })
  endTime?: string;
}

export class AssignBookingStaffDto {
  @ApiProperty({
    description: 'List of assigned staff IDs for the booking',
    type: [String],
    example: ['STF-ADMIN', 'STF-QA-002'],
    required: false,
  })
  @IsArray({ message: 'Staff IDs must be an array' })
  @ArrayUnique({ message: 'Staff IDs must be unique' })
  @IsString({ each: true, message: 'Each staff ID must be a string' })
  @IsOptional()
  staffIds?: string[];

  @ApiPropertyOptional({
    description:
      'Assigned staff members with an optional job or responsibility',
    type: [AssignBookingStaffItemDto],
  })
  @IsArray({ message: 'Staff assignments must be an array' })
  @ValidateNested({ each: true })
  @Type(() => AssignBookingStaffItemDto)
  @IsOptional()
  staffAssignments?: AssignBookingStaffItemDto[];

  @ApiPropertyOptional({
    description:
      'Allow assignment save even when overlap conflicts are detected',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'allowConflictOverride must be a boolean value' })
  allowConflictOverride?: boolean;

  @ApiPropertyOptional({
    description:
      'Mandatory reason when override is used for overlap conflicts',
    example: 'Photographer handoff requires temporary overlap for coverage.',
    maxLength: 500,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((dto: AssignBookingStaffDto) => dto.allowConflictOverride === true)
  @IsString({
    message:
      'Override reason is required when allowing conflict override on assignment',
  })
  @Length(1, 500, {
    message: 'Override reason must be between 1 and 500 characters',
  })
  overrideReason?: string;
}
