import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisibilityLevel } from 'generated/prisma';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UploadImageDto {
  @ApiProperty({ description: 'Uploader user ID' })
  @IsUUID()
  @IsNotEmpty()
  uploaderId: string;

  @ApiPropertyOptional({ description: 'Image visibility level' })
  @IsEnum(VisibilityLevel)
  @IsOptional()
  visibility?: VisibilityLevel;

  @ApiPropertyOptional({ description: 'Image usage type' })
  @IsString()
  @IsOptional()
  usageType?: string;
}
