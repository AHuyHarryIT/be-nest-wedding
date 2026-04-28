import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from '@/database/database.service';
import { AiService } from '@/ai/ai.service';
import type { CreateAiThreadDto, SendAiMessageDto } from './dto';
import type { AiMessageEntity, AiThreadEntity } from './entities';

type AiThreadMessageSender = 'CUSTOMER' | 'AI';

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

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);
  private readonly maxContextMessages = parsePositiveInt(
    process.env.CHAT_AI_MAX_CONTEXT_MESSAGES,
    10,
  );
  private readonly maxInputChars = parsePositiveInt(
    process.env.CHAT_AI_MAX_INPUT_CHARS,
    6000,
  );

  constructor(
    private readonly prisma: DatabaseService,
    private readonly aiService: AiService,
  ) {}

  private isChatAiEnabled(): boolean {
    return parseBoolean(process.env.CHAT_AI_ENABLED, true);
  }

  private trimText(content: string, maxChars: number): string {
    return content.trim().slice(0, maxChars);
  }

  private canonicalThreadKey(
    customerId: string,
    bookingId?: string | null,
  ): string {
    if (bookingId) {
      return `ai-booking:${customerId}:${bookingId}`;
    }

    return `ai-general:${customerId}`;
  }

  private mapThread(entry: {
    id: string;
    customerId: string;
    bookingId: string | null;
    canonicalThreadKey: string;
    createdAt: Date;
    updatedAt: Date;
  }): AiThreadEntity {
    return {
      id: entry.id,
      customerId: entry.customerId,
      bookingId: entry.bookingId,
      canonicalThreadKey: entry.canonicalThreadKey,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private mapMessage(entry: {
    id: string;
    aiThreadId: string;
    senderType: AiThreadMessageSender;
    senderCustomerId: string | null;
    content: string;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AiMessageEntity {
    return {
      id: entry.id,
      threadId: entry.aiThreadId,
      senderType: entry.senderType,
      senderCustomerId: entry.senderCustomerId,
      content: entry.content,
      isRead: entry.isRead,
      readAt: entry.readAt,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private async createFallbackReply(
    threadId: string,
  ): Promise<AiMessageEntity | null> {
    try {
      const aiMessage = await this.prisma.aiMessage.create({
        data: {
          aiThreadId: threadId,
          senderType: 'AI',
          content:
            'I’m sorry — I can’t reach the AI service right now. Please try again in a moment.',
        },
      });

      await this.prisma.aiThread.update({
        where: { id: threadId },
        data: { lastMessageAt: new Date() },
      });

      return this.mapMessage(aiMessage);
    } catch (fallbackError) {
      this.logger.warn(
        JSON.stringify({
          event: 'ai_thread_fallback_reply_failed',
          threadId,
          errorType: getErrorType(fallbackError),
        }),
      );
      return null;
    }
  }

  async getThread(threadId: string): Promise<AiThreadEntity> {
    const thread = await this.prisma.aiThread.findUnique({
      where: { id: threadId },
    });

    if (!thread || thread.deletedAt) {
      throw new NotFoundException('AI thread not found');
    }

    return this.mapThread(thread);
  }

  async getThreadForCustomer(
    threadId: string,
    customerId: string,
  ): Promise<AiThreadEntity> {
    const thread = await this.getThread(threadId);
    if (thread.customerId !== customerId) {
      throw new ForbiddenException(
        'Customers can only access their own AI threads',
      );
    }

    return thread;
  }

  async createThread(payload: CreateAiThreadDto): Promise<AiThreadEntity> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.customerId },
    });
    if (!customer || !customer.isActive) {
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

    const existing = await this.prisma.aiThread.findUnique({
      where: { canonicalThreadKey: canonicalKey },
    });
    if (existing && !existing.deletedAt) {
      return this.mapThread(existing);
    }

    const created = await this.prisma.aiThread.create({
      data: {
        customerId: payload.customerId,
        bookingId: payload.bookingId ?? null,
        canonicalThreadKey: canonicalKey,
      },
    });

    return this.mapThread(created);
  }

  async getThreadsByCustomer(
    customerId: string,
    skip = 0,
    take = 20,
  ): Promise<AiThreadEntity[]> {
    const threads = await this.prisma.aiThread.findMany({
      where: {
        customerId,
        deletedAt: null,
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    });

    return threads.map((entry) => this.mapThread(entry));
  }

  async sendMessage(
    payload: SendAiMessageDto,
    customerId: string,
  ): Promise<AiMessageEntity> {
    const thread = await this.getThreadForCustomer(
      payload.threadId,
      customerId,
    );

    const message = await this.prisma.aiMessage.create({
      data: {
        aiThreadId: thread.id,
        senderType: 'CUSTOMER',
        senderCustomerId: customerId,
        content: payload.content,
      },
    });

    await this.prisma.aiThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    });

    return this.mapMessage(message);
  }

  async maybeSendAiReply(
    threadId: string,
    latestCustomerMessage: string,
    senderType?: AiThreadMessageSender,
  ): Promise<AiMessageEntity | null> {
    if (senderType && senderType !== 'CUSTOMER') {
      this.logger.log(
        JSON.stringify({
          event: 'ai_thread_reply_skipped',
          threadId,
          reason: 'sender_not_customer',
          senderType,
        }),
      );
      return null;
    }

    if (!this.isChatAiEnabled()) {
      this.logger.log(
        JSON.stringify({
          event: 'ai_thread_reply_skipped',
          threadId,
          reason: 'global_ai_disabled',
        }),
      );
      return this.createFallbackReply(threadId);
    }

    if (!this.aiService.isConfigured()) {
      this.logger.warn(
        JSON.stringify({
          event: 'ai_thread_reply_skipped',
          threadId,
          reason: 'missing_ai_provider_credentials',
        }),
      );
      return this.createFallbackReply(threadId);
    }

    try {
      const thread = await this.prisma.aiThread.findUnique({
        where: { id: threadId },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!thread || thread.deletedAt) {
        return null;
      }

      const recentMessages = await this.prisma.aiMessage.findMany({
        where: { aiThreadId: threadId },
        orderBy: { createdAt: 'desc' },
        take: this.maxContextMessages,
      });

      const customerName = [
        thread.customer?.firstName,
        thread.customer?.lastName,
      ]
        .filter((part) => Boolean(part && part.trim()))
        .join(' ')
        .trim();

      const aiReply = await this.aiService.generateChatReply({
        chatId: threadId,
        customerName: customerName || undefined,
        latestMessage: this.trimText(latestCustomerMessage, this.maxInputChars),
        recentMessages: recentMessages.reverse().map((entry) => ({
          senderType: entry.senderType,
          content: this.trimText(entry.content, this.maxInputChars),
        })),
      });

      const aiMessage = await this.prisma.aiMessage.create({
        data: {
          aiThreadId: threadId,
          senderType: 'AI',
          content: aiReply,
        },
      });

      await this.prisma.aiThread.update({
        where: { id: threadId },
        data: { lastMessageAt: new Date() },
      });

      this.logger.log(
        JSON.stringify({
          event: 'ai_thread_reply_created',
          threadId,
          contextMessagesUsed: recentMessages.length,
        }),
      );

      return this.mapMessage(aiMessage);
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'ai_thread_reply_failed',
          threadId,
          errorType: getErrorType(error),
        }),
      );
      return this.createFallbackReply(threadId);
    }
  }

  async getMessages(
    threadId: string,
    customerId: string,
    skip = 0,
    take = 50,
  ): Promise<AiMessageEntity[]> {
    await this.getThreadForCustomer(threadId, customerId);

    const newest = await this.prisma.aiMessage.findMany({
      where: { aiThreadId: threadId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return newest.reverse().map((entry) => this.mapMessage(entry));
  }

  async markMessagesAsRead(
    threadId: string,
    customerId: string,
  ): Promise<void> {
    await this.getThreadForCustomer(threadId, customerId);

    await this.prisma.aiMessage.updateMany({
      where: {
        aiThreadId: threadId,
        isRead: false,
        OR: [
          { senderCustomerId: null },
          { senderCustomerId: { not: customerId } },
        ],
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
