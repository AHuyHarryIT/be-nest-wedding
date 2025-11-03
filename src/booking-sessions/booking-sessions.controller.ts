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
import { BookingSessionsService } from './booking-sessions.service';
import {
  CreateBookingSessionDto,
  UpdateBookingSessionDto,
  ViewBookingSessionDto,
  QueryBookingSessionDto,
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
  ApiErrorResponse,
} from '../common';

@ApiTags('Booking Sessions')
@ApiExtraModels(
  ViewBookingSessionDto,
  CreateBookingSessionDto,
  UpdateBookingSessionDto,
  QueryBookingSessionDto,
)
@Controller('booking-sessions')
export class BookingSessionsController {
  constructor(
    private readonly bookingSessionsService: BookingSessionsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('booking-sessions:create')
  @ApiOperation({ summary: 'Create a new booking session' })
  @ApiCreatedSuccessResponse({
    description: 'Booking session created successfully',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiErrorResponse()
  async create(@Body() createDto: CreateBookingSessionDto) {
    const session = await this.bookingSessionsService.create(createDto);
    return ResponseBuilder.created(
      session,
      'Booking session created successfully',
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all booking sessions' })
  @ApiPaginatedResponse(ViewBookingSessionDto, {
    description: 'Paginated list of booking sessions',
  })
  @ApiErrorResponse()
  async findAll(@Query() query: QueryBookingSessionDto) {
    const result = await this.bookingSessionsService.findAll(query);
    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Booking sessions retrieved successfully',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking session by ID' })
  @ApiStandardResponse(ViewBookingSessionDto)
  @ApiNotFoundResponse()
  async findOne(@Param('id') id: string) {
    const session = await this.bookingSessionsService.findOne(id);
    return ResponseBuilder.success(
      session,
      'Booking session retrieved successfully',
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('booking-sessions:update')
  @ApiOperation({ summary: 'Update a booking session' })
  @ApiUpdatedSuccessResponse()
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBookingSessionDto,
  ) {
    const session = await this.bookingSessionsService.update(id, updateDto);
    return ResponseBuilder.updated(
      session,
      'Booking session updated successfully',
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('booking-sessions:delete')
  @ApiOperation({ summary: 'Delete a booking session' })
  @ApiDeletedSuccessResponse()
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async remove(@Param('id') id: string) {
    await this.bookingSessionsService.remove(id);
    return ResponseBuilder.deleted('Booking session deleted successfully');
  }
}
