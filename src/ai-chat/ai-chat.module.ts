import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { AuthModule } from '@/auth/auth.module';
import { AiModule } from '@/ai/ai.module';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { AiChatGateway } from './ai-chat.gateway';

@Module({
  imports: [DatabaseModule, AuthModule, AiModule],
  controllers: [AiChatController],
  providers: [AiChatService, AiChatGateway],
  exports: [AiChatService, AiChatGateway],
})
export class AiChatModule {}
