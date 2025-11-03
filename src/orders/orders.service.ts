import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createDto: CreateOrderDto) {
    return await this.databaseService.order.create({
      data: {
        bookingId: createDto.bookingId,
        customerId: createDto.customerId,
        totalAmount: createDto.totalAmount || 0,
        status: createDto.status || 'UNPAID',
      },
      include: {
        booking: true,
        customer: true,
      },
    });
  }

  async findAll() {
    return await this.databaseService.order.findMany({
      include: {
        booking: true,
        customer: true,
        payments: true,
      },
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
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }

  async update(id: string, updateDto: UpdateOrderDto) {
    await this.findOne(id);

    return await this.databaseService.order.update({
      where: { id },
      data: updateDto,
      include: {
        booking: true,
        customer: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.databaseService.order.delete({ where: { id } });
  }
}
