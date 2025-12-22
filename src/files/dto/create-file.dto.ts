import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisibilityLevel } from 'generated/prisma';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateFileDto {
  @ApiProperty({ description: 'Uploader user ID' })
  @IsUUID()
  @IsNotEmpty()
  uploaderId: string;

  @ApiProperty({ description: 'Storage key' })
  @IsString()
  @IsNotEmpty()
  storageKey: string;

  @ApiProperty({ description: 'Storage URL' })
  @IsString()
  @IsNotEmpty()
  storageUrl: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsInt()
  @IsNotEmpty()
  byteSize: number;

  @ApiPropertyOptional({ description: 'Image width' })
  @IsInt()
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({ description: 'Image height' })
  @IsInt()
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ description: 'File checksum' })
  @IsString()
  @IsOptional()
  checksum?: string;

  @ApiProperty({ description: 'Usage type' })
  @IsString()
  @IsNotEmpty()
  usageType: string;

  @ApiPropertyOptional({
    description: 'Visibility level',
    enum: VisibilityLevel,
    default: VisibilityLevel.PRIVATE,
  })
  @IsEnum(VisibilityLevel)
  @IsOptional()
  visibility?: VisibilityLevel;
}
