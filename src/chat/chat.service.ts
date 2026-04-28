import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AiService } from '../ai/ai.service';
import {
  ApiChatDto,
  CreateChatDto,
  SendMessageDto,
  UpdateChatDto,
} from './dto';
import { ChatEntity, MessageEntity } from './entities';
import { Prisma } from 'generated/prisma';

const STAFF_ROLE_NAMES = ['super-admin', 'admin', 'manager', 'staff'];

const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const parseBoolean = (
  value: string | undefined,
  fallback: boolean,
): boolean => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return fallback;
};

const getErrorType = (error: unknown): string => {
  if (error instanceof Error) {
    return error.name;
  }

  return typeof error;
};

type ChatWithUnreadCount = ChatEntity & {
  unreadCount: number;
};

type ChatListArgs = {
  where: Prisma.ChatWhereInput;
  skip: number;
  take: number;
  currentUserId: string;
};

type ActiveParticipant =
  | { userType: 'customer'; customerId: string }
  | { userType: 'staff'; staffId: string };

export type ApiChatReplyResult = {
  chat: ChatEntity;
  customerMessage: MessageEntity;
  aiMessage: MessageEntity | null;
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly maxContextMessages = parsePositiveInt(
    process.env.CHAT_AI_MAX_CONTEXT_MESSAGES,
    10,
  );
  private readonly maxInputChars = parsePositiveInt(
    process.env.CHAT_AI_MAX_INPUT_CHARS,
    6000,
  );

  private isChatAiEnabled(): boolean {
    return parseBoolean(process.env.CHAT_AI_ENABLED, true);
  }

  private trimText(content: string, maxChars: number): string {
    return content.trim().slice(0, maxChars);
  }

  constructor(
    private prisma: DatabaseService,
    private aiService: AiService,
  ) {}

  private canonicalThreadKey(
    customerId: string,
    bookingId?: string | null,
  ): string {
    if (bookingId) {
      return `booking:${customerId}:${bookingId}`;
    }

    return `general:${customerId}`;
  }

  private async resolveActiveParticipant(
    userId: string,
  ): Promise<ActiveParticipant> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: userId },
    });

    if (customer?.isActive) {
      return { userType: 'customer', customerId: userId };
    }

    const staff = await this.prisma.staff.findUnique({
      where: { id: userId },
    });

    if (staff?.isActive) {
      return { userType: 'staff', staffId: userId };
    }

    throw new BadRequestException('User is not active or does not exist');
  }

  private async resolveDefaultStaffId(): Promise<string | null> {
    const staff = await this.prisma.staff.findFirst({
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
      where: {
        isActive: true,
        roles: {
          some: {
            role: {
              name: {
                in: STAFF_ROLE_NAMES,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return staff?.id ?? null;
  }

  private async assertChatAccess(
    chatId: string,
    userId: string,
  ): Promise<ChatEntity> {
    const chat = await this.getChat(chatId);

    if (chat.customerId === userId) {
      return chat;
    }

    await this.ensureStaffUser(userId);
    return chat;
  }

  private async getChatsWithThreadUnread({
    where,
    skip,
    take,
    currentUserId,
  }: ChatListArgs): Promise<ChatEntity[]> {
    const chats = await this.prisma.chat.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        messages: {
          where: {
            isRead: false,
            AND: [
              {
                OR: [
                  { senderCustomerId: null },
                  { senderCustomerId: { not: currentUserId } },
                ],
              },
              {
                OR: [
                  { senderStaffId: null },
                  { senderStaffId: { not: currentUserId } },
                ],
              },
            ],
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    });

    return chats.map((chat) => {
      const typed = chat as unknown as ChatWithUnreadCount & {
        messages: Array<{ id: string }>;
      };

      const { messages, ...chatWithoutMessages } =
        typed as ChatWithUnreadCount & {
          messages: Array<{ id: string }>;
        };

      return {
        ...chatWithoutMessages,
        unreadCount: messages.length,
      } as ChatEntity;
    });
  }

  private async ensureStaffPermission(
    staffId: string,
    permissionKey: 'chat.read' | 'chat.reply',
  ): Promise<void> {
    const isStaff = await this.isStaffUser(staffId);
    if (!isStaff) {
      throw new ForbiddenException('Staff role is required for this endpoint');
    }

    const userRoles = await this.prisma.staffRole.findMany({
      where: {
        staffId,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const permissionKeys = new Set<string>();
    userRoles.forEach((staffRole) => {
      staffRole.role.permissions.forEach((rolePermission) => {
        permissionKeys.add(rolePermission.permission.key);
      });
    });

    if (!permissionKeys.has(permissionKey)) {
      throw new ForbiddenException({
        message: 'Missing required permissions',
        details: {
          requiredPermissions: [permissionKey],
          missingPermissions: [permissionKey],
        },
      });
    }
  }

  private async assertStaffCanRead(staffId: string): Promise<void> {
    await this.ensureStaffPermission(staffId, 'chat.read');
  }

  private async assertStaffCanReply(staffId: string): Promise<void> {
    await this.ensureStaffPermission(staffId, 'chat.reply');
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private async isStaffUser(userId: string): Promise<boolean> {
    const user = await this.prisma.staff.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isActive: true,
      },
    });

    return Boolean(user?.isActive);
  }

  async ensureStaffUser(userId: string): Promise<void> {
    const isStaff = await this.isStaffUser(userId);
    if (!isStaff) {
      throw new ForbiddenException('Staff role is required for this endpoint');
    }
  }

  async ensureStaffReadPermission(staffId: string): Promise<void> {
    await this.assertStaffCanRead(staffId);
  }

  async ensureStaffReplyPermission(staffId: string): Promise<void> {
    await this.assertStaffCanReply(staffId);
  }

  async getChatForUser(chatId: string, userId: string): Promise<ChatEntity> {
    const chat = await this.assertChatAccess(chatId, userId);

    if (await this.isStaffUser(userId)) {
      await this.assertStaffCanRead(userId);
    }

    return chat;
  }

  // Chat operations
  async createChat(createChatDto: CreateChatDto): Promise<ChatEntity> {
    const { customerId, bookingId } = createChatDto;

    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // If bookingId provided, verify booking exists and belongs to customer
    if (bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      if (booking.customerId !== customerId) {
        throw new BadRequestException(
          'Booking does not belong to the customer',
        );
      }
    }

    const canonicalKey = this.canonicalThreadKey(customerId, bookingId);

    const existingChat = await this.prisma.chat.findUnique({
      where: { canonicalThreadKey: canonicalKey },
    });

    if (existingChat) {
      return existingChat as ChatEntity;
    }

    const defaultStaffId = await this.resolveDefaultStaffId();

    try {
      const chat = await this.prisma.chat.create({
        data: {
          customerId,
          staffId: defaultStaffId,
          bookingId: bookingId ?? null,
          canonicalThreadKey: canonicalKey,
          chatType: 'DIRECT',
        },
      });

      return chat as ChatEntity;
    } catch (error) {
      if (!this.isUniqueViolation(error)) {
        throw error;
      }

      const conflicted = await this.prisma.chat.findUnique({
        where: { canonicalThreadKey: canonicalKey },
      });

      if (!conflicted) {
        throw error;
      }

      return conflicted as ChatEntity;
    }
  }

  async getChat(chatId: string): Promise<ChatEntity> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    return chat as ChatEntity;
  }

  async getChatsByCustomer(
    customerId: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<ChatEntity[]> {
    return this.getChatsWithThreadUnread({
      where: {
        customerId,
        deletedAt: null,
      },
      skip,
      take,
      currentUserId: customerId,
    });
  }

  async getChatsByStaff(
    staffId: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<ChatEntity[]> {
    await this.assertStaffCanRead(staffId);

    return this.getChatsWithThreadUnread({
      where: {
        deletedAt: null,
      },
      skip,
      take,
      currentUserId: staffId,
    });
  }

  async updateChat(
    chatId: string,
    updateChatDto: UpdateChatDto,
  ): Promise<ChatEntity> {
    await this.getChat(chatId);

    const updated = await this.prisma.chat.update({
      where: { id: chatId },
      data: updateChatDto,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updated as ChatEntity;
  }

  async archiveChat(chatId: string): Promise<ChatEntity> {
    await this.getChat(chatId);

    const updated = await this.prisma.chat.update({
      where: { id: chatId },
      data: { isArchived: true },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updated as ChatEntity;
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.getChat(chatId);

    await this.prisma.chat.update({
      where: { id: chatId },
      data: { deletedAt: new Date() },
    });
  }

  // Message operations
  async sendMessage(
    sendMessageDto: SendMessageDto,
    senderId: string,
  ): Promise<MessageEntity> {
    const { chatId, content } = sendMessageDto;
    const chatData = await this.assertChatAccess(chatId, senderId);
    const participant = await this.resolveActiveParticipant(senderId);

    if (participant.userType === 'staff') {
      await this.assertStaffCanReply(senderId);
    }

    const message = await this.prisma.message.create({
      data: {
        chatId,
        senderType: participant.userType === 'customer' ? 'CUSTOMER' : 'STAFF',
        senderCustomerId:
          participant.userType === 'customer' ? participant.customerId : null,
        senderStaffId:
          participant.userType === 'staff' ? participant.staffId : null,
        content,
      },
    });

    await this.prisma.chat.update({
      where: { id: chatData.id },
      data: { lastMessageAt: new Date() },
    });

    return {
      ...(message as any),
      senderId: message.senderCustomerId ?? message.senderStaffId ?? undefined,
      senderType: message.senderType,
    } as MessageEntity;
  }

  async sendApiChatReplyForCustomer(
    customerId: string,
    payload: ApiChatDto,
  ): Promise<ApiChatReplyResult> {
    const content = payload.content?.trim();
    if (!content) {
      throw new BadRequestException('Content is required');
    }

    let chat: ChatEntity;
    if (payload.chatId) {
      chat = await this.getChatForUser(payload.chatId, customerId);
      if (chat.customerId !== customerId) {
        throw new ForbiddenException(
          'Customers can only message their own chats',
        );
      }
    } else {
      chat = await this.createChat({
        customerId,
        bookingId: payload.bookingId,
      });
    }

    const customerMessage = await this.sendMessage(
      {
        chatId: chat.id,
        content,
      },
      customerId,
    );

    this.maybeSendAiReply(chat.id, content, customerMessage.senderType).catch(
      () => null,
    );

    const refreshedChat = await this.getChat(chat.id);

    return {
      chat: refreshedChat,
      customerMessage,
      aiMessage: null,
    };
  }

  async maybeSendAiReply(
    chatId: string,
    latestCustomerMessage: string,
    senderType?: MessageEntity['senderType'],
  ): Promise<MessageEntity | null> {
    if (senderType && senderType !== 'CUSTOMER') {
      this.logger.log(
        JSON.stringify({
          event: 'chat_ai_reply_skipped',
          chatId,
          reason: 'sender_not_customer',
          senderType,
        }),
      );
      return null;
    }

    if (!this.isChatAiEnabled()) {
      this.logger.log(
        JSON.stringify({
          event: 'chat_ai_reply_skipped',
          chatId,
          reason: 'global_ai_disabled',
        }),
      );
      return null;
    }

    if (!this.aiService.isConfigured()) {
      this.logger.warn(
        JSON.stringify({
          event: 'chat_ai_reply_skipped',
          chatId,
          reason: 'missing_ai_provider_credentials',
        }),
      );
      return null;
    }

    try {
      const chat = await this.getChat(chatId);
      if (!chat.aiEnabled) {
        this.logger.log(
          JSON.stringify({
            event: 'chat_ai_reply_skipped',
            chatId,
            reason: 'chat_ai_disabled',
          }),
        );
        return null;
      }

      const recentMessages = await this.prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: 'desc' },
        take: this.maxContextMessages,
      });

      const customerName = [chat.customer?.firstName, chat.customer?.lastName]
        .filter((part) => Boolean(part && part.trim()))
        .join(' ')
        .trim();

      const aiReply = await this.aiService.generateChatReply({
        chatId,
        customerName: customerName || undefined,
        latestMessage: this.trimText(latestCustomerMessage, this.maxInputChars),
        recentMessages: recentMessages.reverse().map((entry) => ({
          senderType: entry.senderType,
          content: this.trimText(entry.content, this.maxInputChars),
        })),
      });

      const aiMessage = await this.prisma.message.create({
        data: {
          chatId,
          senderType: 'AI',
          content: aiReply,
        },
      });

      await this.prisma.chat.update({
        where: { id: chatId },
        data: { lastMessageAt: new Date() },
      });

      this.logger.log(
        JSON.stringify({
          event: 'chat_ai_reply_created',
          chatId,
          contextMessagesUsed: recentMessages.length,
        }),
      );

      return {
        ...(aiMessage as any),
        senderId: undefined,
        senderType: aiMessage.senderType,
      } as MessageEntity;
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'chat_ai_reply_failed',
          chatId,
          errorType: getErrorType(error),
        }),
      );
      return null;
    }
  }

  async getMessages(
    chatId: string,
    skip: number = 0,
    take: number = 50,
  ): Promise<MessageEntity[]> {
    await this.getChat(chatId);

    const newestMessages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    const messages = newestMessages.reverse();

    return messages.map((message) => ({
      ...(message as any),
      senderId: message.senderCustomerId ?? message.senderStaffId ?? undefined,
      senderType: message.senderType,
    })) as MessageEntity[];
  }

  async getUnreadMessages(
    chatId: string,
    userId: string,
  ): Promise<MessageEntity[]> {
    await this.assertChatAccess(chatId, userId);

    if (await this.isStaffUser(userId)) {
      await this.assertStaffCanRead(userId);
    }

    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        isRead: false,
        AND: [
          {
            OR: [
              { senderCustomerId: null },
              { senderCustomerId: { not: userId } },
            ],
          },
          {
            OR: [{ senderStaffId: null }, { senderStaffId: { not: userId } }],
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((message) => ({
      ...(message as any),
      senderId: message.senderCustomerId ?? message.senderStaffId ?? undefined,
      senderType: message.senderType,
    })) as MessageEntity[];
  }

  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    await this.assertChatAccess(chatId, userId);

    if (await this.isStaffUser(userId)) {
      await this.assertStaffCanRead(userId);
    }

    await this.prisma.message.updateMany({
      where: {
        chatId,
        isRead: false,
        AND: [
          {
            OR: [
              { senderCustomerId: null },
              { senderCustomerId: { not: userId } },
            ],
          },
          {
            OR: [{ senderStaffId: null }, { senderStaffId: { not: userId } }],
          },
        ],
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only message sender can delete
    const messageSenderId = message.senderCustomerId ?? message.senderStaffId;
    if (messageSenderId !== userId) {
      throw new BadRequestException('You can only delete your own messages');
    }

    await this.prisma.message.delete({
      where: { id: messageId },
    });
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const count = await this.prisma.message.count({
      where: {
        chat: {
          OR: [{ customerId: userId }, { staffId: userId }],
        },
        isRead: false,
        AND: [
          {
            OR: [
              { senderCustomerId: null },
              { senderCustomerId: { not: userId } },
            ],
          },
          {
            OR: [{ senderStaffId: null }, { senderStaffId: { not: userId } }],
          },
        ],
      },
    });

    return count;
  }
}
