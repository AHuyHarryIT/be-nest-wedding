import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';
import { Prisma } from 'generated/prisma';

export class UpdateUserDto implements Partial<Prisma.UserUpdateInput> {
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  firstName?: string | null;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  lastName?: string | null;

  @ApiPropertyOptional({
    description: 'User email address',
    example: 'john@example.com',
    nullable: true,
  })
  @IsEmail()
  @IsOptional()
  email?: string | null;

  @ApiPropertyOptional({
    description: 'User active status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
