import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsBoolean,
  IsDate,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

class ViewUserDto {
  @ApiProperty({
    description: 'User ID',
    example: 'STF-ADMIN',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsString()
  email: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  @IsString()
  name: string;
}

class ViewBookingDto {
  @ApiProperty({
    description: 'Booking ID',
    example: 'uuid-1234',
  })
  @IsUUID('4')
  id: string;

  @ApiProperty({
    description: 'Event date',
    example: '2024-12-31T10:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  eventDate: Date;
}

class ViewFileDto {
  @ApiProperty({
    description: 'File ID',
    example: 'uuid-1234',
  })
  @IsUUID('4')
  id: string;

  @ApiProperty({
    description: 'File name',
    example: 'wedding-photo.jpg',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'File URL',
    example: 'https://example.com/file.jpg',
  })
  @IsString()
  fileUrl: string;

  @ApiPropertyOptional({
    description: 'Thumbnail URL',
    example: 'https://example.com/thumb.jpg',
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

class ViewAlbumFileDto {
  @ApiProperty({
    description: 'File ID',
    example: 'uuid-1234',
  })
  @IsUUID('4')
  fileId: string;

  @ApiProperty({
    description: 'Album ID',
    example: 'uuid-1234',
  })
  @IsUUID('4')
  albumId: string;

  @ApiProperty({
    description: 'Sort order',
    example: 1,
  })
  @IsNumber()
  sortOrder: number;

  @ApiPropertyOptional({
    description: 'File caption',
    example: 'Beautiful wedding moment',
  })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiProperty({
    type: ViewFileDto,
    description: 'File details',
  })
  file: ViewFileDto;
}

export class ViewAlbumDto {
  @ApiProperty({
    description: 'Album ID (OneDrive folder ID)',
    example: 'uuid-1234',
  })
  @IsUUID('4')
  id: string;

  @ApiProperty({
    description: 'Owner user ID',
    example: 'STF-ADMIN',
  })
  @IsString()
  ownerUserId: string;

  @ApiPropertyOptional({
    description: 'Related booking ID',
    example: 'uuid-booking-1',
  })
  @IsOptional()
  @IsUUID('4')
  bookingId?: string;

  @ApiPropertyOptional({
    description: 'Assigned customer ID',
    example: 'uuid-customer-1',
  })
  @IsOptional()
  @IsUUID('4')
  customerId?: string;

  @ApiProperty({
    description: 'Album title',
    example: 'Wedding Photos',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Album description',
    example: 'Beautiful wedding photography collection',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Is album public',
    example: false,
  })
  @IsBoolean()
  isPublic: boolean;

  @ApiPropertyOptional({
    description: 'Share token for public access',
    example: 'share-token-abc123',
  })
  @IsOptional()
  @IsString()
  shareToken?: string;

  @ApiPropertyOptional({
    description: 'Share token expiration date',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: 'Cover file ID',
    example: 'uuid-file-1',
  })
  @IsOptional()
  @IsUUID('4')
  coverFileId?: string;

  @ApiProperty({
    description: 'Album creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    description: 'Album last update date',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Album deletion date',
    example: null,
    nullable: true,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deletedAt?: Date;

  @ApiPropertyOptional({
    description: 'OneDrive folder URL',
    example: 'https://example.onedrive.com/folder',
  })
  @IsOptional()
  @IsString()
  one_drive_folder_url?: string;

  @ApiPropertyOptional({
    type: ViewUserDto,
    description: 'Album owner details',
  })
  @IsOptional()
  owner?: ViewUserDto;

  @ApiPropertyOptional({
    type: ViewBookingDto,
    description: 'Related booking details',
  })
  @IsOptional()
  booking?: ViewBookingDto;

  @ApiPropertyOptional({
    type: ViewFileDto,
    description: 'Cover file details',
  })
  @IsOptional()
  cover_file?: ViewFileDto;

  @ApiPropertyOptional({
    type: [ViewAlbumFileDto],
    description: 'Files in album',
  })
  @IsOptional()
  files?: ViewAlbumFileDto[];

  @ApiPropertyOptional({
    description: 'File count metadata',
    example: { files: 10 },
  })
  @IsOptional()
  _count?: {
    files: number;
  };
}
