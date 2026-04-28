import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { DatabaseService } from '@/database/database.service';
import { JWT_ACCESS_CONFIG } from '@/auth/config/jwt.config';
import type { JwtPayload } from '@/auth/types/jwt';
import { StaffChatService } from './staff-chat.service';

const LOCAL_DEFAULT_CHAT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

const parseOrigins = (value: string | undefined): string[] =>
  (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

const DEFAULT_CHAT_ALLOWED_ORIGINS = (() => {
  const configuredDefaults = parseOrigins(
    process.env.DEFAULT_CHAT_ALLOWED_ORIGINS,
  );

  if (configuredDefaults.length > 0) {
    return configuredDefaults;
  }

  return LOCAL_DEFAULT_CHAT_ALLOWED_ORIGINS;
})();

type SocketPrincipal = {
  userId: string;
  userType: 'customer' | 'staff';
};

const isLoopbackHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1';

const resolveAllowedOrigins = (): string[] => {
  const configuredOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return DEFAULT_CHAT_ALLOWED_ORIGINS;
};

const allowedOrigins = resolveAllowedOrigins();

const corsOriginValidator = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
): void => {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  try {
    const requestOriginUrl = new URL(origin);
    if (!isLoopbackHost(requestOriginUrl.hostname)) {
      callback(new Error(`Not allowed by CORS: ${origin}`), false);
      return;
    }

    const hasLoopbackEquivalentOrigin = allowedOrigins.some((allowedOrigin) => {
      try {
        const allowedOriginUrl = new URL(allowedOrigin);
        return (
          isLoopbackHost(allowedOriginUrl.hostname) &&
          allowedOriginUrl.protocol === requestOriginUrl.protocol &&
          allowedOriginUrl.port === requestOriginUrl.port
        );
      } catch {
        return false;
      }
    });

    if (hasLoopbackEquivalentOrigin) {
      callback(null, true);
      return;
    }
  } catch {
    callback(new Error(`Not allowed by CORS: ${origin}`), false);
    return;
  }

  callback(new Error(`Not allowed by CORS: ${origin}`), false);
};

@WebSocketGateway({
  namespace: 'staff-chat',
  cors: {
    origin: corsOriginValidator,
    credentials: true,
    methods: ['GET', 'POST'],
  },
})
@Injectable()
export class StaffChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly userSockets: Map<string, string> = new Map();

  constructor(
    private readonly staffChatService: StaffChatService,
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      void this.attachVerifiedPrincipal(socket)
        .then(() => next())
        .catch((error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : 'Unauthorized socket connection';
          next(new Error(message));
        });
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const principal = await this.attachVerifiedPrincipal(client);

    this.userSockets.set(principal.userId, client.id);
    await client.join(`user:${principal.userId}`);
  }

  handleDisconnect(client: Socket): void {
    const userId = Array.from(this.userSockets.entries()).find(
      ([, socketId]) => socketId === client.id,
    )?.[0];

    if (userId) {
      this.userSockets.delete(userId);
    }
  }

  @SubscribeMessage('join_staff_chat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ): Promise<void> {
    try {
      const principal = this.getVerifiedPrincipal(client);
      await this.staffChatService.getChatForUser(data.chatId, principal.userId);
      await client.join(`staff-chat:${data.chatId}`);
    } catch (error) {
      this.emitSocketError(client, error);
    }
  }

  @SubscribeMessage('leave_staff_chat')
  async handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ): Promise<void> {
    await client.leave(`staff-chat:${data.chatId}`);
  }

  @SubscribeMessage('send_staff_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { chatId: string; content: string; clientMessageId?: string },
  ): Promise<void> {
    try {
      if (!data?.chatId || typeof data.chatId !== 'string') {
        throw new BadRequestException('Chat ID is required');
      }

      const content =
        typeof data.content === 'string' ? data.content.trim() : '';
      if (!content) {
        throw new BadRequestException('Content is required');
      }

      const principal = this.getVerifiedPrincipal(client);
      const message = await this.staffChatService.sendMessage(
        {
          chatId: data.chatId,
          content,
        },
        principal.userId,
      );

      const customerMessagePayload = data.clientMessageId
        ? { ...message, clientMessageId: data.clientMessageId }
        : message;

      this.server
        .to(`staff-chat:${data.chatId}`)
        .emit('staff_message_received', customerMessagePayload);

      const chat = await this.staffChatService.getChat(data.chatId);
      const otherUserId =
        chat.customerId === principal.userId ? chat.staffId : chat.customerId;

      if (otherUserId) {
        this.server
          .to(`user:${otherUserId}`)
          .emit('staff_new_message_notification', {
            chatId: data.chatId,
            messageCount: 1,
          });
      }
    } catch (error) {
      this.emitSocketError(client, error);
    }
  }

  @SubscribeMessage('staff_mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ): Promise<void> {
    try {
      const principal = this.getVerifiedPrincipal(client);
      await this.staffChatService.markMessagesAsRead(
        data.chatId,
        principal.userId,
      );

      this.server
        .to(`staff-chat:${data.chatId}`)
        .emit('staff_messages_marked_read', {
          chatId: data.chatId,
          userId: principal.userId,
        });
    } catch (error) {
      this.emitSocketError(client, error);
    }
  }

  @SubscribeMessage('staff_typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; isTyping: boolean },
  ): Promise<void> {
    try {
      const principal = this.getVerifiedPrincipal(client);
      await this.staffChatService.getChatForUser(data.chatId, principal.userId);

      this.server.to(`staff-chat:${data.chatId}`).emit('staff_user_typing', {
        chatId: data.chatId,
        userId: principal.userId,
        isTyping: data.isTyping,
      });
    } catch (error) {
      this.emitSocketError(client, error);
    }
  }

  private emitSocketError(client: Socket, error: unknown): void {
    if (
      error instanceof UnauthorizedException ||
      error instanceof ForbiddenException ||
      error instanceof NotFoundException ||
      error instanceof BadRequestException
    ) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        client.emit('staff_error', { message: response });
        return;
      }

      const typedResponse = response as {
        message?: string | string[];
        details?: Record<string, unknown>;
      };

      client.emit('staff_error', {
        message: Array.isArray(typedResponse.message)
          ? typedResponse.message.join(', ')
          : typedResponse.message || error.message,
        details: typedResponse.details,
      });
      return;
    }

    client.emit('staff_error', {
      message:
        error instanceof Error ? error.message : 'Unexpected socket error',
    });
  }

  private getVerifiedPrincipal(client: Socket): SocketPrincipal {
    const userId = (client.data as { userId?: string }).userId;
    const userType = (client.data as { userType?: 'customer' | 'staff' })
      .userType;

    if (!userId || !userType) {
      throw new UnauthorizedException('User not authenticated');
    }

    return { userId, userType };
  }

  private async attachVerifiedPrincipal(
    client: Socket,
  ): Promise<SocketPrincipal> {
    const existingUserId = (client.data as { userId?: string }).userId;
    const existingUserType = (
      client.data as { userType?: 'customer' | 'staff' }
    ).userType;

    if (existingUserId && existingUserType) {
      return {
        userId: existingUserId,
        userType: existingUserType,
      };
    }

    const token = this.extractAccessToken(client);
    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: JWT_ACCESS_CONFIG.secret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (
      !payload?.sub ||
      !payload.userType ||
      (payload.userType !== 'customer' && payload.userType !== 'staff')
    ) {
      throw new UnauthorizedException('Invalid access token payload');
    }

    if (payload.userType === 'customer') {
      const customer = await this.databaseService.customer.findUnique({
        where: { id: payload.sub },
        select: { id: true, isActive: true },
      });

      if (!customer || !customer.isActive) {
        throw new UnauthorizedException('User not authenticated');
      }
    } else {
      const staff = await this.databaseService.staff.findUnique({
        where: { id: payload.sub },
        select: { id: true, isActive: true },
      });

      if (!staff || !staff.isActive) {
        throw new UnauthorizedException('User not authenticated');
      }
    }

    const principal: SocketPrincipal = {
      userId: payload.sub,
      userType: payload.userType,
    };

    (client.data as { userId?: string }).userId = principal.userId;
    (client.data as { userType?: 'customer' | 'staff' }).userType =
      principal.userType;

    return principal;
  }

  private extractAccessToken(client: Socket): string | null {
    const cookieHeader = client.handshake.headers.cookie;
    if (typeof cookieHeader === 'string' && cookieHeader.length > 0) {
      const cookies = this.parseCookieHeader(cookieHeader);
      const cookieToken = cookies.staff_access_token || cookies.access_token;
      if (cookieToken) {
        return cookieToken;
      }
    }

    const authToken = (client.handshake.auth as { token?: unknown } | undefined)
      ?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken.trim();
    }

    const authorizationHeader = client.handshake.headers.authorization;
    if (
      typeof authorizationHeader === 'string' &&
      authorizationHeader.startsWith('Bearer ')
    ) {
      const bearerToken = authorizationHeader.slice(7).trim();
      if (bearerToken.length > 0) {
        return bearerToken;
      }
    }

    return null;
  }

  private parseCookieHeader(cookieHeader: string): Record<string, string> {
    return cookieHeader
      .split(';')
      .reduce<Record<string, string>>((acc, part) => {
        const [rawKey, ...rawValueParts] = part.trim().split('=');
        if (!rawKey || rawValueParts.length === 0) {
          return acc;
        }

        const key = rawKey.trim();
        const value = rawValueParts.join('=').trim();
        if (!key || !value) {
          return acc;
        }

        acc[key] = decodeURIComponent(value);
        return acc;
      }, {});
  }
}
