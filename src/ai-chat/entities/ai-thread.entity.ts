export class AiThreadEntity {
  id: string;
  customerId: string;
  bookingId?: string | null;
  canonicalThreadKey: string;
  createdAt: Date;
  updatedAt: Date;
}
