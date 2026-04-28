export class StaffMessageEntity {
  id: string;
  chatId: string;
  senderType: 'CUSTOMER' | 'STAFF';
  senderCustomerId?: string | null;
  senderStaffId?: string | null;
  content: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
