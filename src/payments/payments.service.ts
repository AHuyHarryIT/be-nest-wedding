import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from '../database/database.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createPaymentDto: CreatePaymentDto) {
    // Validate order exists
    const order = await this.databaseService.order.findUnique({
      where: { bookingId: createPaymentDto.bookingId },
    });
    if (!order) {
      throw new NotFoundException(
        `Order for booking ${createPaymentDto.bookingId} not found`,
      );
    }

    const data: Prisma.PaymentCreateInput = {
      order: { connect: { id: order.id } },
      amount: createPaymentDto.amount,
      method: createPaymentDto.method,
      status: createPaymentDto.status ?? 'PENDING',
      notes: createPaymentDto.note,
    };

    return this.databaseService.payment.create({
      data,
      include: { order: true },
    });
  }

  async findAll() {
    return this.databaseService.payment.findMany({
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.databaseService.payment.findUnique({
      where: { id },
      include: { order: true },
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
      data.order = { connect: { bookingId: updatePaymentDto.bookingId } };
    }
    if (updatePaymentDto.amount !== undefined) {
      data.amount = updatePaymentDto.amount;
    }
    if (updatePaymentDto.method) {
      data.method = updatePaymentDto.method;
    }
    if (updatePaymentDto.status) {
      data.status = updatePaymentDto.status;
    }
    if (updatePaymentDto.note !== undefined) {
      data.notes = updatePaymentDto.note;
    }

    return this.databaseService.payment.update({
      where: { id },
      data,
      include: { order: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.databaseService.payment.delete({ where: { id } });
  }

  /**
   * Find payment by transaction ID (for idempotency checking)
   * NOTE: This now needs to check payment attempts + gateway transactions
   */
  async findByTransactionId(txnId: string) {
    // First try to find the gateway transaction
    const gatewayTransaction =
      await this.databaseService.paymentGatewayTransaction.findFirst({
        where: { gatewayTransactionId: txnId },
        include: {
          payment: {
            include: { order: true },
          },
        },
      });

    if (gatewayTransaction?.payment) {
      return gatewayTransaction.payment;
    }

    return null;
  }

  /**
   * Get payment status for polling (simplified response)
   */
  async getPaymentStatus(id: string) {
    const payment = await this.findOne(id);
    return {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  /**
   * Get detailed payment information with attempts
   */
  async getPaymentDetails(id: string) {
    const payment = await this.databaseService.payment.findUnique({
      where: { id },
      include: {
        order: true,
        attempts: {
          include: { gatewayTransaction: true },
        },
        gatewayTransactions: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  /**
   * Get payment attempts history
   */
  async getPaymentAttempts(id: string) {
    await this.findOne(id);

    const attempts = await this.databaseService.paymentAttempt.findMany({
      where: { paymentId: id },
      include: { gatewayTransaction: true },
      orderBy: { attemptNumber: 'asc' },
    });

    return attempts;
  }

  /**
   * Cancel a payment
   */
  async cancel(id: string, reason?: string) {
    await this.findOne(id);

    return this.databaseService.payment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
      include: { order: true },
    });
  }
}
