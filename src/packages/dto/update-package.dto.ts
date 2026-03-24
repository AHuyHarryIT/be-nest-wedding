import { PartialType } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreatePackageDto } from './create-package.dto';

export class UpdatePackageDto extends PartialType(CreatePackageDto) {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }
    return value;
  })
  @IsArray()
  @IsUUID('4', { each: true })
  galleryOrder?: string[];
}
