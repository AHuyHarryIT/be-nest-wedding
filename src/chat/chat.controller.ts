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
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { CreateChatDto, SendMessageDto, UpdateChatDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ChatEntity, MessageEntity } from './entities';

interface AuthenticatedRequest {
  user?: {
    id?: string;
    userId?: string;
    userType?: 'customer' | 'staff';
  };
}

interface RequestUser {
  id?: string;
  userId?: string;
  userType?: 'customer' | 'staff';
}

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatGateway: ChatGateway,
  ) {}

  private getUser(req: unknown): RequestUser {
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

  private ensureCustomerOwnsChatCreate(req: unknown, customerId: string): void {
    const user = this.getUser(req);

    if (user.userType === 'customer') {
      const requestCustomerId = user.id ?? user.userId;
      if (!requestCustomerId || requestCustomerId !== customerId) {
        throw new ForbiddenException('Customers can only create chats for their own account');
      }
    }
  }

  private async enforceStaffReadPermission(req: unknown): Promise<void> {
    const user = this.getUser(req);

    if (user.userType === 'staff') {
      const userId = user.id ?? user.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      await this.chatService.ensureStaffReadPermission(userId);
    }
  }

  // Chat endpoints
  @Post()
  async createChat(
    @Body() createChatDto: CreateChatDto,
    @Request() req: unknown,
  ): Promise<ChatEntity> {
    this.ensureCustomerOwnsChatCreate(req, createChatDto.customerId);
    return this.chatService.createChat(createChatDto);
  }

  @Get()
  async getChats(
    @Request() req: unknown,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ChatEntity[]> {
    const user = this.getUser(req);
    const userId = this.getUserId(req);
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 20;

    if (user.userType === 'staff') {
      await this.enforceStaffReadPermission(req);
      return this.chatService.getChatsByStaff(userId, skipNum, takeNum);
    }

    return this.chatService.getChatsByCustomer(userId, skipNum, takeNum);
  }

  @Get('staff')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('chat.read')
  async getChatsByStaff(
    @Request() req: unknown,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ChatEntity[]> {
    await this.enforceStaffReadPermission(req);

    const staffId = this.getUserId(req);
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 20;

    return this.chatService.getChatsByStaff(staffId, skipNum, takeNum);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any): Promise<{ count: number }> {
    const userId = this.getUserId(req);
    const count = await this.chatService.getUnreadMessageCount(userId);
    return { count };
  }

  @Get(':chatId')
  async getChat(
    @Param('chatId') chatId: string,
    @Request() req: unknown,
  ): Promise<ChatEntity> {
    const userId = this.getUserId(req);
    return this.chatService.getChatForUser(chatId, userId);
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
    @Request() req: unknown,
  ): Promise<MessageEntity[]> {
    const userId = this.getUserId(req);
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 50;

    await this.chatService.getChatForUser(chatId, userId);

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
