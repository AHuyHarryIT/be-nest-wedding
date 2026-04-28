import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from '@/database/database.service';
import type { CreateStaffChatDto, SendStaffMessageDto } from './dto';
import type { StaffChatEntity, StaffMessageEntity } from './entities';

const STAFF_ROLE_NAMES = ['super-admin', 'admin', 'manager', 'staff'];

type ActiveParticipant =
  | { userType: 'customer'; customerId: string }
  | { userType: 'staff'; staffId: string };

@Injectable()
export class StaffChatService {
  constructor(private readonly prisma: DatabaseService) {}

  private canonicalThreadKey(
    customerId: string,
    bookingId?: string | null,
  ): string {
    if (bookingId) {
      return `staff-booking:${customerId}:${bookingId}`;
    }

    return `staff-general:${customerId}`;
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

    const staff = await this.prisma.staff.findUnique({ where: { id: userId } });
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

  private mapChat(chat: {
    id: string;
    customerId: string;
    staffId: string | null;
    bookingId: string | null;
    canonicalThreadKey: string;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
    customer?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    };
  }): StaffChatEntity {
    return {
      id: chat.id,
      customerId: chat.customerId,
      staffId: chat.staffId,
      bookingId: chat.bookingId,
      canonicalThreadKey: chat.canonicalThreadKey,
      isArchived: chat.isArchived,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      customer: chat.customer
        ? {
            id: chat.customer.id,
            firstName: chat.customer.firstName,
            lastName: chat.customer.lastName,
            email: chat.customer.email,
          }
        : undefined,
    };
  }

  private mapMessage(message: {
    id: string;
    staffChatId: string;
    senderType: 'CUSTOMER' | 'STAFF';
    senderCustomerId: string | null;
    senderStaffId: string | null;
    content: string;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): StaffMessageEntity {
    return {
      id: message.id,
      chatId: message.staffChatId,
      senderType: message.senderType,
      senderCustomerId: message.senderCustomerId,
      senderStaffId: message.senderStaffId,
      content: message.content,
      isRead: message.isRead,
      readAt: message.readAt,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  async getChat(chatId: string): Promise<StaffChatEntity> {
    const chat = await this.prisma.staffChat.findUnique({
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

    if (!chat || chat.deletedAt) {
      throw new NotFoundException('Staff chat not found');
    }

    return this.mapChat(chat);
  }

  async getChatForUser(
    chatId: string,
    userId: string,
  ): Promise<StaffChatEntity> {
    const chat = await this.getChat(chatId);

    if (chat.customerId === userId) {
      return chat;
    }

    const isStaff = await this.isStaffUser(userId);
    if (!isStaff) {
      throw new ForbiddenException('You do not have access to this chat');
    }

    await this.assertStaffCanRead(userId);
    return chat;
  }

  async createChat(payload: CreateStaffChatDto): Promise<StaffChatEntity> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (payload.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: payload.bookingId },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      if (booking.customerId !== payload.customerId) {
        throw new BadRequestException(
          'Booking does not belong to the customer',
        );
      }
    }

    const canonicalKey = this.canonicalThreadKey(
      payload.customerId,
      payload.bookingId,
    );

    const existing = await this.prisma.staffChat.findUnique({
      where: { canonicalThreadKey: canonicalKey },
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
    if (existing && !existing.deletedAt) {
      return this.mapChat(existing);
    }

    const defaultStaffId = await this.resolveDefaultStaffId();

    const created = await this.prisma.staffChat.create({
      data: {
        customerId: payload.customerId,
        staffId: defaultStaffId,
        bookingId: payload.bookingId ?? null,
        canonicalThreadKey: canonicalKey,
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
    });

    return this.mapChat(created);
  }

  async getChatsByCustomer(
    customerId: string,
    skip = 0,
    take = 20,
  ): Promise<StaffChatEntity[]> {
    const chats = await this.prisma.staffChat.findMany({
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
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    });

    return chats.map((chat) => this.mapChat(chat));
  }

  async getChatsByStaff(
    staffId: string,
    skip = 0,
    take = 20,
  ): Promise<StaffChatEntity[]> {
    await this.assertStaffCanRead(staffId);

    const chats = await this.prisma.staffChat.findMany({
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
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    });

    return chats.map((chat) => this.mapChat(chat));
  }

  async sendMessage(
    payload: SendStaffMessageDto,
    senderId: string,
  ): Promise<StaffMessageEntity> {
    const chat = await this.getChatForUser(payload.chatId, senderId);
    const participant = await this.resolveActiveParticipant(senderId);

    if (participant.userType === 'staff') {
      await this.assertStaffCanReply(senderId);
    }

    const message = await this.prisma.staffMessage.create({
      data: {
        staffChatId: chat.id,
        senderType: participant.userType === 'customer' ? 'CUSTOMER' : 'STAFF',
        senderCustomerId:
          participant.userType === 'customer' ? participant.customerId : null,
        senderStaffId:
          participant.userType === 'staff' ? participant.staffId : null,
        content: payload.content,
      },
    });

    await this.prisma.staffChat.update({
      where: { id: chat.id },
      data: { lastMessageAt: new Date() },
    });

    return this.mapMessage(message);
  }

  async getMessages(
    chatId: string,
    userId: string,
    skip = 0,
    take = 50,
  ): Promise<StaffMessageEntity[]> {
    await this.getChatForUser(chatId, userId);

    const newest = await this.prisma.staffMessage.findMany({
      where: { staffChatId: chatId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return newest.reverse().map((entry) => this.mapMessage(entry));
  }

  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    await this.getChatForUser(chatId, userId);

    const isStaff = await this.isStaffUser(userId);

    await this.prisma.staffMessage.updateMany({
      where: {
        staffChatId: chatId,
        isRead: false,
        ...(isStaff
          ? {
              OR: [{ senderStaffId: null }, { senderStaffId: { not: userId } }],
            }
          : {
              OR: [
                { senderCustomerId: null },
                { senderCustomerId: { not: userId } },
              ],
            }),
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
