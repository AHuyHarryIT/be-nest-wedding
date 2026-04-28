import { IsOptional, IsUUID } from 'class-validator';

export class CreateStaffChatDto {
  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;
}
