import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { IsPasswordMatch } from '@/auth/validators/password-match.validator';

export class ResetUserPasswordDto {
  @ApiProperty({
    description: 'New password (minimum 6 characters)',
    example: 'NewPassword123',
    minLength: 6,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  @MaxLength(255)
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'NewPassword123',
  })
  @IsString()
  @IsNotEmpty()
  @IsPasswordMatch('newPassword', {
    message: 'Confirm password does not match new password',
  })
  confirmPassword: string;
}
