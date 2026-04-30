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
import { StaffChatService } from './staff-chat.service';
import { AssignStaffChatDto, CreateStaffChatDto } from './dto';
import type { SendStaffMessageDto } from './dto/send-staff-message.dto';
import type { StaffChatEntity, StaffMessageEntity } from './entities';

interface AuthenticatedRequest {
  user?: {
    id?: string;
    userId?: string;
    userType?: 'customer' | 'staff';
  };
}

@Controller('staff-chats')
@UseGuards(JwtAuthGuard)
export class StaffChatController {
  constructor(private readonly staffChatService: StaffChatService) {}

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

  @Post()
  async createChat(
    @Body() payload: CreateStaffChatDto,
    @Request() req: unknown,
  ): Promise<StaffChatEntity> {
    const user = this.getUser(req);
    const userId = this.getUserId(req);

    if (user.userType !== 'customer') {
      throw new ForbiddenException('Only customers can create staff chats');
    }

    if (payload.customerId !== userId) {
      throw new ForbiddenException(
        'Customers can only create chats for their own account',
      );
    }

    return this.staffChatService.createChat(payload);
  }

  @Get()
  async getChats(
    @Request() req: unknown,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<StaffChatEntity[]> {
    const user = this.getUser(req);
    const userId = this.getUserId(req);

    const skipNum = skip ? Number.parseInt(skip, 10) : 0;
    const takeNum = take ? Number.parseInt(take, 10) : 20;

    if (user.userType === 'staff') {
      return this.staffChatService.getChatsByStaff(userId, skipNum, takeNum);
    }

    return this.staffChatService.getChatsByCustomer(userId, skipNum, takeNum);
  }

  @Get(':chatId')
  async getChat(
    @Param('chatId') chatId: string,
    @Request() req: unknown,
  ): Promise<StaffChatEntity> {
    const userId = this.getUserId(req);
    return this.staffChatService.getChatForUser(chatId, userId);
  }

  @Put(':chatId/assign')
  async assignChat(
    @Param('chatId') chatId: string,
    @Body() payload: AssignStaffChatDto,
    @Request() req: unknown,
  ): Promise<StaffChatEntity> {
    const user = this.getUser(req);
    if (user.userType !== 'staff') {
      throw new ForbiddenException('Only staff can assign conversations');
    }

    if (!payload.staffId?.trim()) {
      throw new BadRequestException('staffId is required');
    }

    const actorStaffId = this.getUserId(req);
    return this.staffChatService.assignChatToStaff(
      chatId,
      actorStaffId,
      payload.staffId.trim(),
    );
  }

  @Post(':chatId/messages')
  async sendMessage(
    @Param('chatId') chatId: string,
    @Body() body: { content: string },
    @Request() req: unknown,
  ): Promise<StaffMessageEntity> {
    if (typeof body?.content !== 'string' || !body.content.trim()) {
      throw new BadRequestException('Content is required');
    }

    const senderId = this.getUserId(req);
    const payload: SendStaffMessageDto = {
      chatId,
      content: body.content,
    };

    return this.staffChatService.sendMessage(payload, senderId);
  }

  @Get(':chatId/messages')
  async getMessages(
    @Param('chatId') chatId: string,
    @Request() req: unknown,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<StaffMessageEntity[]> {
    const userId = this.getUserId(req);
    const skipNum = skip ? Number.parseInt(skip, 10) : 0;
    const takeNum = take ? Number.parseInt(take, 10) : 50;

    return this.staffChatService.getMessages(chatId, userId, skipNum, takeNum);
  }

  @Put(':chatId/messages/read')
  async markMessagesAsRead(
    @Param('chatId') chatId: string,
    @Request() req: unknown,
  ): Promise<{ success: boolean }> {
    const userId = this.getUserId(req);
    await this.staffChatService.markMessagesAsRead(chatId, userId);
    return { success: true };
  }
}
