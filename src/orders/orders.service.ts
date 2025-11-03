import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class OrdersService {
  constructor(private readonly databaseService: DatabaseService) {}

  create(createOrderDto: CreateOrderDto) {
    return this.databaseService.order.create({
      data: createOrderDto,
      include: {
        booking: true,
        customer: true,
      },
    });
  }

  findAll() {
    return this.databaseService.order.findMany({
      include: {
        booking: true,
        customer: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.databaseService.order.findUnique({
      where: { id },
      include: {
        booking: true,
        customer: true,
        payments: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  update(id: string, updateOrderDto: UpdateOrderDto) {
    return this.databaseService.order.update({
      where: { id },
      data: updateOrderDto,
      include: {
        booking: true,
        customer: true,
      },
    });
  }

  remove(id: string) {
    return this.databaseService.order.delete({ where: { id } });
  }
}
