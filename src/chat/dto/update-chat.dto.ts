import { IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class UpdateChatDto {
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
