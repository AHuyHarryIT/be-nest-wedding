import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginationHelper } from '@/common/utils/pagination.helper';
import { DatabaseService } from '@/database/database.service';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  QueryQuotationDto,
  AddQuotationInventoryItemDto,
  AddQuotationServiceItemDto,
  RemoveQuotationInventoryItemDto,
  RemoveQuotationServiceItemDto,
} from './dto';

@Injectable()
export class QuotationsService {
  constructor(private readonly database: DatabaseService) {}

  // ────────────────────────────────────────────
  //  Helpers
  // ────────────────────────────────────────────

  /** Generate quotation number: QT-YYYY-NNN */
  private async generateQuotationNumber(): Promise<string> {
    const year = new Date().getFullYear();

    // Find how many quotations exist this year
    const count = await this.database.quotation.count({
      where: {
        quotationNumber: { startsWith: `QT-${year}-` },
      },
    });

    const nnn = String(count + 1).padStart(3, '0');
    return `QT-${year}-${nnn}`;
  }

  /** Calculate totals from inventory items + service items */
  async calculateTotals(
    quotationId: string,
    extra?: {
      discountPercent?: number;
      taxPercent?: number;
    },
  ) {
    // Fetch all line items
    const inventoryItems = await this.database.quotationInventoryItem.findMany({
      where: { quotationId },
      select: { quantity: true, unitPrice: true, discountPercent: true },
    });
    const serviceItems = await this.database.quotationService.findMany({
      where: { quotationId },
      select: { quantity: true, unitPrice: true, discountPercent: true },
    });

    const allItems = [...inventoryItems, ...serviceItems];

    const subtotal = allItems.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const discount = lineTotal * (item.discountPercent / 100);
      return sum + (lineTotal - discount);
    }, 0);

    const discountPercent = extra?.discountPercent ?? 0;
    const taxPercent = extra?.taxPercent ?? 0;

    const discounted = subtotal * (1 - discountPercent / 100);
    const tax = discounted * (taxPercent / 100);
    const totalPrice = discounted + tax;

    return {
      subtotal: Math.round(subtotal * 100) / 100, // Round to 2 decimals
      discountPercent,
      taxPercent,
      totalPrice: Math.round(totalPrice * 100) / 100,
    };
  }

  // ────────────────────────────────────────────
  //  CRUD
  // ────────────────────────────────────────────

  /** Create quotation (with optional initial items) */
  async create(dto: CreateQuotationDto, createdById: string) {
    const quotationNumber = await this.generateQuotationNumber();

    const quotation = await this.database.quotation.create({
      data: {
        quotationNumber,
        customerId: dto.customerId,
        title: dto.title,
        notes: dto.notes,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        discountPercent: dto.discountPercent ?? 0,
        taxPercent: dto.taxPercent ?? 0,
        createdById,
        status: 'DRAFT',
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Add inventory items if provided
    if (dto.inventoryItems?.length) {
      for (const item of dto.inventoryItems) {
        await this.addInventoryItem(quotation.id, item);
      }
    }

    // Add service items if provided
    if (dto.serviceItems?.length) {
      for (const item of dto.serviceItems) {
        await this.addServiceItem(quotation.id, item);
      }
    }

    // Recalculate totals
    const totals = await this.calculateTotals(quotation.id, {
      discountPercent: dto.discountPercent,
      taxPercent: dto.taxPercent,
    });

    await this.database.quotation.update({
      where: { id: quotation.id },
      data: totals,
    });

    // Return with items
    return this.findOne(quotation.id);
  }

  /** List quotations (paginated, filtered) */
  async findAll(query: QueryQuotationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = PaginationHelper.getSkip(page, limit);

    const where: any = { deletedAt: null };

    if (query.customerId) where.customerId = query.customerId;
    if (query.status) where.status = query.status;

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { quotationNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.database.quotation.findMany({
        where,
        include: {
          customer: query.includeCustomer
            ? {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phoneNumber: true,
                },
              }
            : false,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.database.quotation.count({ where }),
    ]);

    return PaginationHelper.createPaginatedResponse(data, page, limit, total);
  }

  /** Find single quotation with items */
  async findOne(id: string) {
    const quotation = await this.database.quotation.findUnique({
      where: { id, deletedAt: null },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        inventoryItems: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                sku: true,
                imageUrl: true,
                isActive: true,
              },
            },
          },
        },
        services: {
          include: {
            service: {
              select: { id: true, name: true, imageUrl: true, isActive: true },
            },
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID "${id}" not found`);
    }

    return quotation;
  }

  /** Update quotation basic fields */
  async update(id: string, dto: UpdateQuotationDto) {
    const existing = await this.findOne(id);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT quotations can be updated');
    }

    const updateData: any = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.validUntil !== undefined)
      updateData.validUntil = new Date(dto.validUntil);
    if (dto.discountPercent !== undefined)
      updateData.discountPercent = dto.discountPercent;
    if (dto.taxPercent !== undefined) updateData.taxPercent = dto.taxPercent;

    const updated = await this.database.quotation.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        inventoryItems: {
          include: { item: { select: { id: true, name: true, sku: true } } },
        },
        services: {
          include: { service: { select: { id: true, name: true } } },
        },
      },
    });

    // Recalculate totals if discountPercent or taxPercent changed
    if (dto.discountPercent !== undefined || dto.taxPercent !== undefined) {
      const totals = await this.calculateTotals(id, {
        discountPercent: dto.discountPercent,
        taxPercent: dto.taxPercent,
      });
      Object.assign(updated, totals);
      await this.database.quotation.update({ where: { id }, data: totals });
    }

    return updated;
  }

  /** Soft delete quotation */
  async remove(id: string) {
    const existing = await this.findOne(id);

    if (existing.status === 'CONVERTED') {
      throw new BadRequestException('Cannot delete a converted quotation');
    }

    return this.database.quotation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ────────────────────────────────────────────
  //  Item Management
  // ────────────────────────────────────────────

  async addInventoryItem(
    quotationId: string,
    dto: AddQuotationInventoryItemDto,
  ) {
    const quotation = await this.database.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException(
        `Quotation with ID "${quotationId}" not found`,
      );
    }

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Cannot add items to a non-DRAFT quotation',
      );
    }

    // Verify item exists
    const item = await this.database.inventoryItem.findUnique({
      where: { id: dto.itemId, deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException(`Inventory item "${dto.itemId}" not found`);
    }

    // Upsert (update if already exists)
    return this.database.quotationInventoryItem.upsert({
      where: { quotationId_itemId: { quotationId, itemId: dto.itemId } },
      create: {
        quotationId,
        itemId: dto.itemId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        discountPercent: dto.discountPercent ?? 0,
      },
      update: {
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        discountPercent: dto.discountPercent ?? 0,
      },
    });
  }

  async addServiceItem(quotationId: string, dto: AddQuotationServiceItemDto) {
    const quotation = await this.database.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException(
        `Quotation with ID "${quotationId}" not found`,
      );
    }

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Cannot add items to a non-DRAFT quotation',
      );
    }

    // Verify service exists
    const service = await this.database.service.findUnique({
      where: { id: dto.serviceId, deletedAt: null },
    });
    if (!service) {
      throw new NotFoundException(`Service "${dto.serviceId}" not found`);
    }

    return this.database.quotationService.upsert({
      where: {
        quotationId_serviceId: { quotationId, serviceId: dto.serviceId },
      },
      create: {
        quotationId,
        serviceId: dto.serviceId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        discountPercent: dto.discountPercent ?? 0,
      },
      update: {
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        discountPercent: dto.discountPercent ?? 0,
      },
    });
  }

  async removeInventoryItem(
    quotationId: string,
    dto: RemoveQuotationInventoryItemDto,
  ) {
    const quotation = await this.database.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException(
        `Quotation with ID "${quotationId}" not found`,
      );
    }

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Cannot remove items from a non-DRAFT quotation',
      );
    }

    const existing = await this.database.quotationInventoryItem.findUnique({
      where: { quotationId_itemId: { quotationId, itemId: dto.itemId } },
    });

    if (!existing) {
      throw new NotFoundException(
        `Inventory item "${dto.itemId}" not found in quotation`,
      );
    }

    return this.database.quotationInventoryItem.delete({
      where: { quotationId_itemId: { quotationId, itemId: dto.itemId } },
    });
  }

  async removeServiceItem(
    quotationId: string,
    dto: RemoveQuotationServiceItemDto,
  ) {
    const quotation = await this.database.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException(
        `Quotation with ID "${quotationId}" not found`,
      );
    }

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Cannot remove items from a non-DRAFT quotation',
      );
    }

    const existing = await this.database.quotationService.findUnique({
      where: {
        quotationId_serviceId: { quotationId, serviceId: dto.serviceId },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Service "${dto.serviceId}" not found in quotation`,
      );
    }

    return this.database.quotationService.delete({
      where: {
        quotationId_serviceId: { quotationId, serviceId: dto.serviceId },
      },
    });
  }

  // ────────────────────────────────────────────
  //  Status Transitions
  // ────────────────────────────────────────────

  /** Mark quotation as SENT, optionally set validUntil */
  async send(id: string, validUntil?: string) {
    const quotation = await this.findOne(id);

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        `Only DRAFT quotations can be sent. Current status: ${quotation.status}`,
      );
    }

    const updateData: any = { status: 'SENT' };
    if (validUntil) {
      updateData.validUntil = new Date(validUntil);
    }

    return this.database.quotation.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /** Accept quotation */
  async accept(id: string) {
    const quotation = await this.findOne(id);

    if (quotation.status !== 'SENT') {
      throw new BadRequestException(
        `Only SENT quotations can be accepted. Current status: ${quotation.status}`,
      );
    }

    // Check validUntil expiry
    if (quotation.validUntil && quotation.validUntil < new Date()) {
      // First mark as EXPIRED
      await this.database.quotation.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException(
        'Quotation has expired and cannot be accepted',
      );
    }

    return this.database.quotation.update({
      where: { id },
      data: { status: 'ACCEPTED' },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /** Reject quotation */
  async reject(id: string) {
    const quotation = await this.findOne(id);

    if (quotation.status !== 'SENT' && quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        `Only SENT or DRAFT quotations can be rejected. Current status: ${quotation.status}`,
      );
    }

    return this.database.quotation.update({
      where: { id },
      data: { status: 'REJECTED' },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  // ────────────────────────────────────────────
  //  Convert to Booking
  // ────────────────────────────────────────────

  async convertToBooking(id: string) {
    const quotation = await this.database.quotation.findUnique({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        inventoryItems: true,
        services: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID "${id}" not found`);
    }

    if (quotation.status !== 'ACCEPTED') {
      throw new BadRequestException(
        `Only ACCEPTED quotations can be converted. Current status: ${quotation.status}`,
      );
    }

    // Check validUntil expiry
    if (quotation.validUntil && quotation.validUntil < new Date()) {
      throw new BadRequestException(
        'Quotation has expired and cannot be converted',
      );
    }

    // Determine eventDate - default to today
    const eventDate = new Date();

    // Create booking
    const booking = await this.database.booking.create({
      data: {
        customerId: quotation.customerId,
        notes:
          quotation.notes ||
          `Converted from quotation ${quotation.quotationNumber}`,
        status: 'PENDING',
        eventDate,
        totalPrice: quotation.totalPrice,
      },
    });

    // Create BookingService records
    if (quotation.services.length > 0) {
      await this.database.bookingService.createMany({
        data: quotation.services.map((qs) => ({
          bookingId: booking.id,
          serviceId: qs.serviceId,
          quantity: qs.quantity,
          price: qs.unitPrice * (1 - qs.discountPercent / 100),
        })),
      });
    }

    // Create BookingInventoryItem records
    if (quotation.inventoryItems.length > 0) {
      await this.database.bookingInventoryItem.createMany({
        data: quotation.inventoryItems.map((qi) => ({
          bookingId: booking.id,
          itemId: qi.itemId,
          quantity: qi.quantity,
          unitPrice: qi.unitPrice,
          discountPercent: qi.discountPercent,
        })),
      });
    }

    // Update quotation status
    await this.database.quotation.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedAt: new Date(),
      },
    });

    return { quotation, booking };
  }

  /** Generate PDF URL (placeholder) */
  getPdfUrl(id: string): string {
    // Placeholder - would integrate with a PDF generation service
    const baseUrl = process.env.API_URL || 'http://localhost:3000';
    return `${baseUrl}/quotations/${id}/pdf`;
  }
}
