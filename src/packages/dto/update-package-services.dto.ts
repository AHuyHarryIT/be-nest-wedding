import { IsArray, IsString } from 'class-validator';

export class UpdatePackageServicesDto {
  @IsArray()
  @IsString({ each: true })
  serviceIds: string[];
}
