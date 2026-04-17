import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationRequestDto } from '../../common/dto/response.dto';

export enum CustomerAlbumSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  TITLE = 'title',
  EVENT_DATE = 'eventDate',
}

export class QueryCustomerAlbumsDto extends PaginationRequestDto {
  @ApiPropertyOptional({
    description: 'Search by album title or description',
    example: 'Wedding',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by booking ID',
    example: 'uuid-1234',
  })
  @IsUUID('4')
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({
    enum: CustomerAlbumSortBy,
    default: CustomerAlbumSortBy.CREATED_AT,
    description: 'Sort by field',
  })
  @IsEnum(CustomerAlbumSortBy)
  @IsOptional()
  sortBy?: CustomerAlbumSortBy;
}
