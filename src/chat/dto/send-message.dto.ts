import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  chatId: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
