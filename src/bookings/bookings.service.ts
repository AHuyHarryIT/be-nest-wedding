import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, BookingStatus } from 'generated/prisma';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { DatabaseService } from '../database/database.service';
import { CreateBookingDto, QueryBookingDto, UpdateBookingDto } from './dto';

@Injectable()
export class BookingsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createBookingDto: CreateBookingDto) {
    // Validate customer exists
    const customer = await this.databaseService.user.findUnique({
      where: { id: createBookingDto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${createBookingDto.customerId} not found`,
      );
    }

    // Validate package exists
    const packageItem = await this.databaseService.package.findFirst({
      where: {
        id: createBookingDto.packageId,
        deletedAt: null,
        isActive: true,
      },
    });
    if (!packageItem) {
      throw new NotFoundException(
        `Package with ID ${createBookingDto.packageId} not found`,
      );
    }

    const data: Prisma.BookingCreateInput = {
      customer: { connect: { id: createBookingDto.customerId } },
      package: { connect: { id: createBookingDto.packageId } },
      notes: createBookingDto.notes,
      eventDate: new Date(createBookingDto.eventDate),
      totalPrice: createBookingDto.totalPrice ?? 0,
      status: createBookingDto.status ?? BookingStatus.PENDING,
    };

    return this.databaseService.booking.create({
      data,
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
        package: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
          },
        },
      },
    });
  }

  async findAll(params?: QueryBookingDto) {
    const paginationParams = PaginationHelper.mergeWithDefaults(params || {});
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder,
    } = paginationParams;

    const {
      customerId,
      packageId,
      status,
      includeCustomer,
      includePackage,
      includeSessions,
    } = params || {};

    const where: Prisma.BookingWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [{ notes: { contains: search, mode: 'insensitive' } }];
    }

    if (customerId) where.customerId = customerId;
    if (packageId) where.packageId = packageId;
    if (status) where.status = status;

    const include: Prisma.BookingInclude = {};
    if (includeCustomer)
      include.customer = {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
        },
      };
    if (includePackage)
      include.package = {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
        },
      };
    if (includeSessions)
      include.sessions = {
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          locationName: true,
          address: true,
          status: true,
        },
      };

    const orderBy: Prisma.BookingOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const total = await this.databaseService.booking.count({ where });
    const bookings = await this.databaseService.booking.findMany({
      where,
      include,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(
      bookings,
      page,
      limit,
      total,
    );
  }

  async findOne(id: string) {
    const booking = await this.databaseService.booking.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        package: true,
        sessions: true,
        albums: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  async update(id: string, updateBookingDto: UpdateBookingDto) {
    await this.findOne(id);

    // Validate customer exists if being updated
    if (updateBookingDto.customerId) {
      const customer = await this.databaseService.user.findUnique({
        where: { id: updateBookingDto.customerId },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${updateBookingDto.customerId} not found`,
        );
      }
    }

    // Validate package exists if being updated
    if (updateBookingDto.packageId) {
      const packageItem = await this.databaseService.package.findFirst({
        where: { id: updateBookingDto.packageId, deletedAt: null },
      });
      if (!packageItem) {
        throw new NotFoundException(
          `Package with ID ${updateBookingDto.packageId} not found`,
        );
      }
    }

    const data: Prisma.BookingUpdateInput = {};
    if (updateBookingDto.customerId)
      data.customer = { connect: { id: updateBookingDto.customerId } };
    if (updateBookingDto.packageId)
      data.package = { connect: { id: updateBookingDto.packageId } };
    if (updateBookingDto.notes !== undefined)
      data.notes = updateBookingDto.notes;
    if (updateBookingDto.eventDate)
      data.eventDate = new Date(updateBookingDto.eventDate);
    if (updateBookingDto.totalPrice !== undefined)
      data.totalPrice = updateBookingDto.totalPrice;
    if (updateBookingDto.status) data.status = updateBookingDto.status;

    return this.databaseService.booking.update({
      where: { id },
      data,
      include: {
        customer: true,
        package: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.databaseService.booking.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    const booking = await this.databaseService.booking.findUnique({
      where: { id },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return this.databaseService.booking.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async hardDelete(id: string) {
    const booking = await this.databaseService.booking.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return this.databaseService.booking.delete({ where: { id } });
  }

  async cancelBooking(id: string) {
    await this.findOne(id);
    return this.databaseService.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }

  async confirmBooking(id: string) {
    await this.findOne(id);
    return this.databaseService.booking.update({
      where: { id },
      data: { status: BookingStatus.CONFIRMED },
    });
  }
}
