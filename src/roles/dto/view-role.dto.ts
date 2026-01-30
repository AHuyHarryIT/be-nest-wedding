import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsArray, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ViewRolePermissionDto {
  @ApiProperty({
    description: 'Role ID',
    example: 'uuid-role-1',
  })
  @IsUUID('4')
  roleId: string;

  @ApiProperty({
    description: 'Permission ID',
    example: 'uuid-permission-1',
  })
  @IsUUID('4')
  permissionId: string;

  @ApiProperty({
    description: 'Permission details',
    example: {
      id: 'uuid-permission-1',
      key: 'user:read',
      description: 'Allows reading user data',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
    },
  })
  permission: Record<string, any>;
}

export class ViewRoleDto {
  @ApiProperty({
    description: 'Unique identifier of the role',
    example: 'uuid-role-1',
  })
  @IsUUID('4')
  id: string;

  @ApiProperty({
    description: 'Name of the role',
    example: 'Admin',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the role',
    example: 'Administrator role with full access',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  description: string | null;

  @ApiProperty({
    description: 'Creation date of the role',
    example: '2023-01-01T00:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date of the role',
    example: '2023-01-01T00:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'List of permissions associated with the role',
    type: [ViewRolePermissionDto],
  })
  @IsArray()
  @IsOptional()
  permissions?: ViewRolePermissionDto[];
}
