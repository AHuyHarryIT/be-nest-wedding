import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { BaseRepository } from './base.repository';

/**
 * Booking Repository - Handles all booking data operations
 * Manages wedding event bookings with packages and services
 */
@Injectable()
export class BookingRepository extends BaseRepository<any> {
  constructor(protected db: DatabaseService) {
    super(db);
    this.modelName = 'booking';
  }

  /**
   * Find booking by ID with all details
   */
  async findByIdWithDetails(bookingId: string) {
    return this.db.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        packages: { include: { package: true } },
        services: { include: { service: true } },
        sessions: {
          include: {
            staffs: { include: { staff: true } },
            services: { include: { service: true } },
          },
        },
        albums: { include: { files: { include: { file: true } } } },
        orders: { include: { payments: true, refunds: true } },
      },
    });
  }

  /**
   * Find bookings by customer ID with pagination
   */
  async findByCustomerId(
    customerId: string,
    params?: { skip?: number; take?: number },
  ) {
    return this.db.booking.findMany({
      where: { customerId },
      include: {
        packages: { include: { package: true } },
        services: { include: { service: true } },
        orders: true,
      },
      orderBy: { eventDate: 'desc' },
      ...params,
    });
  }

  /**
   * Find bookings by status
   */
  async findByStatus(
    status: string,
    params?: { skip?: number; take?: number; includeDeleted?: boolean },
  ) {
    const where: any = { status: status as any };

    if (!params?.includeDeleted) {
      where.deletedAt = null;
    }

    return this.db.booking.findMany({
      where,
      include: {
        customer: true,
        orders: true,
        sessions: true,
      },
      orderBy: { eventDate: 'asc' },
      skip: params?.skip,
      take: params?.take,
    });
  }

  /**
   * Find upcoming bookings within date range
   */
  async findUpcoming(
    daysAhead = 30,
    params?: { skip?: number; take?: number },
  ) {
    const now = new Date();
    const futureDate = new Date(
      now.getTime() + daysAhead * 24 * 60 * 60 * 1000,
    );

    return this.db.booking.findMany({
      where: {
        eventDate: {
          gte: now,
          lte: futureDate,
        },
        status: { in: ['PENDING', 'CONFIRMED'] },
        deletedAt: null,
      },
      include: {
        customer: true,
        orders: true,
        sessions: true,
      },
      orderBy: { eventDate: 'asc' },
      ...params,
    });
  }

  /**
   * Find bookings for a specific date
   */
  async findByEventDate(date: Date) {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    return this.db.booking.findMany({
      where: {
        eventDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        deletedAt: null,
      },
      include: {
        customer: true,
        sessions: { include: { staffs: true } },
        orders: true,
      },
    });
  }

  /**
   * Add service to booking
   */
  async addService(
    bookingId: string,
    serviceId: string,
    price: number,
    quantity = 1,
  ) {
    return this.db.bookingService.upsert({
      where: {
        bookingId_serviceId: {
          bookingId,
          serviceId,
        },
      },
      create: {
        bookingId,
        serviceId,
        price,
        quantity,
      },
      update: {
        price,
        quantity,
      },
      include: { service: true },
    });
  }

  /**
   * Remove service from booking
   */
  async removeService(bookingId: string, serviceId: string) {
    return this.db.bookingService.delete({
      where: {
        bookingId_serviceId: {
          bookingId,
          serviceId,
        },
      },
    });
  }

  /**
   * Add package to booking
   */
  async addPackage(
    bookingId: string,
    packageId: string,
    price: number,
    quantity = 1,
  ) {
    return this.db.bookingPackage.upsert({
      where: {
        bookingId_packageId: {
          bookingId,
          packageId,
        },
      },
      create: {
        bookingId,
        packageId,
        price,
        quantity,
      },
      update: {
        price,
        quantity,
      },
      include: { package: true },
    });
  }

  /**
   * Create booking session
   */
  async createSession(bookingId: string, sessionData: Partial<any>) {
    return this.db.bookingSession.create({
      data: {
        ...sessionData,
        bookingId,
      } as any,
      include: {
        staffs: { include: { staff: true } },
        services: { include: { service: true } },
      },
    });
  }

  /**
   * Update booking total price and status
   */
  async updateFinancialStatus(
    bookingId: string,
    totalPrice: number,
    status?: string,
  ) {
    const data: any = { totalPrice };
    if (status) data.status = status;

    return this.db.booking.update({
      where: { id: bookingId },
      data,
      include: { orders: true },
    });
  }

  /**
   * Cancel booking with cleanup
   */
  async cancel(bookingId: string) {
    return this.db.$transaction(async (tx) => {
      // Cancel booking
      const booking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      // Cancel related sessions
      await tx.bookingSession.updateMany({
        where: { bookingId },
        data: {
          status: 'CANCELLED',
        },
      });

      return booking;
    });
  }

  /**
   * Get booking statistics
   */
  async getStatistics(customerId?: string) {
    const where: any = {};
    if (customerId) where.customerId = customerId;

    const [total, pending, confirmed, completed, cancelled] = await Promise.all(
      [
        this.db.booking.count({ where }),
        this.db.booking.count({ where: { ...where, status: 'PENDING' } }),
        this.db.booking.count({ where: { ...where, status: 'CONFIRMED' } }),
        this.db.booking.count({ where: { ...where, status: 'COMPLETED' } }),
        this.db.booking.count({ where: { ...where, status: 'CANCELLED' } }),
      ],
    );

    const revenue = await this.db.booking.aggregate({
      where,
      _sum: { totalPrice: true },
    });

    return {
      total,
      byStatus: {
        pending,
        confirmed,
        completed,
        cancelled,
      },
      totalRevenue: revenue._sum.totalPrice || 0,
    };
  }
}
