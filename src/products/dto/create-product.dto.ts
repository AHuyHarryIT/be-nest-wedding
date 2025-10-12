import { Prisma } from '@prisma/client';

export class CreateProductDto implements Prisma.ProductCreateInput {
  name: string;
  description?: string | null;
  price?: number;
  stock_qty?: number;
  isActive?: boolean;
}
