import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { DatabaseService } from '../database/database.service';
import { CreateBookingDto, QueryBookingDto, UpdateBookingDto } from './dto';

@Injectable()
export class BookingsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create a new booking
   */
  async create(createBookingDto: CreateBookingDto) {
    return await this.databaseService.booking.create({
      data: {
        customerId: createBookingDto.customerId,
        packageId: createBookingDto.packageId,
        eventDate: new Date(createBookingDto.eventDate),
        notes: createBookingDto.notes,
        totalPrice: createBookingDto.totalPrice || 0,
        status: createBookingDto.status || 'PENDING',
      },
      include: {
        customer: true,
        package: true,
      },
    });
  }

  /**
   * Get all bookings with pagination and filtering
   */
  async findAll(params?: QueryBookingDto) {
    const paginationParams = PaginationHelper.mergeWithDefaults(params || {});
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder,
    } = paginationParams;

    const { status, customerId, packageId, eventDateFrom, eventDateTo } =
      params || {};

    // Build where clause for search and filters
    const where: Prisma.BookingWhereInput = {};

    if (search) {
      where.OR = [
        { notes: { contains: search, mode: 'insensitive' } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (packageId) {
      where.packageId = packageId;
    }

    if (eventDateFrom || eventDateTo) {
      where.eventDate = {};
      if (eventDateFrom) {
        where.eventDate.gte = new Date(eventDateFrom);
      }
      if (eventDateTo) {
        where.eventDate.lte = new Date(eventDateTo);
      }
    }

    // Exclude soft-deleted records
    where.deletedAt = null;

    // Build orderBy
    const orderBy: Prisma.BookingOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Get total count for pagination
    const total = await this.databaseService.booking.count({ where });

    // Get paginated data
    const bookings = await this.databaseService.booking.findMany({
      where,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
      include: {
        customer: true,
        package: true,
      },
    });

    return PaginationHelper.createPaginatedResponse(
      bookings,
      page,
      limit,
      total,
    );
  }

  /**
   * Get a single booking by ID
   */
  async findOne(id: string) {
    const booking = await this.databaseService.booking.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        customer: true,
        package: true,
        sessions: true,
        orders: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    return booking;
  }

  /**
   * Update a booking
   */
  async update(id: string, updateBookingDto: UpdateBookingDto) {
    // Check if booking exists
    await this.findOne(id);

    const updateData: Prisma.BookingUpdateInput = {};

    if (updateBookingDto.customerId !== undefined) {
      updateData.customer = { connect: { id: updateBookingDto.customerId } };
    }
    if (updateBookingDto.packageId !== undefined) {
      updateData.package = { connect: { id: updateBookingDto.packageId } };
    }
    if (updateBookingDto.notes !== undefined)
      updateData.notes = updateBookingDto.notes;
    if (updateBookingDto.status !== undefined)
      updateData.status = updateBookingDto.status;
    if (updateBookingDto.totalPrice !== undefined)
      updateData.totalPrice = updateBookingDto.totalPrice;
    if (updateBookingDto.eventDate) {
      updateData.eventDate = new Date(updateBookingDto.eventDate);
    }

    return await this.databaseService.booking.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        package: true,
      },
    });
  }

  /**
   * Soft delete a booking
   */
  async remove(id: string) {
    // First check if booking exists
    await this.findOne(id);

    // Soft delete by setting deletedAt
    return await this.databaseService.booking.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Restore a soft-deleted booking
   */
  async restore(id: string) {
    const booking = await this.databaseService.booking.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    return await this.databaseService.booking.update({
      where: { id },
      data: {
        deletedAt: null,
      },
      include: {
        customer: true,
        package: true,
      },
    });
  }

  /**
   * Get all soft-deleted bookings with pagination and filtering
   */
  async findDeleted(params?: QueryBookingDto) {
    const paginationParams = PaginationHelper.mergeWithDefaults(params || {});
    const {
      page,
      limit,
      search,
      sortBy = 'deletedAt',
      sortOrder,
    } = paginationParams;

    const { status, customerId, packageId } = params || {};

    // Build where clause for search and filters
    const where: Prisma.BookingWhereInput = {};

    if (search) {
      where.OR = [{ notes: { contains: search, mode: 'insensitive' } }];
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (packageId) {
      where.packageId = packageId;
    }

    // Only include soft-deleted records
    where.deletedAt = { not: null };

    // Build orderBy
    const orderBy: Prisma.BookingOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Get total count for pagination
    const total = await this.databaseService.booking.count({ where });

    // Get paginated data
    const bookings = await this.databaseService.booking.findMany({
      where,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
      include: {
        customer: true,
        package: true,
      },
    });

    return PaginationHelper.createPaginatedResponse(
      bookings,
      page,
      limit,
      total,
    );
  }

  /**
   * Permanently delete a booking
   */
  async hardDelete(id: string) {
    // First check if soft-deleted booking exists
    const booking = await this.databaseService.booking.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    return await this.databaseService.booking.delete({
      where: { id },
    });
  }
}
