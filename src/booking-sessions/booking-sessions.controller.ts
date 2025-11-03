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
import { BookingSessionsService } from './booking-sessions.service';
import { CreateBookingSessionDto } from './dto/create-booking-session.dto';
import { UpdateBookingSessionDto } from './dto/update-booking-session.dto';
import {
  ApiCreatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiStandardResponse,
  ApiUpdatedSuccessResponse,
  ApiErrorResponse,
} from '../common/decorators/api-response.decorator';
import { ResponseBuilder } from '../common/utils/response-builder.util';

@ApiTags('Booking Sessions')
@Controller('booking-sessions')
export class BookingSessionsController {
  constructor(
    private readonly bookingSessionsService: BookingSessionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking session' })
  @ApiCreatedSuccessResponse({
    description: 'Booking session created successfully',
  })
  @ApiErrorResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createBookingSessionDto: CreateBookingSessionDto) {
    const session = await this.bookingSessionsService.create(
      createBookingSessionDto,
    );
    return ResponseBuilder.created(
      session,
      'Booking session created successfully',
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all booking sessions' })
  @ApiStandardResponse(Object, {
    description: 'Booking sessions retrieved successfully',
  })
  async findAll() {
    const sessions = await this.bookingSessionsService.findAll();
    return ResponseBuilder.success(
      sessions,
      'Booking sessions retrieved successfully',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking session by ID' })
  @ApiStandardResponse(Object, {
    description: 'Booking session retrieved successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Booking session not found' })
  async findOne(@Param('id') id: string) {
    const session = await this.bookingSessionsService.findOne(id);
    return ResponseBuilder.success(
      session,
      'Booking session retrieved successfully',
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a booking session' })
  @ApiUpdatedSuccessResponse({
    description: 'Booking session updated successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Booking session not found' })
  async update(
    @Param('id') id: string,
    @Body() updateBookingSessionDto: UpdateBookingSessionDto,
  ) {
    const session = await this.bookingSessionsService.update(
      id,
      updateBookingSessionDto,
    );
    return ResponseBuilder.updated(
      session,
      'Booking session updated successfully',
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a booking session' })
  @ApiDeletedSuccessResponse({
    description: 'Booking session deleted successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Booking session not found' })
  async remove(@Param('id') id: string) {
    await this.bookingSessionsService.remove(id);
    return ResponseBuilder.deleted('Booking session deleted successfully');
  }
}
