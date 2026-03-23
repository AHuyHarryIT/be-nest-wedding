import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { Injectable } from '@nestjs/common';

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
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket): void {
    const userId = client.handshake.auth.userId as string;
    if (userId) {
      this.userSockets.set(userId, client.id);
      void client.join(`user:${userId}`);
      console.log(`User ${userId} connected with socket ${client.id}`);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = Array.from(this.userSockets.entries()).find(
      ([, socketId]) => socketId === client.id,
    )?.[0];

    if (userId) {
      this.userSockets.delete(userId);
      console.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('join_chat')
  handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ): void {
    void client.join(`chat:${data.chatId}`);
    console.log(`Client joined chat: ${data.chatId}`);
  }

  @SubscribeMessage('leave_chat')
  handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ): void {
    void client.leave(`chat:${data.chatId}`);
    console.log(`Client left chat: ${data.chatId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; content: string },
  ): Promise<void> {
    const userId = Array.from(this.userSockets.entries()).find(
      ([, socketId]) => socketId === client.id,
    )?.[0];

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    try {
      const message = await this.chatService.sendMessage(
        {
          chatId: data.chatId,
          content: data.content,
        },
        userId,
      );

      // Emit to all users in the chat
      void this.server.to(`chat:${data.chatId}`).emit('message_received', {
        id: message.id,
        chatId: message.chatId,
        senderId: message.senderId,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt,
      });

      // Emit notification to other participant
      const chatData = await this.chatService.getChat(data.chatId);
      const otherUserId =
        chatData.customerId === userId ? chatData.staffId : chatData.customerId;

      if (otherUserId) {
        const otherUserSocketId = this.userSockets.get(otherUserId);
        if (otherUserSocketId) {
          void this.server
            .to(`user:${otherUserId}`)
            .emit('new_message_notification', {
              chatId: data.chatId,
              messageCount: 1,
            });
        }
      }
    } catch (error) {
      client.emit('error', { message: (error as Error).message });
    }
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ): Promise<void> {
    const userId = Array.from(this.userSockets.entries()).find(
      ([, socketId]) => socketId === client.id,
    )?.[0];

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    try {
      await this.chatService.markMessagesAsRead(data.chatId, userId);

      // Notify the other participant that messages are read
      void this.server.to(`chat:${data.chatId}`).emit('messages_marked_read', {
        chatId: data.chatId,
        userId: userId,
      });
    } catch (error) {
      client.emit('error', { message: (error as Error).message });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; isTyping: boolean },
  ): void {
    const userId = Array.from(this.userSockets.entries()).find(
      ([, socketId]) => socketId === client.id,
    )?.[0];

    if (userId) {
      this.server.to(`chat:${data.chatId}`).emit('user_typing', {
        chatId: data.chatId,
        userId: userId,
        isTyping: data.isTyping,
      });
    }
  }

  // Method to send notification to a user
  notifyUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(`user:${userId}`).emit(event, data);
    }
  }

  // Method to send notification to a chat
  notifyChat(chatId: string, event: string, data: any) {
    this.server.to(`chat:${chatId}`).emit(event, data);
  }
}
