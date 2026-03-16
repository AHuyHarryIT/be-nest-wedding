import { IsUUID, IsOptional } from 'class-validator';

export class CreateChatDto {
  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;
}
