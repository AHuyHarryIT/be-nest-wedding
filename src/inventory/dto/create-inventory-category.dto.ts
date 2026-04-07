import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MaxLength, IsEnum } from 'class-validator';
import { ItemType } from 'generated/prisma';

export class CreateInventoryCategoryDto {
  @ApiProperty({
    description: 'Name of the inventory category',
    example: 'Wedding Decorations',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
