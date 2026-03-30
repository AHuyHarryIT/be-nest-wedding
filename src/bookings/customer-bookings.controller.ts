import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, type AuthenticatedUser } from '../auth/get-user.decorator';
import { ResponseBuilder } from '../common';
import { BookingsService } from './bookings.service';
import { CreateCustomerBookingDto } from './dto';

@ApiTags('Customer Bookings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('customer/bookings')
export class CustomerBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a booking owned by the authenticated customer',
  })
  async create(
    @Body() createBookingDto: CreateCustomerBookingDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const booking = await this.bookingsService.createForCustomer(
      user.userId,
      createBookingDto,
    );

    return ResponseBuilder.created(booking, 'Booking created successfully');
  }
}
