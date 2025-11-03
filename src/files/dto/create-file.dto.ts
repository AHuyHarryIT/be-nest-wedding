import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { VisibilityLevel } from 'generated/prisma';

export class CreateFileDto {
  @ApiProperty({
    description: 'Uploader user ID',
    example: 'uuid-user-1234',
  })
  @IsString()
  @IsNotEmpty()
  uploaderId: string;

  @ApiProperty({
    description: 'Storage key',
    example: 'files/2024/image.jpg',
  })
  @IsString()
  @IsNotEmpty()
  storageKey: string;

  @ApiProperty({
    description: 'Storage URL',
    example: 'https://cdn.example.com/files/2024/image.jpg',
  })
  @IsString()
  @IsNotEmpty()
  storageUrl: string;

  @ApiProperty({
    description: 'MIME type',
    example: 'image/jpeg',
  })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 102400,
  })
  @IsNumber()
  @IsNotEmpty()
  byteSize: number;

  @ApiProperty({
    description: 'Image width',
    example: 1920,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiProperty({
    description: 'Image height',
    example: 1080,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiProperty({
    description: 'File checksum',
    example: 'abc123def456',
    required: false,
  })
  @IsOptional()
  @IsString()
  checksum?: string;

  @ApiProperty({
    description: 'Usage type',
    example: 'wedding-photo',
  })
  @IsString()
  @IsNotEmpty()
  usageType: string;

  @ApiProperty({
    description: 'Visibility level',
    enum: VisibilityLevel,
    example: VisibilityLevel.PRIVATE,
    required: false,
  })
  @IsOptional()
  @IsEnum(VisibilityLevel)
  visibility?: VisibilityLevel;
}
