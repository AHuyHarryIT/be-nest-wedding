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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiExtraModels,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import {
  CreateBookingDto,
  UpdateBookingDto,
  ViewBookingDto,
  QueryBookingDto,
} from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import {
  ResponseBuilder,
  ApiCreatedSuccessResponse,
  ApiUpdatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiPaginatedResponse,
  ApiStandardResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiErrorResponse,
} from '../common';

@ApiTags('Bookings')
@ApiExtraModels(
  ViewBookingDto,
  CreateBookingDto,
  UpdateBookingDto,
  QueryBookingDto,
)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('bookings:create')
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiCreatedSuccessResponse({ description: 'Booking created successfully' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiErrorResponse({ description: 'Error occurred while creating booking' })
  async create(@Body() createBookingDto: CreateBookingDto) {
    const booking = await this.bookingsService.create(createBookingDto);
    return ResponseBuilder.created(booking, 'Booking created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all bookings with pagination' })
  @ApiPaginatedResponse(ViewBookingDto, {
    description: 'Paginated list of bookings',
  })
  @ApiErrorResponse({ description: 'Error occurred while retrieving bookings' })
  async findAll(@Query() query: QueryBookingDto) {
    const result = await this.bookingsService.findAll(query);
    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Bookings retrieved successfully',
    );
  }

  @Get('deleted')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('bookings:read')
  @ApiOperation({ summary: 'Get all deleted bookings' })
  @ApiPaginatedResponse(ViewBookingDto, {
    description: 'Paginated list of deleted bookings',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findDeleted(@Query() query: QueryBookingDto) {
    const result = await this.bookingsService.findDeleted(query);
    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Deleted bookings retrieved successfully',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiStandardResponse(ViewBookingDto, {
    description: 'Booking found successfully',
  })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  async findOne(@Param('id') id: string) {
    const booking = await this.bookingsService.findOne(id);
    return ResponseBuilder.success(booking, 'Booking retrieved successfully');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('bookings:update')
  @ApiOperation({ summary: 'Update a booking by ID' })
  @ApiUpdatedSuccessResponse({ description: 'Booking updated successfully' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    const booking = await this.bookingsService.update(id, updateBookingDto);
    return ResponseBuilder.updated(booking, 'Booking updated successfully');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('bookings:delete')
  @ApiOperation({ summary: 'Soft delete a booking by ID' })
  @ApiDeletedSuccessResponse({ description: 'Booking deleted successfully' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async remove(@Param('id') id: string) {
    await this.bookingsService.remove(id);
    return ResponseBuilder.deleted('Booking deleted successfully');
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('bookings:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted booking' })
  @ApiUpdatedSuccessResponse({
    description: 'Booking restored successfully',
  })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async restore(@Param('id') id: string) {
    const booking = await this.bookingsService.restore(id);
    return ResponseBuilder.updated(booking, 'Booking restored successfully');
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('bookings:hard-delete')
  @ApiOperation({ summary: 'Permanently delete a booking by ID' })
  @ApiDeletedSuccessResponse({ description: 'Booking permanently deleted' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async hardDelete(@Param('id') id: string) {
    await this.bookingsService.hardDelete(id);
    return ResponseBuilder.deleted('Booking permanently deleted');
  }
}
