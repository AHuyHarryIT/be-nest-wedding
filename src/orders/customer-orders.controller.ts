import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, type AuthenticatedUser } from '../auth/get-user.decorator';
import { ResponseBuilder } from '../common';
import { OrdersService } from './orders.service';

@ApiTags('Customer Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('customer/orders')
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post(':bookingId/deposit')
  @ApiOperation({
    summary: 'Initiate a customer deposit payment for an owned booking',
  })
  async checkoutDeposit(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @GetUser() user: AuthenticatedUser,
    @Body() body?: { redirectUrl?: string },
  ) {
    const result = await this.ordersService.customerCheckoutDeposit(
      bookingId,
      user.userId,
      body?.redirectUrl,
    );

    return ResponseBuilder.created(
      result,
      'Deposit payment initiated successfully',
    );
  }
}
