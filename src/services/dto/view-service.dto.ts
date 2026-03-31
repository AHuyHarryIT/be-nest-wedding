import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsNumber,
  IsBoolean,
  IsDate,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ViewServiceDto {
  @ApiProperty({
    description: 'Service ID',
    example: 'uuid-1234',
  })
  @IsUUID('4')
  id: string;

  @ApiProperty({
    description: 'Service name',
    example: 'Wedding Photography',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Service description',
    example: 'Professional wedding photography service',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description: string | null;

  @ApiPropertyOptional({
    description: 'Service price',
    example: 1500,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Is service active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active: boolean;

  @ApiProperty({
    description: 'Creation date',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  created_at: Date;

  @ApiProperty({
    description: 'Update date',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  updated_at: Date;

  @ApiPropertyOptional({
    description: 'Deletion date',
    example: null,
    nullable: true,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deleted_at: Date | null;

  @ApiPropertyOptional({
    description: 'Managed job ID required for this service',
    example: '4a7ab730-dcdb-4d1d-af79-369411b9dee8',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4')
  jobId?: string | null;

  @ApiPropertyOptional({
    description: 'Managed job summary',
    example: {
      id: '4a7ab730-dcdb-4d1d-af79-369411b9dee8',
      name: 'Photographer',
    },
    nullable: true,
  })
  @IsOptional()
  job?: { id: string; name: string } | null;
}
