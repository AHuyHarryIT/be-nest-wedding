import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import {
  SuccessResponseDto,
  PaginatedResponseDto,
  ErrorResponseDto,
} from '../common/exceptions';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Create a new payment transaction
   */
  @Post()
  @RequirePermissions('payments:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new payment',
    description:
      'Creates a new payment transaction for an order with initial PENDING status',
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid input',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
    type: ErrorResponseDto,
  })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  /**
   * Get all payments with optional filtering and pagination
   */
  @Get()
  @RequirePermissions('payments:read')
  @ApiOperation({
    summary: 'Get all payments',
    description: 'Retrieves paginated list of payments with optional filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved successfully',
    type: PaginatedResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  findAll() {
    return this.paymentsService.findAll();
  }

  /**
   * Get payment by ID
   */
  @Get(':id')
  @RequirePermissions('payments:read')
  @ApiParam({
    name: 'id',
    description: 'Payment ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOperation({
    summary: 'Get payment by ID',
    description:
      'Retrieves detailed payment information including related order',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment retrieved successfully',
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
    type: ErrorResponseDto,
  })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  /**
   * Get payment status
   */
  @Get(':id/status')
  @RequirePermissions('payments:read')
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
  })
  @ApiOperation({
    summary: 'Get payment status',
    description: 'Quick endpoint for polling payment status',
  })
  @ApiResponse({
    status: 200,
    description: 'Status retrieved',
    schema: {
      properties: {
        status: {
          type: 'string',
          enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
        },
        id: { type: 'string' },
      },
    },
  })
  getStatus(@Param('id') id: string) {
    return this.paymentsService.getPaymentStatus(id);
  }

  /**
   * Get payment details with attempts
   */
  @Get(':id/details')
  @RequirePermissions('payments:read')
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
  })
  @ApiOperation({
    summary: 'Get payment details',
    description:
      'Retrieves payment details with related order and all attempts',
  })
  @ApiResponse({
    status: 200,
    description: 'Details retrieved',
    type: SuccessResponseDto,
  })
  getDetails(@Param('id') id: string) {
    return this.paymentsService.getPaymentDetails(id);
  }

  /**
   * Get payment attempts history
   */
  @Get(':id/attempts')
  @RequirePermissions('payments:read')
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
  })
  @ApiOperation({
    summary: 'Get payment attempts',
    description: 'Retrieves list of all payment attempts for tracking',
  })
  @ApiResponse({
    status: 200,
    description: 'Attempts retrieved',
    type: SuccessResponseDto,
  })
  getAttempts(@Param('id') id: string) {
    return this.paymentsService.getPaymentAttempts(id);
  }

  /**
   * Update payment
   */
  @Patch(':id')
  @RequirePermissions('payments:update')
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
  })
  @ApiBody({ type: UpdatePaymentDto })
  @ApiOperation({
    summary: 'Update payment',
    description: 'Updates payment status, description, due date, or notes',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment updated successfully',
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid update request',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
    type: ErrorResponseDto,
  })
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  /**
   * Cancel payment
   */
  @Post(':id/cancel')
  @RequirePermissions('payments:update')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
  })
  @ApiBody({
    schema: {
      properties: {
        reason: { type: 'string', description: 'Cancellation reason' },
      },
    },
  })
  @ApiOperation({
    summary: 'Cancel payment',
    description: 'Cancels a payment transaction',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment cancelled',
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
    type: ErrorResponseDto,
  })
  cancel(@Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.paymentsService.cancel(id, body?.reason);
  }

  /**
   * Delete payment record
   */
  @Delete(':id')
  @RequirePermissions('payments:refund')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
  })
  @ApiOperation({
    summary: 'Delete payment',
    description: 'Deletes a payment record (soft delete)',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment deleted',
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
    type: ErrorResponseDto,
  })
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }
}
