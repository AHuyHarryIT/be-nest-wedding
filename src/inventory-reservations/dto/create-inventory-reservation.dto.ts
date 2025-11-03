import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateInventoryReservationDto {
  @ApiProperty({
    description: 'Product ID',
    example: 'uuid-product-1234',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Session ID',
    example: 'uuid-session-1234',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'Quantity',
    example: 5,
  })
  @IsNumber()
  @Min(1)
  quantity: number;
}
