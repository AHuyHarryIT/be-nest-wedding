export class ChatEntity {
  id: string;
  customerId: string;
  staffId?: string;
  bookingId?: string;
  chatType: 'DIRECT' | 'GROUP';
  lastMessageAt?: Date;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
