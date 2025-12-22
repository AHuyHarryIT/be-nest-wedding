import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, BookingStatus } from 'generated/prisma';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { DatabaseService } from '../database/database.service';
import {
  CreateBookingSessionDto,
  QueryBookingSessionDto,
  UpdateBookingSessionDto,
} from './dto';

@Injectable()
export class BookingSessionsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createBookingSessionDto: CreateBookingSessionDto) {
    // Validate booking exists
    const booking = await this.databaseService.booking.findFirst({
      where: { id: createBookingSessionDto.bookingId, deletedAt: null },
    });
    if (!booking) {
      throw new NotFoundException(
        `Booking with ID ${createBookingSessionDto.bookingId} not found`,
      );
    }

    const data: Prisma.BookingSessionCreateInput = {
      booking: { connect: { id: createBookingSessionDto.bookingId } },
      title: createBookingSessionDto.title,
      locationName: createBookingSessionDto.locationName,
      address: createBookingSessionDto.address,
      startsAt: new Date(createBookingSessionDto.startsAt),
      endsAt: new Date(createBookingSessionDto.endsAt),
      status: createBookingSessionDto.status ?? BookingStatus.PENDING,
    };

    return this.databaseService.bookingSession.create({
      data,
      include: { booking: true },
    });
  }

  async findAll(params?: QueryBookingSessionDto) {
    const paginationParams = PaginationHelper.mergeWithDefaults(params || {});
    const {
      page,
      limit,
      search,
      sortBy = 'startsAt',
      sortOrder,
    } = paginationParams;

    const { bookingId, status, includeBooking, includeStaff, includeServices } =
      params || {};

    const where: Prisma.BookingSessionWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { locationName: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (bookingId) where.bookingId = bookingId;
    if (status) where.status = status;

    const include: Prisma.BookingSessionInclude = {};
    if (includeBooking) include.booking = true;
    if (includeStaff) include.staffs = { include: { staff: true } };
    if (includeServices) include.services = { include: { service: true } };

    const orderBy: Prisma.BookingSessionOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const total = await this.databaseService.bookingSession.count({ where });
    const sessions = await this.databaseService.bookingSession.findMany({
      where,
      include,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(
      sessions,
      page,
      limit,
      total,
    );
  }

  async findOne(id: string) {
    const session = await this.databaseService.bookingSession.findUnique({
      where: { id },
      include: {
        booking: true,
        staffs: { include: { staff: true } },
        services: { include: { service: true } },
        inventoryReservations: { include: { product: true } },
      },
    });

    if (!session) {
      throw new NotFoundException(`Booking session with ID ${id} not found`);
    }

    return session;
  }

  async update(id: string, updateBookingSessionDto: UpdateBookingSessionDto) {
    await this.findOne(id);

    const data: Prisma.BookingSessionUpdateInput = {};
    if (updateBookingSessionDto.bookingId)
      data.booking = { connect: { id: updateBookingSessionDto.bookingId } };
    if (updateBookingSessionDto.title)
      data.title = updateBookingSessionDto.title;
    if (updateBookingSessionDto.locationName !== undefined)
      data.locationName = updateBookingSessionDto.locationName;
    if (updateBookingSessionDto.address !== undefined)
      data.address = updateBookingSessionDto.address;
    if (updateBookingSessionDto.startsAt)
      data.startsAt = new Date(updateBookingSessionDto.startsAt);
    if (updateBookingSessionDto.endsAt)
      data.endsAt = new Date(updateBookingSessionDto.endsAt);
    if (updateBookingSessionDto.status)
      data.status = updateBookingSessionDto.status;

    return this.databaseService.bookingSession.update({
      where: { id },
      data,
      include: { booking: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.databaseService.bookingSession.delete({ where: { id } });
  }
}
