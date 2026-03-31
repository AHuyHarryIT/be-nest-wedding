import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAlbumDto {
  @ApiPropertyOptional({
    description: 'Owner staff ID',
    example: 'STF-ADMIN',
  })
  @IsString({ message: 'Owner user ID must be a string' })
  @IsOptional()
  ownerUserId?: string;

  @ApiPropertyOptional({
    description: 'Associated booking ID (UUID format)',
    example: 'uuid-1234',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Booking ID must be a valid UUID' })
  @IsOptional()
  bookingId?: string;

  @ApiProperty({
    description: 'Album title (max 255 characters)',
    example: 'Wedding Photos',
    maxLength: 255,
  })
  @IsString({ message: 'Album title must be a string' })
  @IsNotEmpty({ message: 'Album title is required' })
  @MaxLength(255, { message: 'Album title cannot exceed 255 characters' })
  title: string;

  @ApiPropertyOptional({
    description: 'Album description (max 1000 characters)',
    example: 'Beautiful wedding photography collection',
    maxLength: 1000,
  })
  @IsString({ message: 'Album description must be a string' })
  @IsOptional()
  @MaxLength(1000, {
    message: 'Album description cannot exceed 1000 characters',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether album is publicly accessible',
    example: false,
    default: false,
  })
  @IsBoolean({ message: 'isPublic must be a boolean value' })
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Share token for public access (max 500 characters)',
    example: 'share-token-abc123',
    maxLength: 500,
  })
  @IsString({ message: 'Share token must be a string' })
  @IsOptional()
  @MaxLength(500, { message: 'Share token cannot exceed 500 characters' })
  shareToken?: string;

  @ApiPropertyOptional({
    description: 'Token expiration date in ISO 8601 format',
    example: '2024-12-31T23:59:59Z',
    format: 'date-time',
  })
  @IsDateString(
    {},
    { message: 'Expiration date must be a valid ISO 8601 date string' },
  )
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Cover file ID (UUID format)',
    example: 'uuid-1234',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Cover file ID must be a valid UUID' })
  @IsOptional()
  coverFileId?: string;
}
