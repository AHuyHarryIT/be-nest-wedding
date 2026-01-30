import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { BaseRepository } from './base.repository';

/**
 * Refund Repository - Handles all refund data operations
 * Manages refund lifecycle and attempt tracking
 */
@Injectable()
export class RefundRepository extends BaseRepository<any> {
  constructor(protected db: DatabaseService) {
    super(db);
    this.modelName = 'refund';
  }

  /**
   * Find refund by ID with details
   */
  async findByIdWithDetails(refundId: string) {
    return this.db.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: { booking: true },
        },
        attempts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Find refunds by order ID
   */
  async findByOrderId(
    orderId: string,
    params?: { skip?: number; take?: number },
  ) {
    return this.db.refund.findMany({
      where: { orderId },
      include: {
        attempts: {
          orderBy: { attemptNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...params,
    });
  }

  /**
   * Find refunds by status
   */
  async findByStatus(
    status: string,
    params?: { skip?: number; take?: number },
  ) {
    return this.db.refund.findMany({
      where: { status: status as any },
      include: {
        order: { include: { booking: true } },
        attempts: true,
      },
      orderBy: { createdAt: 'desc' },
      ...params,
    });
  }

  /**
   * Get next refund sequence for order
   */
  async getNextRefundSequence(orderId: string): Promise<number> {
    const lastRefund = await this.db.refund.findFirst({
      where: { orderId },
      orderBy: { refundSequence: 'desc' },
      select: { refundSequence: true },
    });

    return (lastRefund?.refundSequence || 0) + 1;
  }

  /**
   * Find refunds due for processing
   */
  async findDueForProcessing(params?: { skip?: number; take?: number }) {
    return this.db.refund.findMany({
      where: {
        status: { in: ['INITIATED', 'PROCESSING'] },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
      },
      include: {
        order: { include: { booking: true } },
        attempts: true,
      },
      orderBy: { createdAt: 'asc' },
      ...params,
    });
  }

  /**
   * Update refund status
   */
  async updateStatus(refundId: string, newStatus: string, data?: Partial<any>) {
    return this.db.refund.update({
      where: { id: refundId },
      data: {
        status: newStatus as any,
        ...data,
      },
      include: { attempts: true, order: true },
    });
  }

  /**
   * Get refund statistics
   */
  async getStatistics(orderId?: string) {
    const where: any = {};
    if (orderId) where.orderId = orderId;

    const [total, initiated, processing, successful, failed] =
      await Promise.all([
        this.db.refund.count({ where }),
        this.db.refund.count({ where: { ...where, status: 'INITIATED' } }),
        this.db.refund.count({ where: { ...where, status: 'PROCESSING' } }),
        this.db.refund.count({ where: { ...where, status: 'SUCCESSFUL' } }),
        this.db.refund.count({ where: { ...where, status: 'FAILED' } }),
      ]);

    const totalAmount = await this.db.refund.aggregate({
      where,
      _sum: { amount: true },
    });

    const successfulAmount = await this.db.refund.aggregate({
      where: { ...where, status: 'SUCCESSFUL' },
      _sum: { amount: true },
    });

    return {
      total,
      byStatus: { initiated, processing, successful, failed },
      totalAmount: totalAmount._sum.amount || 0,
      successfulAmount: successfulAmount._sum.amount || 0,
    };
  }
}
