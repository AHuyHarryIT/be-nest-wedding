import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class RemoveFilesFromAlbumDto {
  @ApiProperty({
    description: 'Array of file IDs to remove from album',
    example: ['file-uuid-1', 'file-uuid-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  fileIds: string[];
}
