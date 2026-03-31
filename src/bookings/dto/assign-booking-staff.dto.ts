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
  @ApiProperty({
    description: 'Assigned staff ID',
    example: 'STF-ADMIN',
  })
  @IsString({ message: 'Staff ID must be a string' })
  staffId: string;

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
