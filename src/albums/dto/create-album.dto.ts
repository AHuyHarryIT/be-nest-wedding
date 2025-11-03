import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class CreateAlbumDto {
  @ApiProperty({
    description: 'Owner user ID',
    example: 'uuid-user-1234',
  })
  @IsString()
  @IsNotEmpty()
  ownerUserId: string;

  @ApiProperty({
    description: 'Booking ID',
    example: 'uuid-booking-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiProperty({
    description: 'Album title',
    example: 'Wedding Photos 2024',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Album description',
    example: 'Beautiful moments from our special day',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Is album public',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({
    description: 'Share token',
    example: 'abc123token',
    required: false,
  })
  @IsOptional()
  @IsString()
  shareToken?: string;

  @ApiProperty({
    description: 'Expiration date',
    example: '2025-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    description: 'Cover file ID',
    example: 'uuid-file-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  coverFileId?: string;
}
