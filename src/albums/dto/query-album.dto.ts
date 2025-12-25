import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationRequestDto } from '../../common/dto/response.dto';

enum AlbumSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  TITLE = 'title',
}

export class QueryAlbumDto extends PaginationRequestDto {
  @ApiPropertyOptional({ description: 'Search by album title or description' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by owner user ID' })
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Filter by booking ID' })
  @IsUUID()
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Filter by public/private' })
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
