import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class UpdatePackageServicesDto {
  @ApiProperty({
    description: 'Array of service IDs to associate with the package',
    example: ['service-uuid-1', 'service-uuid-2'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  serviceIds: string[];
}
