import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { DatabaseService } from '../database/database.service';
import { JWT_ACCESS_CONFIG } from '../auth/config/jwt.config';
import type { JwtPayload } from '../auth/types/jwt';

type SocketPrincipal = {
  userId: string;
  userType: 'customer' | 'staff';
};

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:4200',
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
    methods: ['GET', 'POST'],
  },
})
@Injectable()
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      void this.attachVerifiedPrincipal(socket)
        .then(() => next())
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'Unauthorized socket connection';
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

  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ): Promise<void> {
    try {
      const principal = this.getVerifiedPrincipal(client);
      await this.chatService.getChatForUser(data.chatId, principal.userId);
      await client.join(`chat:${data.chatId}`);
    } catch (error) {
      this.emitSocketError(client, error);
    }
  }

  @SubscribeMessage('leave_chat')
  async handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ): Promise<void> {
    await client.leave(`chat:${data.chatId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; content: string },
  ): Promise<void> {
    try {
      const principal = this.getVerifiedPrincipal(client);

      const message = await this.chatService.sendMessage(
        {
          chatId: data.chatId,
          content: data.content,
        },
        principal.userId,
      );

      void this.server.to(`chat:${data.chatId}`).emit('message_received', {
        id: message.id,
        chatId: message.chatId,
        senderId: message.senderId,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt,
      });

      const chatData = await this.chatService.getChat(data.chatId);
      const otherUserId =
        chatData.customerId === principal.userId
          ? chatData.staffId
          : chatData.customerId;

      if (otherUserId) {
        void this.server.to(`user:${otherUserId}`).emit('new_message_notification', {
          chatId: data.chatId,
          messageCount: 1,
        });
      }
    } catch (error) {
      this.emitSocketError(client, error);
    }
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ): Promise<void> {
    try {
      const principal = this.getVerifiedPrincipal(client);

      await this.chatService.markMessagesAsRead(data.chatId, principal.userId);

      void this.server.to(`chat:${data.chatId}`).emit('messages_marked_read', {
        chatId: data.chatId,
        userId: principal.userId,
      });
    } catch (error) {
      this.emitSocketError(client, error);
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; isTyping: boolean },
  ): Promise<void> {
    try {
      const principal = this.getVerifiedPrincipal(client);
      await this.chatService.getChatForUser(data.chatId, principal.userId);

      this.server.to(`chat:${data.chatId}`).emit('user_typing', {
        chatId: data.chatId,
        userId: principal.userId,
        isTyping: data.isTyping,
      });
    } catch (error) {
      this.emitSocketError(client, error);
    }
  }

  notifyUser(userId: string, event: string, data: unknown): void {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(`user:${userId}`).emit(event, data);
    }
  }

  notifyChat(chatId: string, event: string, data: unknown): void {
    this.server.to(`chat:${chatId}`).emit(event, data);
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
        client.emit('error', { message: response });
        return;
      }

      const typedResponse = response as {
        message?: string | string[];
        details?: Record<string, unknown>;
      };

      client.emit('error', {
        message: Array.isArray(typedResponse.message)
          ? typedResponse.message.join(', ')
          : typedResponse.message || error.message,
        details: typedResponse.details,
      });
      return;
    }

    client.emit('error', {
      message: error instanceof Error ? error.message : 'Unexpected socket error',
    });
  }

  private getVerifiedPrincipal(client: Socket): SocketPrincipal {
    const userId = (client.data as { userId?: string }).userId;
    const userType = (client.data as { userType?: 'customer' | 'staff' }).userType;

    if (!userId || !userType) {
      throw new UnauthorizedException('User not authenticated');
    }

    return { userId, userType };
  }

  private async attachVerifiedPrincipal(client: Socket): Promise<SocketPrincipal> {
    const existingUserId = (client.data as { userId?: string }).userId;
    const existingUserType = (client.data as {
      userType?: 'customer' | 'staff';
    }).userType;

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

    const authToken = (client.handshake.auth as { token?: unknown } | undefined)?.token;
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
    return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
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
