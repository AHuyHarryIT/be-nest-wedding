import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { CreateChatDto, SendMessageDto, UpdateChatDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatEntity, MessageEntity } from './entities';

interface AuthenticatedRequest {
  user: { id: string };
}

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatGateway: ChatGateway,
  ) {}

  private getUserId(req: any): string {
    return (req as AuthenticatedRequest).user.id;
  }

  // Chat endpoints
  @Post()
  async createChat(@Body() createChatDto: CreateChatDto): Promise<ChatEntity> {
    return this.chatService.createChat(createChatDto);
  }

  @Get()
  async getChats(
    @Request() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ChatEntity[]> {
    const userId = this.getUserId(req);
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 20;

    // Check if user is staff or customer based on roles
    // For now, return chats for the user as customer
    return this.chatService.getChatsByCustomer(userId, skipNum, takeNum);
  }

  @Get('staff')
  async getChatsByStaff(
    @Request() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ChatEntity[]> {
    const staffId = this.getUserId(req);
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 20;

    await this.chatService.ensureStaffUser(staffId);
    return this.chatService.getChatsByStaff(staffId, skipNum, takeNum);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any): Promise<{ count: number }> {
    const userId = this.getUserId(req);
    const count = await this.chatService.getUnreadMessageCount(userId);
    return { count };
  }

  @Get(':chatId')
  async getChat(@Param('chatId') chatId: string): Promise<ChatEntity> {
    return this.chatService.getChat(chatId);
  }

  @Put(':chatId')
  async updateChat(
    @Param('chatId') chatId: string,
    @Body() updateChatDto: UpdateChatDto,
  ): Promise<ChatEntity> {
    return this.chatService.updateChat(chatId, updateChatDto);
  }

  @Put(':chatId/archive')
  async archiveChat(@Param('chatId') chatId: string): Promise<ChatEntity> {
    return this.chatService.archiveChat(chatId);
  }

  @Delete(':chatId')
  async deleteChat(@Param('chatId') chatId: string): Promise<void> {
    return this.chatService.deleteChat(chatId);
  }

  // Message endpoints
  @Post(':chatId/messages')
  async sendMessage(
    @Param('chatId') chatId: string,
    @Body() body: { content: string },
    @Request() req: any,
  ): Promise<MessageEntity> {
    const senderId = this.getUserId(req);
    const sendMessageDto: SendMessageDto = {
      chatId,
      content: body.content,
    };
    const message = await this.chatService.sendMessage(
      sendMessageDto,
      senderId,
    );

    // Emit real-time message event via Socket.IO
    const chatData = await this.chatService.getChat(chatId);
    void this.chatGateway.server.to(`chat:${chatId}`).emit('message_received', {
      id: message.id,
      chatId: message.chatId,
      senderId: message.senderId,
      content: message.content,
      isRead: message.isRead,
      createdAt: message.createdAt,
    });

    // Also emit notification to the other participant
    const otherUserId =
      chatData.customerId === senderId ? chatData.staffId : chatData.customerId;
    if (otherUserId) {
      void this.chatGateway.server
        .to(`user:${otherUserId}`)
        .emit('new_message_notification', {
          chatId: chatId,
          messageCount: 1,
        });
    }

    return message;
  }

  @Get(':chatId/messages')
  async getMessages(
    @Param('chatId') chatId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<MessageEntity[]> {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 50;
    return this.chatService.getMessages(chatId, skipNum, takeNum);
  }

  @Get(':chatId/messages/unread')
  async getUnreadMessages(
    @Param('chatId') chatId: string,
    @Request() req: any,
  ): Promise<MessageEntity[]> {
    const userId = this.getUserId(req);
    return this.chatService.getUnreadMessages(chatId, userId);
  }

  @Put(':chatId/messages/read')
  async markMessagesAsRead(
    @Param('chatId') chatId: string,
    @Request() req: any,
  ): Promise<{ success: boolean }> {
    const userId = this.getUserId(req);
    await this.chatService.markMessagesAsRead(chatId, userId);
    return { success: true };
  }

  @Delete('messages/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Request() req: any,
  ): Promise<{ success: boolean }> {
    const userId = this.getUserId(req);
    await this.chatService.deleteMessage(messageId, userId);
    return { success: true };
  }
}
