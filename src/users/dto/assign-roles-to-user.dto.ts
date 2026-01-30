import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class AssignRolesToUserDto {
  @ApiProperty({
    description: 'Array of role IDs to assign to user',
    example: ['uuid-1', 'uuid-2'],
    type: [String],
  })
  @IsArray({ message: 'Role IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one role ID is required' })
  @IsUUID('4', { each: true, message: 'Each role ID must be a valid UUID' })
  roleIds: string[];
}
