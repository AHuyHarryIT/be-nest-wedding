export class StaffChatEntity {
  id: string;
  customerId: string;
  staffId?: string | null;
  bookingId?: string | null;
  canonicalThreadKey: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  customer?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
}
