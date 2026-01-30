import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { BaseRepository } from './base.repository';

/**
 * Payment Attempt Repository - Handles payment attempt tracking
 * Manages retry logic, gateway responses, and attempt history
 */
@Injectable()
export class PaymentAttemptRepository extends BaseRepository<any> {
  constructor(protected db: DatabaseService) {
    super(db);
    this.modelName = 'paymentAttempt';
  }

  /**
   * Find attempt by ID with details
   */
  async findByIdWithDetails(attemptId: string) {
    return this.db.paymentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        payment: {
          include: {
            order: true,
          },
        },
        gatewayTransaction: true,
      },
    });
  }

  /**
   * Find attempts for a payment
   */
  async findByPaymentId(
    paymentId: string,
    params?: { skip?: number; take?: number },
  ) {
    return this.db.paymentAttempt.findMany({
      where: { paymentId },
      include: {
        gatewayTransaction: true,
      },
      orderBy: { attemptNumber: 'asc' },
      ...params,
    });
  }

  /**
   * Find successful attempts
   */
  async findSuccessful(params?: { skip?: number; take?: number }) {
    return this.db.paymentAttempt.findMany({
      where: { status: 'SUCCESS' },
      include: {
        payment: { include: { order: true } },
        gatewayTransaction: true,
      },
      orderBy: { createdAt: 'desc' },
      ...params,
    });
  }

  /**
   * Find failed attempts
   */
  async findFailed(params?: { skip?: number; take?: number }) {
    return this.db.paymentAttempt.findMany({
      where: { status: { in: ['FAILED', 'TIMEOUT'] } },
      include: {
        payment: { include: { order: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...params,
    });
  }

  /**
   * Get next attempt number for payment
   */
  async getNextAttemptNumber(paymentId: string): Promise<number> {
    const lastAttempt = await this.db.paymentAttempt.findFirst({
      where: { paymentId },
      orderBy: { attemptNumber: 'desc' },
      select: { attemptNumber: true },
    });

    return (lastAttempt?.attemptNumber || 0) + 1;
  }

  /**
   * Find attempts pending response from gateway
   */
  async findPendingResponse(
    timeoutMinutes = 15,
    params?: { skip?: number; take?: number },
  ) {
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    return this.db.paymentAttempt.findMany({
      where: {
        status: { in: ['INITIATED', 'IN_PROGRESS'] },
        requestedAt: { lt: cutoffTime },
      },
      include: {
        payment: { include: { order: true } },
        gatewayTransaction: true,
      },
      orderBy: { requestedAt: 'asc' },
      ...params,
    });
  }

  /**
   * Update attempt status
   */
  async updateStatus(
    attemptId: string,
    newStatus: string,
    data?: Partial<any>,
  ) {
    return this.db.paymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: newStatus as any,
        respondedAt: new Date(),
        ...data,
      },
      include: {
        payment: true,
        gatewayTransaction: true,
      },
    });
  }

  /**
   * Get attempt statistics
   */
  async getStatistics(paymentId?: string) {
    const where: any = {};
    if (paymentId) where.paymentId = paymentId;

    const [total, initiated, inProgress, success, failed, timeout] =
      await Promise.all([
        this.db.paymentAttempt.count({ where }),
        this.db.paymentAttempt.count({
          where: { ...where, status: 'INITIATED' },
        }),
        this.db.paymentAttempt.count({
          where: { ...where, status: 'IN_PROGRESS' },
        }),
        this.db.paymentAttempt.count({
          where: { ...where, status: 'SUCCESS' },
        }),
        this.db.paymentAttempt.count({ where: { ...where, status: 'FAILED' } }),
        this.db.paymentAttempt.count({
          where: { ...where, status: 'TIMEOUT' },
        }),
      ]);

    const avgDuration = await this.db.paymentAttempt.aggregate({
      where: { ...where, duration: { not: null } },
      _avg: { duration: true },
    });

    return {
      total,
      byStatus: { initiated, inProgress, success, failed, timeout },
      successRate: total > 0 ? (success / total) * 100 : 0,
      avgDurationMs: avgDuration._avg.duration || 0,
    };
  }
}
