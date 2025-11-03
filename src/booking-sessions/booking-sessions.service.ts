import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
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

  async create(createDto: CreateBookingSessionDto) {
    return await this.databaseService.bookingSession.create({
      data: {
        bookingId: createDto.bookingId,
        title: createDto.title,
        locationName: createDto.locationName,
        address: createDto.address,
        startsAt: new Date(createDto.startsAt),
        endsAt: new Date(createDto.endsAt),
        status: createDto.status || 'PENDING',
      },
    });
  }

  async findAll(params?: QueryBookingSessionDto) {
    const paginationParams = PaginationHelper.mergeWithDefaults(params || {});
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder,
    } = paginationParams;
    const { status, bookingId, startsFrom, startsTo } = params || {};

    const where: Prisma.BookingSessionWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { locationName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (bookingId) where.bookingId = bookingId;

    if (startsFrom || startsTo) {
      where.startsAt = {};
      if (startsFrom) where.startsAt.gte = new Date(startsFrom);
      if (startsTo) where.startsAt.lte = new Date(startsTo);
    }

    const orderBy: Prisma.BookingSessionOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };
    const total = await this.databaseService.bookingSession.count({ where });
    const data = await this.databaseService.bookingSession.findMany({
      where,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(data, page, limit, total);
  }

  async findOne(id: string) {
    const session = await this.databaseService.bookingSession.findUnique({
      where: { id },
      include: { booking: true, staffs: true, services: true },
    });

    if (!session) {
      throw new NotFoundException(`Booking session with ID "${id}" not found`);
    }

    return session;
  }

  async update(id: string, updateDto: UpdateBookingSessionDto) {
    await this.findOne(id);

    const updateData: Prisma.BookingSessionUpdateInput = {};

    if (updateDto.title !== undefined) updateData.title = updateDto.title;
    if (updateDto.locationName !== undefined)
      updateData.locationName = updateDto.locationName;
    if (updateDto.address !== undefined) updateData.address = updateDto.address;
    if (updateDto.status !== undefined) updateData.status = updateDto.status;
    if (updateDto.bookingId !== undefined)
      updateData.booking = { connect: { id: updateDto.bookingId } };
    if (updateDto.startsAt) updateData.startsAt = new Date(updateDto.startsAt);
    if (updateDto.endsAt) updateData.endsAt = new Date(updateDto.endsAt);

    return await this.databaseService.bookingSession.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.databaseService.bookingSession.delete({ where: { id } });
  }
}
