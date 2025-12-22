import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from '../database/database.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createPaymentDto: CreatePaymentDto) {
    // Validate booking exists
    const booking = await this.databaseService.booking.findUnique({
      where: { id: createPaymentDto.bookingId },
    });
    if (!booking) {
      throw new NotFoundException(
        `Booking with ID ${createPaymentDto.bookingId} not found`,
      );
    }

    const data: Prisma.PaymentCreateInput = {
      booking: { connect: { id: createPaymentDto.bookingId } },
      totalAmount: createPaymentDto.totalAmount,
      depositMethod: createPaymentDto.depositMethod,
      depositStatus: createPaymentDto.depositStatus ?? 'PENDING',
      depositAmount: createPaymentDto.depositAmount,
      depositNote: createPaymentDto.depositNote,
      depositTxnId: createPaymentDto.depositTxnId,
      depositAt: new Date(),
    };

    return this.databaseService.payment.create({
      data,
      include: { booking: true },
    });
  }

  async findAll() {
    return this.databaseService.payment.findMany({
      include: { booking: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.databaseService.payment.findUnique({
      where: { id },
      include: { booking: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto) {
    await this.findOne(id);

    const data: Prisma.PaymentUpdateInput = {};
    if (updatePaymentDto.bookingId) {
      data.booking = { connect: { id: updatePaymentDto.bookingId } };
    }
    if (updatePaymentDto.totalAmount !== undefined) {
      data.totalAmount = updatePaymentDto.totalAmount;
    }
    if (updatePaymentDto.depositMethod) {
      data.depositMethod = updatePaymentDto.depositMethod;
    }
    if (updatePaymentDto.depositStatus) {
      data.depositStatus = updatePaymentDto.depositStatus;
    }
    if (updatePaymentDto.depositAmount !== undefined) {
      data.depositAmount = updatePaymentDto.depositAmount;
    }
    if (updatePaymentDto.depositNote !== undefined) {
      data.depositNote = updatePaymentDto.depositNote;
    }
    if (updatePaymentDto.depositTxnId !== undefined) {
      data.depositTxnId = updatePaymentDto.depositTxnId;
    }

    return this.databaseService.payment.update({
      where: { id },
      data,
      include: { booking: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.databaseService.payment.delete({ where: { id } });
  }
}
