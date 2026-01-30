import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { BaseRepository } from './base.repository';

/**
 * Payment Repository - Handles all payment data operations
 * Encapsulates complex payment queries and transactions
 */
@Injectable()
export class PaymentRepository extends BaseRepository<any> {
  constructor(protected db: DatabaseService) {
    super(db);
    this.modelName = 'payment';
  }

  /**
   * Find payment by ID with full relationships
   */
  async findByIdWithDetails(paymentId: string) {
    return this.db.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            booking: true,
          },
        },
        attempts: {
          include: {
            gatewayTransaction: true,
          },
          orderBy: { attemptNumber: 'asc' },
        },
        gatewayTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Find payments for an order with pagination
   */
  async findByOrderId(
    orderId: string,
    params?: { skip?: number; take?: number },
  ) {
    return this.db.payment.findMany({
      where: { orderId },
      include: {
        attempts: {
          orderBy: { attemptNumber: 'asc' },
        },
        gatewayTransactions: true,
      },
      orderBy: { paymentSequence: 'asc' },
      ...params,
    });
  }

  /**
   * Find payments by status with pagination
   */
  async findByStatus(
    status: string,
    params?: { skip?: number; take?: number; orderBy?: any },
  ) {
    return this.db.payment.findMany({
      where: { status: status as any },
      include: {
        order: {
          include: { booking: true },
        },
        attempts: true,
      },
      ...params,
    });
  }

  /**
   * Get payment statistics
   */
  async getStatistics(where?: any) {
    const [total, successful, failed, pending] = await Promise.all([
      this.db.payment.count({ where }),
      this.db.payment.count({ where: { ...where, status: 'SUCCESSFUL' } }),
      this.db.payment.count({ where: { ...where, status: 'FAILED' } }),
      this.db.payment.count({ where: { ...where, status: 'PENDING' } }),
    ]);

    const totalAmount = await this.db.payment.aggregate({
      where,
      _sum: { amount: true },
    });

    const successfulAmount = await this.db.payment.aggregate({
      where: { ...where, status: 'SUCCESSFUL' },
      _sum: { amount: true },
    });

    return {
      total,
      successful,
      failed,
      pending,
      totalAmount: totalAmount._sum.amount || 0,
      successfulAmount: successfulAmount._sum.amount || 0,
    };
  }

  /**
   * Find overdue payments
   */
  async findOverduePayments(params?: { skip?: number; take?: number }) {
    const now = new Date();
    return this.db.payment.findMany({
      where: {
        dueDate: { lt: now },
        status: { in: ['PENDING', 'PARTIAL_PAID'] },
      },
      include: {
        order: { include: { booking: true } },
        attempts: true,
      },
      orderBy: { dueDate: 'asc' },
      ...params,
    });
  }

  /**
   * Create payment with attempt tracking
   */
  async createWithAttempt(paymentData: any, attemptData?: any) {
    return this.db.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: paymentData,
        include: { attempts: true },
      });

      if (attemptData) {
        const attempt = await tx.paymentAttempt.create({
          data: {
            ...attemptData,
            paymentId: payment.id,
          },
        });
        return { ...payment, attempts: [attempt] };
      }

      return payment;
    });
  }

  /**
   * Update payment status with validation
   */
  async updateStatus(
    paymentId: string,
    newStatus: string,
    data?: Partial<any>,
  ) {
    return this.db.payment.update({
      where: { id: paymentId },
      data: {
        status: newStatus as any,
        ...data,
        updatedAt: new Date(),
      },
      include: {
        attempts: true,
        order: true,
      },
    });
  }

  /**
   * Increment attempt count
   */
  async incrementAttemptCount(paymentId: string) {
    return this.db.payment.update({
      where: { id: paymentId },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
  }

  /**
   * Find payments due for retry
   */
  async findDueForRetry(
    maxAttempts = 5,
    params?: { skip?: number; take?: number },
  ) {
    return this.db.payment.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        attemptCount: { lt: maxAttempts },
        lastAttemptAt: {
          lt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        },
      },
      include: {
        attempts: { take: 1, orderBy: { createdAt: 'desc' } },
        order: true,
      },
      ...params,
    });
  }

  /**
   * Find payment sequence for an order
   */
  async getNextPaymentSequence(orderId: string): Promise<number> {
    const lastPayment = await this.db.payment.findFirst({
      where: { orderId },
      orderBy: { paymentSequence: 'desc' },
      select: { paymentSequence: true },
    });

    return (lastPayment?.paymentSequence || 0) + 1;
  }

  /**
   * Get payment with attempts and gateway transactions
   */
  async findWithTransactions(paymentId: string) {
    return this.db.payment.findUnique({
      where: { id: paymentId },
      include: {
        attempts: {
          include: {
            gatewayTransaction: true,
          },
        },
        gatewayTransactions: {
          include: {
            attempts: true,
          },
        },
      },
    });
  }
}
