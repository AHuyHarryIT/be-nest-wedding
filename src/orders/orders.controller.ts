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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import {
  ApiCreatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiStandardResponse,
  ApiUpdatedSuccessResponse,
  ApiErrorResponse,
} from '../common/decorators/api-response.decorator';
import { ResponseBuilder } from '../common/utils/response-builder.util';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiCreatedSuccessResponse({ description: 'Order created successfully' })
  @ApiErrorResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);
    return ResponseBuilder.created(order, 'Order created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiStandardResponse(Object, { description: 'Orders retrieved successfully' })
  async findAll() {
    const orders = await this.ordersService.findAll();
    return ResponseBuilder.success(orders, 'Orders retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  @ApiStandardResponse(Object, { description: 'Order retrieved successfully' })
  @ApiErrorResponse({ status: 404, description: 'Order not found' })
  async findOne(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    return ResponseBuilder.success(order, 'Order retrieved successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an order' })
  @ApiUpdatedSuccessResponse({ description: 'Order updated successfully' })
  @ApiErrorResponse({ status: 404, description: 'Order not found' })
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    const order = await this.ordersService.update(id, updateOrderDto);
    return ResponseBuilder.updated(order, 'Order updated successfully');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an order' })
  @ApiDeletedSuccessResponse({ description: 'Order deleted successfully' })
  @ApiErrorResponse({ status: 404, description: 'Order not found' })
  async remove(@Param('id') id: string) {
    await this.ordersService.remove(id);
    return ResponseBuilder.deleted('Order deleted successfully');
  }
}
