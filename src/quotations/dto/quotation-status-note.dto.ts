import { IsOptional, IsString } from 'class-validator';

export class QuotationStatusNoteDto {
  @IsOptional()
  @IsString({ message: 'Note must be a string' })
  note?: string;
}
