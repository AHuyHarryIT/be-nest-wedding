import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AiChatService } from './ai-chat.service';
import type { AiMessageEntity, AiThreadEntity } from './entities';
import type { CreateAiThreadDto } from './dto/create-ai-thread.dto';
import type { SendAiMessageDto } from './dto/send-ai-message.dto';

interface AuthenticatedRequest {
  user?: {
    id?: string;
    userId?: string;
    userType?: 'customer' | 'staff';
  };
}

@Controller('ai-chats')
@UseGuards(JwtAuthGuard)
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  private getUser(req: unknown): NonNullable<AuthenticatedRequest['user']> {
    const user = (req as AuthenticatedRequest)?.user;
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return user;
  }

  private getUserId(req: unknown): string {
    const user = this.getUser(req);
    const resolvedUserId = user.id ?? user.userId;
    if (!resolvedUserId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return resolvedUserId;
  }

  private ensureCustomer(req: unknown): string {
    const user = this.getUser(req);
    if (user.userType !== 'customer') {
      throw new ForbiddenException('Only customers can use AI chat');
    }

    return this.getUserId(req);
  }

  @Post()
  async createThread(
    @Body() payload: CreateAiThreadDto,
    @Request() req: unknown,
  ): Promise<AiThreadEntity> {
    const customerId = this.ensureCustomer(req);
    if (payload.customerId !== customerId) {
      throw new ForbiddenException(
        'Customers can only create their own AI thread',
      );
    }

    return this.aiChatService.createThread(payload);
  }

  @Get()
  async getThreads(
    @Request() req: unknown,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<AiThreadEntity[]> {
    const customerId = this.ensureCustomer(req);
    const skipNum = skip ? Number.parseInt(skip, 10) : 0;
    const takeNum = take ? Number.parseInt(take, 10) : 20;

    return this.aiChatService.getThreadsByCustomer(
      customerId,
      skipNum,
      takeNum,
    );
  }

  @Get(':threadId')
  async getThread(
    @Param('threadId') threadId: string,
    @Request() req: unknown,
  ): Promise<AiThreadEntity> {
    const customerId = this.ensureCustomer(req);
    return this.aiChatService.getThreadForCustomer(threadId, customerId);
  }

  @Post(':threadId/messages')
  async sendMessage(
    @Param('threadId') threadId: string,
    @Body() body: { content: string },
    @Request() req: unknown,
  ): Promise<{
    customerMessage: AiMessageEntity;
    aiMessage: AiMessageEntity | null;
  }> {
    if (typeof body?.content !== 'string' || !body.content.trim()) {
      throw new BadRequestException('Content is required');
    }

    const customerId = this.ensureCustomer(req);
    const payload: SendAiMessageDto = {
      threadId,
      content: body.content,
    };

    const customerMessage = await this.aiChatService.sendMessage(
      payload,
      customerId,
    );
    const aiMessage = await this.aiChatService.maybeSendAiReply(
      threadId,
      body.content,
      customerMessage.senderType,
    );

    return {
      customerMessage,
      aiMessage,
    };
  }

  @Get(':threadId/messages')
  async getMessages(
    @Param('threadId') threadId: string,
    @Request() req: unknown,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<AiMessageEntity[]> {
    const customerId = this.ensureCustomer(req);
    const skipNum = skip ? Number.parseInt(skip, 10) : 0;
    const takeNum = take ? Number.parseInt(take, 10) : 50;

    return this.aiChatService.getMessages(
      threadId,
      customerId,
      skipNum,
      takeNum,
    );
  }

  @Put(':threadId/messages/read')
  async markMessagesAsRead(
    @Param('threadId') threadId: string,
    @Request() req: unknown,
  ): Promise<{ success: boolean }> {
    const customerId = this.ensureCustomer(req);
    await this.aiChatService.markMessagesAsRead(threadId, customerId);
    return { success: true };
  }
}
