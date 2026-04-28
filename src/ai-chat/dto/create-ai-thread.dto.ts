import { IsOptional, IsUUID } from 'class-validator';

export class CreateAiThreadDto {
  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;
}
