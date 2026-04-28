import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class ApiChatDto {
  @IsOptional()
  @IsUUID()
  chatId?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsString()
  @MinLength(1)
  content: string;
}
