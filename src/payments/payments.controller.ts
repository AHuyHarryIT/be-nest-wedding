import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequirePermissions('payments:create')
  @ApiOperation({ summary: 'Create a new payment transaction' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Get(':id/status')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Get payment status for polling' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  getStatus(@Param('id') id: string) {
    return this.paymentsService.getPaymentStatus(id);
  }

  @Get(':id/details')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Get detailed payment information' })
  @ApiResponse({ status: 200, description: 'Payment details retrieved' })
  getDetails(@Param('id') id: string) {
    return this.paymentsService.getPaymentDetails(id);
  }

  @Get(':id/attempts')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Get payment attempts history' })
  @ApiResponse({ status: 200, description: 'Payment attempts retrieved' })
  getAttempts(@Param('id') id: string) {
    return this.paymentsService.getPaymentAttempts(id);
  }

  @Patch(':id')
  @RequirePermissions('payments:update')
  @ApiOperation({ summary: 'Update a payment' })
  @ApiResponse({ status: 200, description: 'Payment updated successfully' })
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Post(':id/cancel')
  @RequirePermissions('payments:update')
  @ApiOperation({ summary: 'Cancel a payment' })
  @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  cancel(@Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.paymentsService.cancel(id, body?.reason);
  }

  @Delete(':id')
  @RequirePermissions('payments:refund')
  @ApiOperation({ summary: 'Delete a payment record' })
  @ApiResponse({ status: 200, description: 'Payment deleted successfully' })
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }
}
