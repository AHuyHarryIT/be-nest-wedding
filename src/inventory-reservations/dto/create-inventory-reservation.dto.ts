import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateInventoryReservationDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Booking session ID' })
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'Quantity to reserve' })
  @IsInt()
  @IsNotEmpty()
  quantity: number;
}
