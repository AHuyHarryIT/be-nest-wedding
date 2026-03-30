import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { OrdersService } from './orders.service';
import { CheckoutDto, PayRemainingDto } from './dto';
import { MomoPaymentResponse } from '../payments/momo.service';
import {
  MomoIPNCallbackDto,
  MomoIPNResponseDto,
} from '../payments/dto/momo-callback.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @RequirePermissions('orders:create')
  @ApiOperation({
    summary: 'Create order for booking checkout',
    description:
      'First-time checkout: creates order, optionally pays deposit (min 30%). Second-time checkout: pays remaining balance.',
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    schema: {
      example: {
        bookingId: 'uuid',
        totalPrice: 10000000,
        depositAmount: 3000000,
        remainingAmount: 7000000,
        depositPaid: 3000000,
        remainingPaid: 0,
        status: 'PARTIAL',
        payments: [],
        summary: {
          totalPrice: 10000000,
          depositAmount: 3000000,
          remainingAmount: 7000000,
          depositPaid: 3000000,
          remainingPaid: 0,
          totalPaid: 3000000,
          isPaid: false,
          pendingAmount: 7000000,
        },
      },
    },
  })
  async checkout(@Body() checkoutDto: CheckoutDto) {
    return this.ordersService.checkout(checkoutDto);
  }

  @Post(':bookingId/pay-remaining')
  @RequirePermissions('orders:update')
  @ApiOperation({
    summary: 'Pay remaining balance for order',
    description: 'Submit payment for remaining balance (second checkout)',
  })
  @ApiParam({ name: 'bookingId', type: String, description: 'Booking ID' })
  @ApiResponse({
    status: 201,
    description: 'Remaining payment processed successfully',
  })
  async payRemaining(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() payRemainingDto: PayRemainingDto,
  ) {
    return this.ordersService.payRemaining(bookingId, payRemainingDto);
  }

  @Get()
  @RequirePermissions('orders:read')
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async findAll() {
    return this.ordersService.findAll();
  }

  @Get(':bookingId')
  @RequirePermissions('orders:read')
  @ApiOperation({ summary: 'Get order by booking ID' })
  @ApiParam({ name: 'bookingId', type: String, description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  async findOne(@Param('bookingId', ParseUUIDPipe) bookingId: string) {
    return this.ordersService.findOneByBookingId(bookingId);
  }

  @Get(':bookingId/status')
  @RequirePermissions('orders:read')
  @ApiOperation({ summary: 'Get order payment status' })
  @ApiParam({ name: 'bookingId', type: String, description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Order status retrieved' })
  async getOrderStatus(@Param('bookingId', ParseUUIDPipe) bookingId: string) {
    return this.ordersService.getOrderStatus(bookingId);
  }

  @Post(':bookingId/momo/initiate')
  @RequirePermissions('orders:update')
  @ApiOperation({
    summary: 'Initiate MOMO payment for E-WALLET',
    description: 'Create a MOMO payment request for checkout via E-WALLET',
  })
  @ApiParam({ name: 'bookingId', type: String, description: 'Booking ID' })
  @ApiResponse({
    status: 201,
    description: 'MOMO payment initiated successfully',
  })
  async initiateMomoPayment(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() body: { paymentId: string; redirectUrl?: string },
  ): Promise<MomoPaymentResponse> {
    return this.ordersService.initiateMomoPayment(
      bookingId,
      body.paymentId,
      body.redirectUrl,
    );
  }

  @Post('momo/check-status')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check MOMO payment status',
    description:
      'Query the payment status from Momo server. ' +
      'Can be used by frontend to poll for payment confirmation if IPN is delayed. ' +
      'Complements the IPN callback mechanism.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved from Momo',
  })
  async checkMomoPaymentStatus(
    @Body() body: { orderId: string },
  ): Promise<any> {
    return this.ordersService.checkMomoPaymentStatus(body.orderId);
  }

  @Post('momo/callback')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'MOMO IPN payment callback',
    description:
      'Webhook endpoint for MOMO IPN (Instant Payment Notification). ' +
      'This is called by Momo server after payment processing. ' +
      'Signature verification is performed to ensure request authenticity. ' +
      'Duplicate requests are handled with idempotency checking.',
  })
  @ApiResponse({
    status: 200,
    description: 'Callback received and processed successfully',
    type: MomoIPNResponseDto,
  })
  @ApiResponse({
    status: 200,
    description:
      'Callback received with invalid signature or invalid data (returns resultCode=1)',
  })
  async momoCallback(
    @Body() callbackData: MomoIPNCallbackDto,
  ): Promise<MomoIPNResponseDto> {
    return this.ordersService.handleMomoCallback(callbackData);
  }
}
