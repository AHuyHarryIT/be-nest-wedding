import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateJobDto {
  @ApiProperty({
    description: 'The name of the job',
    example: 'Lead Photographer',
    maxLength: 255,
  })
  @IsString({ message: 'Job name must be a string' })
  @IsNotEmpty({ message: 'Job name is required' })
  @MaxLength(255, { message: 'Job name cannot exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'The description of the job',
    example: 'Primary camera and shoot direction responsibility',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Job description must be a string' })
  @MaxLength(1000, {
    message: 'Job description cannot exceed 1000 characters',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the job is active',
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
}
