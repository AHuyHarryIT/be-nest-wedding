import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignRolesToUserDto {
  @ApiProperty({
    description: 'Array of role IDs to assign to user',
    example: ['uuid-1', 'uuid-2'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds: string[];
}
