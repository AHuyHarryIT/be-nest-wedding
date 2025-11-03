import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateInventoryReservationDto {
  @ApiProperty({
    description: 'The ID of the product to reserve',
    example: 'uuid-product-123',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'The ID of the session this reservation is for',
    example: 'uuid-session-123',
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    description: 'Quantity to reserve',
    example: 5,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Date and time when the reservation was made',
    example: '2024-12-25T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  reservedAt?: string;
}
