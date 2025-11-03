import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import {
  ApiCreatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiStandardResponse,
  ApiUpdatedSuccessResponse,
  ApiErrorResponse,
} from '../common/decorators/api-response.decorator';
import { ResponseBuilder } from '../common/utils/response-builder.util';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiCreatedSuccessResponse({ description: 'Booking created successfully' })
  @ApiErrorResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createBookingDto: CreateBookingDto) {
    const booking = await this.bookingsService.create(createBookingDto);
    return ResponseBuilder.created(booking, 'Booking created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all bookings' })
  @ApiStandardResponse(Object, {
    description: 'Bookings retrieved successfully',
  })
  async findAll() {
    const bookings = await this.bookingsService.findAll();
    return ResponseBuilder.success(bookings, 'Bookings retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiStandardResponse(Object, {
    description: 'Booking retrieved successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Booking not found' })
  async findOne(@Param('id') id: string) {
    const booking = await this.bookingsService.findOne(id);
    return ResponseBuilder.success(booking, 'Booking retrieved successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a booking' })
  @ApiUpdatedSuccessResponse({ description: 'Booking updated successfully' })
  @ApiErrorResponse({ status: 404, description: 'Booking not found' })
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    const booking = await this.bookingsService.update(id, updateBookingDto);
    return ResponseBuilder.updated(booking, 'Booking updated successfully');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a booking' })
  @ApiDeletedSuccessResponse({ description: 'Booking deleted successfully' })
  @ApiErrorResponse({ status: 404, description: 'Booking not found' })
  async remove(@Param('id') id: string) {
    await this.bookingsService.remove(id);
    return ResponseBuilder.deleted('Booking deleted successfully');
  }
}
