import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class ViewJobDto {
  @ApiProperty({
    description: 'Job ID',
    example: 'uuid-1234',
  })
  @IsUUID('4')
  id: string;

  @ApiProperty({
    description: 'Job name',
    example: 'Lead Photographer',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Job description',
    example: 'Primary camera and shoot direction responsibility',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description: string | null;

  @ApiPropertyOptional({
    description: 'Is job active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Deletion date',
    example: null,
    nullable: true,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deletedAt: Date | null;

  @ApiProperty({
    description: 'Creation date',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    description: 'Update date',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}
