import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SendStaffMessageDto {
  @IsUUID()
  chatId: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
