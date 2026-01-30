import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class GenerateShareTokenDto {
  @ApiPropertyOptional({
    description:
      'Token expiration date in ISO 8601 format (optional, no expiration if not provided)',
    example: '2024-12-31T23:59:59Z',
    format: 'date-time',
  })
  @IsDateString(
    {},
    { message: 'Expiration date must be a valid ISO 8601 date string' },
  )
  @IsOptional()
  expiresAt?: string;
}
