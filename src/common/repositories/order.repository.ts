import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { BaseRepository } from './base.repository';

/**
 * Order Repository - Handles all order data operations
 * Manages order lifecycle, payments, and refunds
 */
@Injectable()
export class OrderRepository extends BaseRepository<any> {
  constructor(protected db: DatabaseService) {
    super(db);
    this.modelName = 'order';
  }

  /**
   * Find order by ID with complete details
   */
  async findByIdWithDetails(orderId: string) {
    return this.db.order.findUnique({
      where: { id: orderId },
      include: {
        booking: {
          include: {
            customer: true,
            packages: { include: { package: true } },
            services: { include: { service: true } },
            sessions: true,
          },
        },
        payments: {
          include: {
            attempts: true,
            gatewayTransactions: true,
          },
          orderBy: { paymentSequence: 'asc' },
        },
        paymentPlans: {
          include: {
            schedules: true,
          },
        },
        refunds: {
          include: {
            attempts: true,
          },
        },
      },
    });
  }

  /**
   * Find order by reference number
   */
  async findByReferenceNumber(referenceNumber: string) {
    return this.db.order.findUnique({
      where: { referenceNumber },
      include: {
        booking: true,
        payments: true,
        refunds: true,
      },
    });
  }

  /**
   * Find orders by booking ID
   */
  async findByBookingId(bookingId: string) {
    return this.db.order.findFirst({
      where: { bookingId },
      include: {
        payments: true,
        refunds: true,
        paymentPlans: true,
      },
    });
  }

  /**
   * Find orders by status with pagination
   */
  async findByStatus(
    status: string,
    params?: { skip?: number; take?: number; orderBy?: any },
  ) {
    return this.db.order.findMany({
      where: { status: status as any },
      include: {
        booking: { include: { customer: true } },
        payments: true,
      },
      orderBy: params?.orderBy || { createdAt: 'desc' },
      skip: params?.skip,
      take: params?.take,
    });
  }

  /**
   * Get order financial summary
   */
  async getFinancialSummary(orderId: string) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: {
        payments: { where: { status: 'SUCCESSFUL' } },
        refunds: { where: { status: 'SUCCESSFUL' } },
      },
    });

    if (!order) return null;

    return {
      orderId: order.id,
      totalPrice: order.totalPrice,
      totalPaid: order.totalPaid,
      totalRefunded: order.totalRefunded,
      balanceRemaining: order.balanceRemaining,
      paymentCount: order.payments.length,
      refundCount: order.refunds.length,
      status: order.status,
    };
  }

  /**
   * Update order financial status
   */
  async updateFinancialStatus(
    orderId: string,
    totalPaid: number,
    totalRefunded: number,
    newStatus: string,
  ) {
    const balanceRemaining =
      (
        await this.db.order.findUnique({
          where: { id: orderId },
          select: { totalPrice: true },
        })
      )?.totalPrice || 0;

    return this.db.order.update({
      where: { id: orderId },
      data: {
        totalPaid,
        totalRefunded,
        balanceRemaining: balanceRemaining - totalPaid + totalRefunded,
        status: newStatus as any,
        updatedAt: new Date(),
      },
      include: { payments: true, refunds: true },
    });
  }

  /**
   * Find unpaid orders due for follow-up
   */
  async findUnpaidOrders(params?: { skip?: number; take?: number }) {
    return this.db.order.findMany({
      where: {
        status: { in: ['UNPAID', 'PARTIAL'] },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      },
      include: {
        booking: { include: { customer: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
      ...params,
    });
  }

  /**
   * Create order with initial payment plan
   */
  async createWithPaymentPlan(orderData: any, paymentPlanData?: any) {
    return this.db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: orderData,
      });

      if (paymentPlanData) {
        await tx.paymentPlan.create({
          data: {
            ...paymentPlanData,
            orderId: order.id,
          },
        });
      }

      return order;
    });
  }

  /**
   * Cancel order with cascading updates
   */
  async cancel(orderId: string, reason: string) {
    return this.db.$transaction(async (tx) => {
      // Cancel order
      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
      });

      // Mark pending payments as cancelled
      await tx.payment.updateMany({
        where: {
          orderId,
          status: { in: ['PENDING', 'PARTIAL_PAID'] },
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      });

      return order;
    });
  }

  /**
   * Get order statistics by date range
   */
  async getStatistics(startDate?: Date, endDate?: Date) {
    const where = {};

    if (startDate && endDate) {
      where['createdAt'] = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [total, paid, unpaid, partial, refunded, cancelled] =
      await Promise.all([
        this.db.order.count({ where }),
        this.db.order.count({ where: { ...where, status: 'PAID' } }),
        this.db.order.count({ where: { ...where, status: 'UNPAID' } }),
        this.db.order.count({ where: { ...where, status: 'PARTIAL' } }),
        this.db.order.count({ where: { ...where, status: 'REFUNDED' } }),
        this.db.order.count({ where: { ...where, status: 'CANCELLED' } }),
      ]);

    const totalRevenue = await this.db.order.aggregate({
      where,
      _sum: { totalPrice: true },
    });

    const collectedRevenue = await this.db.order.aggregate({
      where,
      _sum: { totalPaid: true },
    });

    return {
      total,
      byStatus: {
        paid,
        unpaid,
        partial,
        refunded,
        cancelled,
      },
      revenue: {
        total: totalRevenue._sum.totalPrice || 0,
        collected: collectedRevenue._sum.totalPaid || 0,
        outstanding:
          (totalRevenue._sum.totalPrice || 0) -
          (collectedRevenue._sum.totalPaid || 0),
      },
    };
  }
}
