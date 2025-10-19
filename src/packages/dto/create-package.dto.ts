import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Prisma } from 'generated/prisma';

export class CreatePackageDto implements Prisma.PackageCreateInput {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug: string | null = null;

  @IsOptional()
  @IsString()
  description: string | null = null;

  @IsOptional()
  @IsNumber()
  price: number = 0;

  @IsOptional()
  @IsBoolean()
  isActive: boolean = false;
}
