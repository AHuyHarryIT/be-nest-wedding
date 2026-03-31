import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateChatDto {
  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;
}
