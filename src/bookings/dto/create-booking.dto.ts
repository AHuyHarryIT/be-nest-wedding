import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'Customer user ID' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({
    description: 'List of package IDs',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  packageIds?: string[];

  @ApiPropertyOptional({
    description: 'List of service IDs',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  serviceIds?: string[];

  @ApiPropertyOptional({ description: 'Booking notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Event date', example: '2024-12-31T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  eventDate: string;

  @ApiPropertyOptional({ description: 'Total price', default: 0 })
  @IsNumber()
  @IsOptional()
  totalPrice?: number;
}
