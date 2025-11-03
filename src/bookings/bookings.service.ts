import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class BookingsService {
  constructor(private readonly databaseService: DatabaseService) {}

  create(createBookingDto: CreateBookingDto) {
    return this.databaseService.booking.create({
      data: {
        ...createBookingDto,
        eventDate: new Date(createBookingDto.eventDate),
      },
      include: {
        customer: true,
        package: true,
      },
    });
  }

  findAll() {
    return this.databaseService.booking.findMany({
      include: {
        customer: true,
        package: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const booking = await this.databaseService.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        package: true,
        sessions: true,
        albums: true,
        orders: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  update(id: string, updateBookingDto: UpdateBookingDto) {
    const data: any = { ...updateBookingDto };
    if (updateBookingDto.eventDate) {
      data.eventDate = new Date(updateBookingDto.eventDate);
    }
    return this.databaseService.booking.update({
      where: { id },
      data,
      include: {
        customer: true,
        package: true,
      },
    });
  }

  remove(id: string) {
    return this.databaseService.booking.delete({ where: { id } });
  }
}
