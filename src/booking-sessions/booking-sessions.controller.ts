import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import { BookingSessionsService } from './booking-sessions.service';
import { CreateBookingSessionDto } from './dto/create-booking-session.dto';
import { UpdateBookingSessionDto } from './dto/update-booking-session.dto';
import { QueryBookingSessionDto } from './dto/query-booking-session.dto';

@ApiTags('Booking Sessions')
@Controller('booking-sessions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class BookingSessionsController {
  constructor(
    private readonly bookingSessionsService: BookingSessionsService,
  ) {}

  @Post()
  @RequirePermissions('bookings:create')
  @ApiOperation({ summary: 'Create a booking session' })
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
  @RequirePermissions('bookings:read')
  @ApiOperation({ summary: 'Get booking sessions with pagination' })
  async findAll(@Query() query: QueryBookingSessionDto) {
    const result = await this.bookingSessionsService.findAll(query);
    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Booking sessions retrieved successfully',
    );
  }

  @Get(':id')
  @RequirePermissions('bookings:read')
  @ApiOperation({ summary: 'Get a booking session by ID' })
  async findOne(@Param('id') id: string) {
    const session = await this.bookingSessionsService.findOne(id);
    return ResponseBuilder.success(
      session,
      'Booking session retrieved successfully',
    );
  }

  @Patch(':id')
  @RequirePermissions('bookings:update')
  @ApiOperation({ summary: 'Update a booking session by ID' })
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
  @RequirePermissions('bookings:delete')
  @ApiOperation({ summary: 'Delete a booking session by ID' })
  async remove(@Param('id') id: string) {
    await this.bookingSessionsService.remove(id);
    return ResponseBuilder.deleted('Booking session deleted successfully');
  }
}
