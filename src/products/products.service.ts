import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { DatabaseService } from '../database/database.service';
import { Prisma } from 'generated/prisma';

@Injectable()
export class ProductsService {
  constructor(private readonly databaseService: DatabaseService) {}

  create(createProductDto: CreateProductDto) {
    return this.databaseService.product.create({ data: createProductDto });
  }

  findAll(
    q?: string,
    isActive?: boolean,
    minStock?: number,
    maxStock?: number,
  ) {
    const where: Prisma.ProductWhereInput = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (minStock !== undefined || maxStock !== undefined) {
      where.stockQty = {};
      if (minStock !== undefined) {
        where.stockQty.gte = minStock;
      }
      if (maxStock !== undefined) {
        where.stockQty.lte = maxStock;
      }
    }

    return this.databaseService.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.databaseService.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    // This will throw a Prisma P2025 error if the record doesn't exist
    return this.databaseService.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async remove(id: string) {
    // This will throw a Prisma P2025 error if the record doesn't exist
    return this.databaseService.product.delete({ where: { id } });
  }
}
