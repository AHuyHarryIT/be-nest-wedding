import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAlbumDto {
  @ApiProperty({
    description: 'The ID of the owner of the album',
    example: 'uuid-user-123',
  })
  @IsUUID()
  ownerUserId: string;

  @ApiProperty({
    description: 'The ID of the booking this album is for (optional)',
    example: 'uuid-booking-123',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiProperty({
    description: 'Title of the album',
    example: 'Wedding Photos - December 2024',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Description of the album',
    example: 'Beautiful wedding ceremony photos',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Whether the album is public',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({
    description: 'Share token for the album',
    example: 'abc123xyz',
    required: false,
  })
  @IsOptional()
  @IsString()
  share_token?: string;

  @ApiProperty({
    description: 'Expiration date for the album share',
    example: '2025-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    description: 'ID of the cover file',
    example: 'uuid-file-123',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  coverFileId?: string;
}
