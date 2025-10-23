import { ApiProperty } from '@nestjs/swagger';
import { Permission } from 'generated/prisma';

export class ViewPermissionDto implements Permission {
  @ApiProperty({
    description: 'The unique identifier of the permission',
    example: 'uuid-1234-5678-9012-3456',
  })
  id: string;

  @ApiProperty({
    description: 'The key of the permission',
    example: 'user:read',
  })
  key: string;

  @ApiProperty({
    description: 'The description of the permission',
    example: 'Allows reading user data',
  })
  description: string | null;

  @ApiProperty({
    description: 'The creation date of the permission',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The last update date of the permission',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
