import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class CreateCustomerBookingDto {
  @ApiPropertyOptional({
    description: 'List of package IDs to include in booking',
    type: [String],
    example: ['uuid-1'],
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
    example: ['uuid-1'],
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
    example: 'Outdoor ceremony. Guest count: 180. Location: District 2.',
    maxLength: 1000,
  })
  @IsString({ message: 'Notes must be a string' })
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Event date in ISO 8601 format',
    example: '2026-07-15T12:00:00.000Z',
    format: 'date-time',
  })
  @IsNotEmpty({ message: 'Event date is required' })
  @IsDateString(
    {},
    { message: 'Event date must be a valid ISO 8601 date string' },
  )
  eventDate: string;
}
