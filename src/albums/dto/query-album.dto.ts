import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationRequestDto } from '../../common/dto/response.dto';

enum AlbumSortBy {
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  TITLE = 'title',
}

export class QueryAlbumDto extends PaginationRequestDto {
  @ApiPropertyOptional({
    description: 'Search by album title or description',
    example: 'Wedding',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by owner user ID',
    example: 'uuid-1234',
  })
  @IsUUID('4')
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by booking ID',
    example: 'uuid-1234',
  })
  @IsUUID('4')
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({
    description: 'Filter by public/private (true/false)',
    example: 'true',
    enum: ['true', 'false'],
  })
  @IsString()
  @IsOptional()
  isPublic?: string;

  @ApiPropertyOptional({
    enum: AlbumSortBy,
    default: AlbumSortBy.CREATED_AT,
    description: 'Sort by field',
  })
  @IsEnum(AlbumSortBy)
  @IsOptional()
  sortBy?: AlbumSortBy;
}
