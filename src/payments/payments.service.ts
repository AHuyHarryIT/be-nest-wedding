import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createDto: CreatePaymentDto) {
    return await this.databaseService.payment.create({
      data: {
        orderId: createDto.orderId,
        amount: createDto.amount,
        method: createDto.method,
        status: createDto.status || 'PENDING',
        providerTxnId: createDto.providerTxnId,
      },
      include: {
        order: true,
      },
    });
  }

  async findAll() {
    return await this.databaseService.payment.findMany({
      include: {
        order: true,
      },
    });
  }

  async findOne(id: string) {
    const payment = await this.databaseService.payment.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID "${id}" not found`);
    }

    return payment;
  }

  async update(id: string, updateDto: UpdatePaymentDto) {
    await this.findOne(id);

    return await this.databaseService.payment.update({
      where: { id },
      data: updateDto,
      include: {
        order: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.databaseService.payment.delete({ where: { id } });
  }
}
