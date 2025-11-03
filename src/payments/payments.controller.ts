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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {
  ApiCreatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiStandardResponse,
  ApiUpdatedSuccessResponse,
  ApiErrorResponse,
} from '../common/decorators/api-response.decorator';
import { ResponseBuilder } from '../common/utils/response-builder.util';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiCreatedSuccessResponse({ description: 'Payment created successfully' })
  @ApiErrorResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createPaymentDto: CreatePaymentDto) {
    const payment = await this.paymentsService.create(createPaymentDto);
    return ResponseBuilder.created(payment, 'Payment created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments' })
  @ApiStandardResponse(Object, {
    description: 'Payments retrieved successfully',
  })
  async findAll() {
    const payments = await this.paymentsService.findAll();
    return ResponseBuilder.success(payments, 'Payments retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment by ID' })
  @ApiStandardResponse(Object, {
    description: 'Payment retrieved successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Payment not found' })
  async findOne(@Param('id') id: string) {
    const payment = await this.paymentsService.findOne(id);
    return ResponseBuilder.success(payment, 'Payment retrieved successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a payment' })
  @ApiUpdatedSuccessResponse({ description: 'Payment updated successfully' })
  @ApiErrorResponse({ status: 404, description: 'Payment not found' })
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ) {
    const payment = await this.paymentsService.update(id, updatePaymentDto);
    return ResponseBuilder.updated(payment, 'Payment updated successfully');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a payment' })
  @ApiDeletedSuccessResponse({ description: 'Payment deleted successfully' })
  @ApiErrorResponse({ status: 404, description: 'Payment not found' })
  async remove(@Param('id') id: string) {
    await this.paymentsService.remove(id);
    return ResponseBuilder.deleted('Payment deleted successfully');
  }
}
