import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { VisibilityLevel } from 'generated/prisma';

export class CreateFileDto {
  @ApiProperty({
    description: 'The ID of the user uploading the file',
    example: 'uuid-user-123',
  })
  @IsUUID()
  uploaderId: string;

  @ApiProperty({
    description: 'Storage key for the file',
    example: 'files/2024/image.jpg',
  })
  @IsString()
  storageKey: string;

  @ApiProperty({
    description: 'Storage URL for the file',
    example: 'https://storage.example.com/files/2024/image.jpg',
  })
  @IsString()
  storageUrl: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  })
  @IsString()
  mimeType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 102400,
  })
  @IsInt()
  @Min(0)
  byteSize: number;

  @ApiProperty({
    description: 'Width of the image (if applicable)',
    example: 1920,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number;

  @ApiProperty({
    description: 'Height of the image (if applicable)',
    example: 1080,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;

  @ApiProperty({
    description: 'Checksum of the file',
    example: 'sha256:abc123...',
    required: false,
  })
  @IsOptional()
  @IsString()
  checksum?: string;

  @ApiProperty({
    description: 'Usage type of the file',
    example: 'profile_photo',
  })
  @IsString()
  usageType: string;

  @ApiProperty({
    description: 'Visibility level of the file',
    enum: VisibilityLevel,
    default: VisibilityLevel.PRIVATE,
    required: false,
  })
  @IsOptional()
  @IsEnum(VisibilityLevel)
  visibility?: VisibilityLevel;
}
