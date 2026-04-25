import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RentalStatus, InventoryLogType } from 'generated/prisma';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { DatabaseService } from '../database/database.service';
import {
  CreateInventoryCategoryDto,
  UpdateInventoryCategoryDto,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryQueryDto,
  InventoryLogQueryDto,
  CheckoutInventoryDto,
  CheckinInventoryDto,
  AdjustStockDto,
} from './dto';

@Injectable()
export class InventoryService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ================== CATEGORIES ==================

  async createCategory(createDto: CreateInventoryCategoryDto) {
    return this.databaseService.inventoryCategory.create({
      data: { name: createDto.name },
    });
  }

  async findAllCategories() {
    return this.databaseService.inventoryCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { items: true } } },
    });
  }

  async findOneCategory(id: string) {
    const category = await this.databaseService.inventoryCategory.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });
    if (!category) {
      throw new NotFoundException(`Inventory category with ID ${id} not found`);
    }
    return category;
  }

  async updateCategory(id: string, updateDto: UpdateInventoryCategoryDto) {
    await this.findOneCategory(id);
    return this.databaseService.inventoryCategory.update({
      where: { id },
      data: { name: updateDto.name },
      include: { _count: { select: { items: true } } },
    });
  }

  async deleteCategory(id: string) {
    await this.findOneCategory(id);
    return this.databaseService.inventoryCategory.delete({ where: { id } });
  }

  // ================== INVENTORY ITEMS ==================

  async createItem(createDto: CreateInventoryItemDto) {
    const item = await this.databaseService.inventoryItem.create({
      data: {
        name: createDto.name,
        description: createDto.description || null,
        type: createDto.type,
        sku: createDto.sku || null,
        costPrice: createDto.costPrice ?? 0,
        sellPrice: createDto.sellPrice ?? 0,
        rentalDeposit: createDto.rentalDeposit || null,
        rentalPricePerDay: createDto.rentalPricePerDay || null,
        stockCount: createDto.stockCount ?? 0,
        checkedOutCount: createDto.checkedOutCount ?? 0,
        lowStockThreshold: createDto.lowStockThreshold || null,
        rentalStatus: (createDto.rentalStatus as RentalStatus) || 'AVAILABLE',
        category: createDto.categoryId
          ? { connect: { id: createDto.categoryId } }
          : undefined,
        imageUrl: createDto.imageUrl || null,
        isActive: createDto.isActive ?? true,
      },
      include: { category: true },
    });

    // Create initial stock-in log
    if (item.stockCount > 0) {
      await this.createLog({
        itemId: item.id,
        type: 'STOCK_IN',
        quantity: item.stockCount,
        note: 'Initial stock',
      });
    }

    return item;
  }

  async findAllItems(params?: InventoryQueryDto) {
    const {
      page,
      limit,
      sortBy = 'createdAt',
      sortOrder,
    } = PaginationHelper.mergeWithDefaults(params || {});
    const { search, type, categoryId, isActive } = params || {};

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (isActive !== undefined) where.isActive = isActive;

    const orderBy: any = { [sortBy]: sortOrder };

    const total = await this.databaseService.inventoryItem.count({ where });
    const data = await this.databaseService.inventoryItem.findMany({
      where,
      orderBy,
      include: { category: true },
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(data, page, limit, total);
  }

  async findOneItem(id: string) {
    const item = await this.databaseService.inventoryItem.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        logs: { take: 10, orderBy: { createdAt: 'desc' } },
        bookings: { take: 10 },
      },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    return item;
  }

  async updateItem(id: string, updateDto: UpdateInventoryItemDto) {
    await this.findOneItem(id);

    const data: any = {
      name: updateDto.name,
      description: updateDto.description,
      type: updateDto.type,
      sku: updateDto.sku,
      costPrice: updateDto.costPrice,
      sellPrice: updateDto.sellPrice,
      rentalDeposit: updateDto.rentalDeposit,
      rentalPricePerDay: updateDto.rentalPricePerDay,
      stockCount: updateDto.stockCount,
      checkedOutCount: updateDto.checkedOutCount,
      lowStockThreshold: updateDto.lowStockThreshold,
      rentalStatus: updateDto.rentalStatus
        ? (updateDto.rentalStatus as RentalStatus)
        : undefined,
      category: updateDto.categoryId
        ? { connect: { id: updateDto.categoryId } }
        : updateDto.categoryId === null
          ? { disconnect: true }
          : undefined,
      imageUrl: updateDto.imageUrl,
      isActive: updateDto.isActive,
    };

    // Remove undefined values to avoid Prisma errors
    Object.keys(data).forEach((key) => {
      if (data[key] === undefined) delete data[key];
    });

    return this.databaseService.inventoryItem.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async removeItem(id: string) {
    await this.findOneItem(id);
    return this.databaseService.inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ================== CHECKOUT ==================

  async checkoutItem(id: string, dto: CheckoutInventoryDto, actorId?: string) {
    const item = await this.findOneItem(id);

    if (!item.isActive) {
      throw new BadRequestException(
        'This inventory item is not active and cannot be checked out',
      );
    }

    if (item.type !== 'RENTAL') {
      throw new BadRequestException('Only RENTAL items can be checked out');
    }

    const quantity = dto.quantity || 1;
    const availableStock = item.stockCount - item.checkedOutCount;

    if (quantity > availableStock) {
      throw new BadRequestException(
        `Not enough stock. Available: ${availableStock}, Requested: ${quantity}`,
      );
    }

    const updatedItem = await this.databaseService.inventoryItem.update({
      where: { id },
      data: {
        checkedOutCount: { increment: quantity },
        rentalStatus: 'CHECKED_OUT',
      },
      include: { category: true },
    });

    await this.createLog({
      itemId: id,
      type: 'CHECKOUT',
      quantity,
      note: dto.note || 'Item checked out',
      checkoutDate: new Date(),
      expectedReturnDate: dto.expectedReturnDate,
      actorId: actorId || null,
    });

    return {
      item: updatedItem,
      lowStockAlert: this.checkLowStock(updatedItem),
    };
  }

  // ================== CHECKIN ==================

  async checkinItem(id: string, dto: CheckinInventoryDto, actorId?: string) {
    const item = await this.findOneItem(id);

    if (item.type !== 'RENTAL') {
      throw new BadRequestException('Only RENTAL items can be checked in');
    }

    if (item.checkedOutCount <= 0) {
      throw new BadRequestException(
        'No items are currently checked out for this item',
      );
    }

    const quantity = dto.quantity || 1;

    if (quantity > item.checkedOutCount) {
      throw new BadRequestException(
        `Cannot check in ${quantity}. Currently checked out: ${item.checkedOutCount}`,
      );
    }

    const updatedItem = await this.databaseService.inventoryItem.update({
      where: { id },
      data: {
        checkedOutCount: { decrement: quantity },
      },
      include: { category: true },
    });

    await this.createLog({
      itemId: id,
      type: 'CHECKIN',
      quantity,
      note: dto.damageNote || 'Item checked in',
      actualReturnDate: new Date(),
      damageNote: dto.damageNote || null,
      damageCost: dto.damageCost || null,
      actorId: actorId || null,
    });

    return {
      item: updatedItem,
      damageCost: dto.damageCost,
      damageNote: dto.damageNote,
    };
  }

  // ================== STOCK ADJUSTMENT ==================

  async adjustStock(id: string, dto: AdjustStockDto, actorId?: string) {
    const item = await this.findOneItem(id);

    if (item.stockCount + dto.quantity < 0) {
      throw new BadRequestException(
        `Cannot adjust stock below 0. Current stock: ${item.stockCount}`,
      );
    }

    const updatedItem = await this.databaseService.inventoryItem.update({
      where: { id },
      data: {
        stockCount: { increment: dto.quantity },
      },
      include: { category: true },
    });

    await this.createLog({
      itemId: id,
      type: 'ADJUSTMENT',
      quantity: Math.abs(dto.quantity),
      note: dto.note,
      actorId: actorId || null,
    });

    return {
      item: updatedItem,
      lowStockAlert: this.checkLowStock(updatedItem),
    };
  }

  // ================== INVENTORY LOGS ==================

  async findItemLogs(itemId: string) {
    await this.findOneItem(itemId);
    return this.databaseService.inventoryLog.findMany({
      where: { itemId },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  async findAllLogs(params?: InventoryLogQueryDto) {
    const {
      page,
      limit,
      sortBy = 'createdAt',
      sortOrder,
    } = PaginationHelper.mergeWithDefaults(params || {});
    const { search, type } = params || {};

    const where: any = {};

    if (search) {
      where.note = { contains: search, mode: 'insensitive' };
    }

    if (type) {
      where.type = type;
    }

    const orderBy: any = { [sortBy]: sortOrder };

    const total = await this.databaseService.inventoryLog.count({ where });
    const data = await this.databaseService.inventoryLog.findMany({
      where,
      orderBy,
      include: {
        item: true,
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(data, page, limit, total);
  }

  // ================== HELPERS ==================

  private async createLog(data: {
    itemId: string;
    type: string;
    quantity: number;
    note?: string | null;
    checkoutDate?: Date | null;
    expectedReturnDate?: Date | null;
    actualReturnDate?: Date | null;
    damageNote?: string | null;
    damageCost?: number | null;
    actorId?: string | null;
  }) {
    return this.databaseService.inventoryLog.create({ data: data as any });
  }

  private checkLowStock(item: {
    stockCount: number;
    checkedOutCount: number;
    lowStockThreshold: number | null;
  }): boolean {
    if (!item.lowStockThreshold) return false;
    const available = item.stockCount - item.checkedOutCount;
    return available <= item.lowStockThreshold;
  }
}
