import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  IsOptional,
  IsArray,
  IsUUID,
  Matches,
} from 'class-validator';
import { Prisma } from 'generated/prisma';

export class CreateUserDto implements Partial<Prisma.UserCreateInput> {
  @ApiProperty({
    description: 'User phone number',
    example: '0123456789',
    pattern: '^[0-9]{10,11}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10,11}$/, {
    message: 'Phone number must be 10-11 digits',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

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
    description: 'Array of role IDs to assign to this user',
    example: ['uuid-1', 'uuid-2'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  roleIds?: string[];
}
