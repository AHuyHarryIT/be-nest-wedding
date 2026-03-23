import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateChatDto, SendMessageDto, UpdateChatDto } from './dto';
import { ChatEntity, MessageEntity } from './entities';

@Injectable()
export class ChatService {
  constructor(private prisma: DatabaseService) {}

  private async isStaffUser(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return false;
    }

    return user.roles?.some((ur) =>
      ['super-admin', 'admin', 'manager', 'staff'].includes(ur.role.name),
    );
  }

  async ensureStaffUser(userId: string): Promise<void> {
    const isStaff = await this.isStaffUser(userId);
    if (!isStaff) {
      throw new ForbiddenException('Staff role is required for this endpoint');
    }
  }

  // Chat operations
  async createChat(createChatDto: CreateChatDto): Promise<ChatEntity> {
    const { customerId, bookingId } = createChatDto;
    let { staffId } = createChatDto;

    // Verify customer exists
    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // If staffId not provided, auto-assign the first admin/staff user
    if (!staffId) {
      // Try to find any admin user first
      const adminUser = await this.prisma.user.findFirst({
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
                  in: ['super-admin', 'admin', 'manager', 'staff'],
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (adminUser) {
        staffId = adminUser.id;
      }
    }

    // If staffId provided, verify staff exists
    if (staffId) {
      const staff = await this.prisma.user.findUnique({
        where: { id: staffId },
      });
      if (!staff) {
        throw new NotFoundException('Staff not found');
      }
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

    // Check if chat already exists between customer and staff
    if (staffId) {
      const existingChat = await this.prisma.chat.findFirst({
        where: {
          customerId,
          staffId,
        },
      });
      if (existingChat) {
        return existingChat as ChatEntity;
      }
    }

    const chat = await this.prisma.chat.create({
      data: {
        customerId,
        staffId,
        bookingId,
        chatType: 'DIRECT',
      },
    });

    return chat as ChatEntity;
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
    const chats = await this.prisma.chat.findMany({
      where: {
        customerId,
        deletedAt: null,
      },
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
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take,
    });

    return chats as ChatEntity[];
  }

  async getChatsByStaff(
    staffId: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<ChatEntity[]> {
    await this.ensureStaffUser(staffId);

    const chats = await this.prisma.chat.findMany({
      where: {
        deletedAt: null,
      },
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
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take,
    });

    return chats as ChatEntity[];
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

    // Verify chat exists
    const chatData = await this.getChat(chatId);

    // Verify sender is an active user
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
    if (!sender || !sender.isActive) {
      throw new BadRequestException('Sender is not active');
    }

    // Allow if user is the customer OR has a staff role
    const isStaff = sender.roles?.some((ur) => {
      return ['super-admin', 'admin', 'manager', 'staff'].includes(
        ur.role.name,
      );
    });

    if (chatData.customerId !== senderId && !isStaff) {
      throw new BadRequestException('User is not part of this chat');
    }

    const message = await this.prisma.message.create({
      data: {
        chatId,
        senderId,
        content,
      },
    });

    // Update chat's lastMessageAt
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { lastMessageAt: new Date() },
    });

    return message as MessageEntity;
  }

  async getMessages(
    chatId: string,
    skip: number = 0,
    take: number = 50,
  ): Promise<MessageEntity[]> {
    await this.getChat(chatId);

    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    });

    return messages as MessageEntity[];
  }

  async getUnreadMessages(
    chatId: string,
    userId: string,
  ): Promise<MessageEntity[]> {
    const chat = await this.getChat(chatId);

    // Verify user is part of the chat
    if (chat.customerId !== userId && chat.staffId !== userId) {
      throw new BadRequestException('User is not part of this chat');
    }

    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        isRead: false,
        senderId: { not: userId }, // Don't include messages sent by the user
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages as MessageEntity[];
  }

  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    const chat = await this.getChat(chatId);

    // Verify chat exists and user is either customer or can access as staff
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new BadRequestException('User is not active or does not exist');
    }

    // Allow if user is the customer OR has a staff role
    const isStaff = user.roles?.some((ur) => {
      return ['super-admin', 'admin', 'manager', 'staff'].includes(
        ur.role.name,
      );
    });

    if (chat.customerId !== userId && !isStaff) {
      throw new BadRequestException('User is not part of this chat');
    }

    await this.prisma.message.updateMany({
      where: {
        chatId,
        isRead: false,
        senderId: { not: userId }, // Only mark others' messages as read
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
    if (message.senderId !== userId) {
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
        senderId: { not: userId },
      },
    });

    return count;
  }
}
