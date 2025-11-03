import { Injectable } from '@nestjs/common';
import { CreateBookingSessionDto } from './dto/create-booking-session.dto';
import { UpdateBookingSessionDto } from './dto/update-booking-session.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class BookingSessionsService {
  constructor(private readonly databaseService: DatabaseService) {}

  create(createBookingSessionDto: CreateBookingSessionDto) {
    return this.databaseService.bookingSession.create({
      data: {
        ...createBookingSessionDto,
        startsAt: new Date(createBookingSessionDto.startsAt),
        endsAt: new Date(createBookingSessionDto.endsAt),
      },
      include: {
        booking: true,
      },
    });
  }

  findAll() {
    return this.databaseService.bookingSession.findMany({
      include: {
        booking: true,
        staffs: true,
        services: true,
      },
      orderBy: { startsAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const session = await this.databaseService.bookingSession.findUnique({
      where: { id },
      include: {
        booking: true,
        staffs: true,
        services: true,
        inventoryReservations: true,
      },
    });

    if (!session) {
      throw new Error('Booking session not found');
    }

    return session;
  }

  update(id: string, updateBookingSessionDto: UpdateBookingSessionDto) {
    const data: any = { ...updateBookingSessionDto };
    if (updateBookingSessionDto.startsAt) {
      data.startsAt = new Date(updateBookingSessionDto.startsAt);
    }
    if (updateBookingSessionDto.endsAt) {
      data.endsAt = new Date(updateBookingSessionDto.endsAt);
    }
    return this.databaseService.bookingSession.update({
      where: { id },
      data,
      include: {
        booking: true,
      },
    });
  }

  remove(id: string) {
    return this.databaseService.bookingSession.delete({ where: { id } });
  }
}
