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
  ArrayMinSize,
} from 'class-validator';

class AlbumFileDto {
  @ApiProperty({
    description: 'File ID to add to album',
    example: 'uuid-1234',
  })
  @IsUUID('4')
  @IsNotEmpty()
  fileId: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 0,
    default: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Caption for the file (max 500 characters)',
    example: 'Wedding moment',
    maxLength: 500,
  })
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
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AlbumFileDto)
  @IsNotEmpty()
  files: AlbumFileDto[];
}
