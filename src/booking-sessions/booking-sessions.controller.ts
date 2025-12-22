import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BookingSessionsService } from './booking-sessions.service';
import { CreateBookingSessionDto } from './dto/create-booking-session.dto';
import { UpdateBookingSessionDto } from './dto/update-booking-session.dto';

@Controller('booking-sessions')
export class BookingSessionsController {
  constructor(
    private readonly bookingSessionsService: BookingSessionsService,
  ) {}

  @Post()
  create(@Body() createBookingSessionDto: CreateBookingSessionDto) {
    return this.bookingSessionsService.create(createBookingSessionDto);
  }

  @Get()
  findAll() {
    return this.bookingSessionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingSessionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBookingSessionDto: UpdateBookingSessionDto,
  ) {
    return this.bookingSessionsService.update(id, updateBookingSessionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingSessionsService.remove(id);
  }
}
