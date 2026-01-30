import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class AssignPermissionsDto {
  @ApiProperty({
    description: 'Array of permission IDs to assign to the role',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    type: [String],
  })
  @IsArray({ message: 'Permission IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one permission ID is required' })
  @IsUUID('4', {
    each: true,
    message: 'Each permission ID must be a valid UUID',
  })
  permissionIds: string[];
}

export class RevokePermissionsDto {
  @ApiProperty({
    description: 'Array of permission IDs to revoke from the role',
    example: ['uuid-1', 'uuid-2'],
    type: [String],
  })
  @IsArray({ message: 'Permission IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one permission ID is required' })
  @IsUUID('4', {
    each: true,
    message: 'Each permission ID must be a valid UUID',
  })
  permissionIds: string[];
}
