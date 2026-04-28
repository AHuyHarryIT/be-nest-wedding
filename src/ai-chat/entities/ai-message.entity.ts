export class AiMessageEntity {
  id: string;
  threadId: string;
  senderType: 'CUSTOMER' | 'AI';
  senderCustomerId?: string | null;
  content: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
