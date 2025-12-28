import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VisibilityLevel } from 'generated/prisma';

export class UploadImageToAlbumDto {
  @ApiPropertyOptional({ description: 'Image caption' })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional({ description: 'Sort order in album' })
  @IsString()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Image visibility level' })
  @IsEnum(VisibilityLevel)
  @IsOptional()
  visibility?: VisibilityLevel;

  @ApiPropertyOptional({ description: 'Image usage type', default: 'album' })
  @IsString()
  @IsOptional()
  usageType?: string;
}
