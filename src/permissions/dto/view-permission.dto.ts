import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ViewPermissionDto {
  @ApiProperty({
    description: 'The unique identifier of the permission',
    example: 'uuid-1234-5678-9012-3456',
  })
  @IsUUID('4')
  id: string;

  @ApiProperty({
    description: 'The key of the permission',
    example: 'user:read',
  })
  @IsString()
  key: string;

  @ApiPropertyOptional({
    description: 'The description of the permission',
    example: 'Allows reading user data',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description: string | null;

  @ApiProperty({
    description: 'The creation date of the permission',
    example: '2023-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  created_at: Date;

  @ApiProperty({
    description: 'The last update date of the permission',
    example: '2023-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  updated_at: Date;
}
