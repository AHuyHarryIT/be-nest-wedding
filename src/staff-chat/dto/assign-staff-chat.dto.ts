import { IsString } from 'class-validator';

export class AssignStaffChatDto {
  @IsString()
  staffId!: string;
}
