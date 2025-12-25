import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ViewUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;
}

class ViewBookingDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  eventDate: Date;
}

class ViewFileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  fileUrl: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;
}

class ViewAlbumFileDto {
  @ApiProperty()
  fileId: string;

  @ApiProperty()
  albumId: string;

  @ApiProperty()
  sortOrder: number;

  @ApiPropertyOptional()
  caption?: string;

  @ApiProperty({ type: ViewFileDto })
  file: ViewFileDto;
}

export class ViewAlbumDto {
  @ApiProperty({ description: 'Album ID (OneDrive folder ID)' })
  id: string;

  @ApiProperty({ description: 'Owner user ID' })
  ownerUserId: string;

  @ApiPropertyOptional({ description: 'Related booking ID' })
  bookingId?: string;

  @ApiProperty({ description: 'Album title' })
  title: string;

  @ApiPropertyOptional({ description: 'Album description' })
  description?: string;

  @ApiProperty({ description: 'Is album public' })
  isPublic: boolean;

  @ApiPropertyOptional({ description: 'Share token for public access' })
  share_token?: string;

  @ApiPropertyOptional({ description: 'Share token expiration date' })
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Cover file ID' })
  coverFileId?: string;

  @ApiProperty({ description: 'Album creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Album last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Album deletion date' })
  deletedAt?: Date;

  @ApiPropertyOptional({ description: 'OneDrive folder URL' })
  oneDriveFolderUrl?: string;

  @ApiPropertyOptional({ type: ViewUserDto, description: 'Album owner' })
  owner?: ViewUserDto;

  @ApiPropertyOptional({ type: ViewBookingDto, description: 'Related booking' })
  booking?: ViewBookingDto;

  @ApiPropertyOptional({ type: ViewFileDto, description: 'Cover file' })
  coverFile?: ViewFileDto;

  @ApiPropertyOptional({
    type: [ViewAlbumFileDto],
    description: 'Files in album',
  })
  files?: ViewAlbumFileDto[];

  @ApiPropertyOptional({ description: 'Number of files in album' })
  _count?: {
    files: number;
  };
}
