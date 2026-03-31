import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryCustomerDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Include soft-deleted customer accounts',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'includeDeleted must be a boolean value' })
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  includeDeleted?: boolean;
}
