export class MessageEntity {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
