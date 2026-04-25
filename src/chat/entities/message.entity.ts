export class MessageEntity {
  id: string;
  chatId: string;
  senderId?: string;
  senderType: 'CUSTOMER' | 'STAFF' | 'AI';
  content: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
