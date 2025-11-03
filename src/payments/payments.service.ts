import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  create(createPaymentDto: CreatePaymentDto) {
    const data: any = { ...createPaymentDto };
    if (createPaymentDto.paidAt) {
      data.paidAt = new Date(createPaymentDto.paidAt);
    }
    return this.databaseService.payment.create({
      data,
      include: {
        order: true,
      },
    });
  }

  findAll() {
    return this.databaseService.payment.findMany({
      include: {
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.databaseService.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            booking: true,
            customer: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return payment;
  }

  update(id: string, updatePaymentDto: UpdatePaymentDto) {
    const data: any = { ...updatePaymentDto };
    if (updatePaymentDto.paidAt) {
      data.paidAt = new Date(updatePaymentDto.paidAt);
    }
    return this.databaseService.payment.update({
      where: { id },
      data,
      include: {
        order: true,
      },
    });
  }

  remove(id: string) {
    return this.databaseService.payment.delete({ where: { id } });
  }
}
