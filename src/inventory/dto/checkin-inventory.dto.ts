import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, Min, IsNumber } from 'class-validator';

export class CheckinInventoryDto {
  @ApiPropertyOptional({
    description: 'Condition check-in note',
    example: 'Minor scratches on gold arch',
  })
  @IsOptional()
  @IsString()
  damageNote?: string;

  @ApiPropertyOptional({
    description: 'Cost of damages if any',
    example: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  damageCost?: number;

  @ApiPropertyOptional({
    description: 'Quantity to check in',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity?: number;
}
