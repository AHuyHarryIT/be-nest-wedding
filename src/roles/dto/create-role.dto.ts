import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsArray,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'The unique name of the role',
    example: 'admin',
    maxLength: 255,
  })
  @IsString({ message: 'Role name must be a string' })
  @IsNotEmpty({ message: 'Role name is required' })
  @MaxLength(255, { message: 'Role name cannot exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the role',
    example: 'Administrator role with full access',
    nullable: true,
    maxLength: 1000,
  })
  @IsString({ message: 'Role description must be a string' })
  @IsOptional()
  @MaxLength(1000, {
    message: 'Role description cannot exceed 1000 characters',
  })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Array of permission IDs to assign to this role',
    example: ['uuid-1', 'uuid-2'],
    type: [String],
  })
  @IsArray({ message: 'Permission IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one permission ID is required' })
  @IsUUID('4', {
    each: true,
    message: 'Each permission ID must be a valid UUID',
  })
  @IsOptional()
  permissionIds?: string[];
}
