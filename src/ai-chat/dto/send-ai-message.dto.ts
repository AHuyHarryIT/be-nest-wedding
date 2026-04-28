import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SendAiMessageDto {
  @IsUUID()
  threadId: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
