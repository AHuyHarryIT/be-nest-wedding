import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class RemoveFilesFromAlbumDto {
  @ApiProperty({
    description: 'Array of file IDs to remove from album',
    example: ['file-uuid-1', 'file-uuid-2'],
    type: [String],
  })
  @IsArray({ message: 'File IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one file ID is required' })
  @IsUUID('4', { each: true, message: 'Each file ID must be a valid UUID' })
  fileIds: string[];
}
