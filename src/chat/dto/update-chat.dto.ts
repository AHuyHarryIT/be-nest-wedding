import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class UpdateChatDto {
  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;
}
