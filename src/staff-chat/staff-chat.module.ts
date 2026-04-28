import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { AuthModule } from '@/auth/auth.module';
import { StaffChatController } from './staff-chat.controller';
import { StaffChatService } from './staff-chat.service';
import { StaffChatGateway } from './staff-chat.gateway';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [StaffChatController],
  providers: [StaffChatService, StaffChatGateway],
  exports: [StaffChatService, StaffChatGateway],
})
export class StaffChatModule {}
