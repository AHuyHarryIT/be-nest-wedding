import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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
}
