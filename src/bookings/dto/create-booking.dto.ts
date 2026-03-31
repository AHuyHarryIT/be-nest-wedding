import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssignBookingStaffItemDto } from './assign-booking-staff.dto';

export class CreateBookingDto {
  @ApiPropertyOptional({
    description: 'Customer user ID (UUID format)',
    example: 'uuid-1234',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Customer ID must be a valid UUID' })
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'List of package IDs to include in booking',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray({ message: 'Package IDs must be an array' })
  @ValidateIf((o) => o.packageIds !== undefined && o.packageIds?.length > 0)
  @ArrayMinSize(1, {
    message: 'If packages are provided, at least one is required',
  })
  @IsUUID('4', { each: true, message: 'Each package ID must be a valid UUID' })
  @IsOptional()
  packageIds?: string[];

  @ApiPropertyOptional({
    description: 'List of service IDs to include in booking',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray({ message: 'Service IDs must be an array' })
  @ValidateIf((o) => o.serviceIds !== undefined && o.serviceIds?.length > 0)
  @ArrayMinSize(1, {
    message: 'If services are provided, at least one is required',
  })
  @IsUUID('4', { each: true, message: 'Each service ID must be a valid UUID' })
  @IsOptional()
  serviceIds?: string[];

  @ApiPropertyOptional({
    description: 'Special notes or requests for the booking',
    example: 'Special requests for the wedding',
    maxLength: 1000,
  })
  @IsString({ message: 'Notes must be a string' })
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Event date in ISO 8601 format',
    example: '2024-12-31T10:00:00Z',
    format: 'date-time',
  })
  @IsDateString(
    {},
    { message: 'Event date must be a valid ISO 8601 date string' },
  )
  @IsNotEmpty({ message: 'Event date is required' })
  eventDate: string;

  @ApiPropertyOptional({
    description: 'Total booking price in VND',
    example: 10000,
    default: 0,
    minimum: 0,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Total price must be a valid number' },
  )
  @IsOptional()
  @Min(0, { message: 'Total price cannot be negative' })
  totalPrice?: number;

  @ApiPropertyOptional({
    description: 'List of staff IDs assigned to the booking',
    type: [String],
    example: ['STF-ADMIN', 'STF-QA-002'],
  })
  @IsArray({ message: 'Staff IDs must be an array' })
  @ArrayUnique({ message: 'Staff IDs must be unique' })
  @IsString({ each: true, message: 'Each staff ID must be a string' })
  @IsOptional()
  staffIds?: string[];

  @ApiPropertyOptional({
    description: 'Assigned staff members with optional jobs',
    type: [AssignBookingStaffItemDto],
  })
  @IsArray({ message: 'Staff assignments must be an array' })
  @ValidateNested({ each: true })
  @Type(() => AssignBookingStaffItemDto)
  @IsOptional()
  staffAssignments?: AssignBookingStaffItemDto[];
}
