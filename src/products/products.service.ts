import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { DatabaseService } from '../database/database.service';
import { CreateProductDto, QueryProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create a new product
   */
  async create(createProductDto: CreateProductDto) {
    return await this.databaseService.product.create({
      data: createProductDto,
    });
  }

  /**
   * Get all products with pagination and filtering
   */
  async findAll(params?: QueryProductDto) {
    const paginationParams = PaginationHelper.mergeWithDefaults(params || {});
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder,
    } = paginationParams;

    const { isActive, minStock, maxStock } = params || {};

    // Build where clause for search and filters
    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
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

    // Exclude soft-deleted records
    where.deletedAt = null;

    // Build orderBy
    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Get total count for pagination
    const total = await this.databaseService.product.count({ where });

    // Get paginated data
    const products = await this.databaseService.product.findMany({
      where,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(
      products,
      page,
      limit,
      total,
    );
  }

  /**
   * Get a single product by ID
   */
  async findOne(id: string) {
    const product = await this.databaseService.product.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  /**
   * Update a product
   */
  async update(id: string, updateProductDto: UpdateProductDto) {
    // Check if product exists
    await this.findOne(id);

    return await this.databaseService.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  /**
   * Soft delete a product
   */
  async remove(id: string) {
    // First check if product exists
    await this.findOne(id);

    // Soft delete by setting deletedAt
    return await this.databaseService.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Restore a soft-deleted product
   */
  async restore(id: string) {
    const product = await this.databaseService.product.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return await this.databaseService.product.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });
  }

  /**
   * Get all soft-deleted products with pagination and filtering
   */
  async findDeleted(params?: QueryProductDto) {
    const paginationParams = PaginationHelper.mergeWithDefaults(params || {});
    const {
      page,
      limit,
      search,
      sortBy = 'deletedAt',
      sortOrder,
    } = paginationParams;

    const { isActive, minStock, maxStock } = params || {};

    // Build where clause for search and filters
    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
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

    // Only include soft-deleted records
    where.deletedAt = { not: null };

    // Build orderBy
    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Get total count for pagination
    const total = await this.databaseService.product.count({ where });

    // Get paginated data
    const products = await this.databaseService.product.findMany({
      where,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(
      products,
      page,
      limit,
      total,
    );
  }

  /**
   * Permanently delete a product
   */
  async hardDelete(id: string) {
    // First check if soft-deleted product exists
    const product = await this.databaseService.product.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return await this.databaseService.product.delete({
      where: { id },
    });
  }
}
