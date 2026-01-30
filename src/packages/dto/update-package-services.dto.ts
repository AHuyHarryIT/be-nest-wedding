import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class UpdatePackageServicesDto {
  @ApiProperty({
    description: 'Array of service IDs to associate with the package',
    example: ['service-uuid-1', 'service-uuid-2'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  serviceIds: string[];
}
