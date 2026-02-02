import { IsEmail, IsPhoneNumber, IsString, IsUUID } from 'class-validator';

export class ViewSelectionDto {
  @IsUUID('4')
  id: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsPhoneNumber('VN')
  phoneNumber: string;
}
