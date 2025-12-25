import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class AlbumFileDto {
  @ApiProperty({ description: 'File ID to add to album' })
  @IsUUID()
  @IsNotEmpty()
  fileId: string;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Caption for the file' })
  @IsString()
  @IsOptional()
  caption?: string;
}

export class AddFilesToAlbumDto {
  @ApiProperty({
    description: 'Array of files to add',
    type: [AlbumFileDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlbumFileDto)
  files: AlbumFileDto[];
}
