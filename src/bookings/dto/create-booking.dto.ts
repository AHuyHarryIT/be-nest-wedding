import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMinSize,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Customer user ID (UUID format)',
    example: 'uuid-1234',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Customer ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId: string;

  @ApiPropertyOptional({
    description: 'List of package IDs to include in booking',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray({ message: 'Package IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one package ID is required' })
  @IsUUID('4', { each: true, message: 'Each package ID must be a valid UUID' })
  @IsOptional()
  packageIds?: string[];

  @ApiPropertyOptional({
    description: 'List of service IDs to include in booking',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray({ message: 'Service IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one service ID is required' })
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
}
