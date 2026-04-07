import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class InventoryLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by log type' })
  @IsOptional()
  @IsString()
  type?: string;
}
