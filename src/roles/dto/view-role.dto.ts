import { ApiProperty } from '@nestjs/swagger';
import type { Permission, Role } from 'generated/prisma';

export class ViewRolePermissionDto {
  @ApiProperty({
    description: 'Role ID',
    example: 'uuid-role-1',
  })
  roleId: string;

  @ApiProperty({
    description: 'Permission ID',
    example: 'uuid-permission-1',
  })
  permissionId: string;

  @ApiProperty({
    description: 'Permission details',
    example: {
      id: 'uuid-permission-1',
      key: 'user:read',
      description: 'Allows reading user data',
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    },
  })
  permission: Permission;
}

export class ViewRoleDto implements Role {
  @ApiProperty({
    description: 'Unique identifier of the role',
    example: 'uuid-role-1',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the role',
    example: 'Admin',
  })
  name: string;

  @ApiProperty({
    description: 'Description of the role',
    example: 'Administrator role with full access',
  })
  description: string | null;

  @ApiProperty({
    description: 'Creation date of the role',
    example: '2023-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date of the role',
    example: '2023-01-01T00:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'List of permissions associated with the role',
    type: [ViewRolePermissionDto],
  })
  permissions: ViewRolePermissionDto[];
}
