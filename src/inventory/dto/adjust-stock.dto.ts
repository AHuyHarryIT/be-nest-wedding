import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString } from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({
    description:
      'Number of items to add (positive) or remove (negative) from stock',
    example: 5,
  })
  @Type(() => Number)
  @IsInt()
  quantity: number;

  @ApiProperty({
    description: 'Reason for adjustment',
    example: 'Manual stock count correction',
  })
  @IsString()
  note: string;
}
