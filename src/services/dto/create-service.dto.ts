import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({
    description: 'The name of the service',
    example: 'Wedding Photography',
    maxLength: 255,
  })
  @IsString({ message: 'Service name must be a string' })
  @IsNotEmpty({ message: 'Service name is required' })
  @MaxLength(255, { message: 'Service name cannot exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'The description of the service',
    example: 'Professional wedding photography service',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Service description must be a string' })
  @MaxLength(1000, {
    message: 'Service description cannot exceed 1000 characters',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'The price of the service',
    example: 1500,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return typeof value === 'number' ? value : 0;
  })
  price?: number;

  @ApiPropertyOptional({
    description: 'Whether the service is active',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Optional managed job required for this service',
    example: '4a7ab730-dcdb-4d1d-af79-369411b9dee8',
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    return value;
  })
  @IsUUID('4', { message: 'Job ID must be a valid UUID' })
  jobId?: string | null;
}
