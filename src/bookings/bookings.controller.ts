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
  QueryBookingDto,
  ViewBookingDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, type AuthenticatedUser } from '../auth/get-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import {
  ResponseBuilder,
  ApiCreatedSuccessResponse,
  ApiStandardResponse,
  ApiPaginatedResponse,
  ApiUpdatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
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
  @ApiErrorResponse()
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const booking = await this.bookingsService.create(
      createBookingDto,
      user.userId,
    );
    return ResponseBuilder.created(booking, 'Booking created successfully');
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all bookings with pagination' })
  @ApiPaginatedResponse(ViewBookingDto, {
    description: 'Paginated list of bookings',
  })
  @ApiUnauthorizedResponse()
  @ApiErrorResponse()
  async findAll(
    @Query() query: QueryBookingDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const result = await this.bookingsService.findAll(query, user.userId);
    if (
      typeof result === 'object' &&
      'data' in result &&
      'pagination' in result
    ) {
      return ResponseBuilder.paginated(
        result.data,
        result.pagination,
        'Bookings retrieved successfully',
      );
    }
    return ResponseBuilder.success(result, 'Bookings retrieved successfully');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiStandardResponse(ViewBookingDto, {
    description: 'Booking found successfully',
  })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findOne(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    const booking = await this.bookingsService.findOne(id, user.userId);
    return ResponseBuilder.success(booking, 'Booking retrieved successfully');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('bookings:update')
  @ApiOperation({ summary: 'Update a booking by ID' })
  @ApiUpdatedSuccessResponse({ description: 'Booking updated successfully' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
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
  @ApiNotFoundResponse()
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
  @ApiUpdatedSuccessResponse({ description: 'Booking restored successfully' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async restore(@Param('id') id: string) {
    const booking = await this.bookingsService.restore(id);
    return ResponseBuilder.updated(booking, 'Booking restored successfully');
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('bookings:update')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiUpdatedSuccessResponse({ description: 'Booking cancelled successfully' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async cancel(@Param('id') id: string) {
    const booking = await this.bookingsService.cancelBooking(id);
    return ResponseBuilder.updated(booking, 'Booking cancelled successfully');
  }

  @Patch(':id/confirm')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('bookings:update')
  @ApiOperation({ summary: 'Confirm a booking' })
  @ApiUpdatedSuccessResponse({ description: 'Booking confirmed successfully' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async confirm(@Param('id') id: string) {
    const booking = await this.bookingsService.confirmBooking(id);
    return ResponseBuilder.updated(booking, 'Booking confirmed successfully');
  }
}
