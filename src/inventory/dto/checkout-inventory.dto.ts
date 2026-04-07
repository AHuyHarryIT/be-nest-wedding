import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CheckoutInventoryDto {
  @ApiProperty({
    description: 'Expected return date for the rental',
  })
  expectedReturnDate: Date;

  @ApiPropertyOptional({
    description: 'Note for this checkout',
    example: 'Rented for weekend ceremony',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Quantity to check out',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;
}
