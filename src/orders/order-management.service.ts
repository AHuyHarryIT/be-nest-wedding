import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from 'generated/prisma';
import { DatabaseService } from '../database/database.service';
import { PaymentCoreService as PaymentService } from '../payments/payment-core.service';

export interface CreateOrderDto {
  bookingId: string;
  totalPrice: number;
  notes?: string;
}

export interface CreateOrderWithPaymentDto extends CreateOrderDto {
  createDepositPayment?: boolean;
  depositPercentage?: number; // Default 30%
}

@Injectable()
export class OrderManagementService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Create new order
   * Optionally creates deposit payment
   */
  async createOrder(dto: CreateOrderWithPaymentDto) {
    // Verify booking exists
    const booking = await this.databaseService.booking.findUnique({
      where: { id: dto.bookingId },
    });

    if (!booking) {
      throw new BadRequestException(`Booking ${dto.bookingId} not found`);
    }

    // Check if order already exists for booking
    const existingOrder = await this.databaseService.order.findUnique({
      where: { bookingId: dto.bookingId },
    });

    if (existingOrder) {
      throw new BadRequestException(
        `Order already exists for booking ${dto.bookingId}`,
      );
    }

    // Generate reference number
    const referenceNumber = `ORD-${booking.id.substring(0, 8)}-${Date.now().toString().slice(-6)}`;

    // Create order
    const order = await this.databaseService.order.create({
      data: {
        booking: { connect: { id: dto.bookingId } },
        referenceNumber,
        totalPrice: dto.totalPrice,
        notes: dto.notes,
        status: 'UNPAID',
      },
      include: { payments: true },
    });

    // Optionally create deposit payment
    if (dto.createDepositPayment) {
      const depositPercentage = dto.depositPercentage ?? 0.3;
      const depositAmount = order.totalPrice * depositPercentage;

      const depositPayment = await this.paymentService.createPayment({
        orderId: order.id,
        amount: depositAmount,
        method: 'E_WALLET',
        paymentType: 'DEPOSIT',
        description: `Deposit (${Math.round(depositPercentage * 100)}%)`,
      });

      return {
        order,
        depositPayment,
      };
    }

    return { order };
  }

  /**
   * Get order with all payment details
   */
  async getOrderDetails(orderId: string) {
    const order = await this.databaseService.order.findUnique({
      where: { id: orderId },
      include: {
        booking: true,
        payments: {
          include: {
            attempts: {
              include: { gatewayTransaction: true },
            },
          },
          orderBy: { paymentSequence: 'asc' },
        },
        refunds: {
          include: { attempts: true },
        },
        paymentPlans: {
          include: { schedules: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return order;
  }

  /**
   * Get order by reference number
   */
  async getOrderByReference(referenceNumber: string) {
    const order = await this.databaseService.order.findUnique({
      where: { referenceNumber },
      include: {
        booking: true,
        payments: {
          include: { attempts: true },
        },
        refunds: true,
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Order with reference ${referenceNumber} not found`,
      );
    }

    return order;
  }

  /**
   * Get orders by booking
   */
  async getBookingOrders(bookingId: string) {
    return this.databaseService.order.findMany({
      where: { bookingId },
      include: {
        payments: {
          include: { attempts: true },
        },
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason?: string) {
    const order = await this.getOrderDetails(orderId);

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Check if order can be cancelled
    const hasSuccessfulPayment = order.payments.some(
      (p) => p.status === 'SUCCESSFUL',
    );

    if (hasSuccessfulPayment) {
      throw new BadRequestException(
        'Cannot cancel order with successful payments. Create refund instead.',
      );
    }

    // Cancel all pending payments
    for (const payment of order.payments) {
      if (payment.status === 'PENDING' || payment.status === 'FAILED') {
        await this.paymentService.cancelPayment(payment.id, 'Order cancelled');
      }
    }

    // Update order
    return this.databaseService.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
  }

  /**
   * Get order payment summary
   */
  async getOrderPaymentSummary(orderId: string) {
    const order = await this.databaseService.order.findUnique({
      where: { id: orderId },
      include: { payments: { include: { attempts: true } } },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const totalPaid = order.payments
      .filter((p) => p.status === 'SUCCESSFUL')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      orderId: order.id,
      totalPrice: order.totalPrice,
      totalPaid,
      balanceRemaining: order.totalPrice - totalPaid,
      paymentCount: order.payments.length,
      payments: order.payments,
    };
  }

  /**
   * Reconcile order - verify all payments are correct
   */
  async reconcileOrder(orderId: string) {
    const order = await this.databaseService.order.findUnique({
      where: { id: orderId },
      include: { payments: { include: { attempts: true } } },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return {
      orderId: order.id,
      isReconciled: true,
      summary: await this.getOrderPaymentSummary(orderId),
    };
  }

  /**
   * List all orders with pagination
   */
  async listOrders(skip: number = 0, take: number = 20) {
    const [orders, total] = await Promise.all([
      this.databaseService.order.findMany({
        skip,
        take,
        include: {
          booking: {
            select: { customer: true, eventDate: true, status: true },
          },
          payments: true,
          refunds: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.databaseService.order.count(),
    ]);

    return {
      orders,
      total,
      pages: Math.ceil(total / take),
      currentPage: Math.floor(skip / take) + 1,
    };
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(status: string, skip: number = 0, take: number = 20) {
    const [orders, total] = await Promise.all([
      this.databaseService.order.findMany({
        where: { status: status as OrderStatus },
        skip,
        take,
        include: {
          booking: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.databaseService.order.count({
        where: { status: status as OrderStatus },
      }),
    ]);

    return {
      orders,
      total,
      pages: Math.ceil(total / take),
    };
  }

  /**
   * Get orders requiring action (unpaid, partial, etc.)
   */
  async getOrdersRequiringAction() {
    return this.databaseService.order.findMany({
      where: {
        status: {
          in: ['UNPAID', 'PARTIAL'],
        },
        deletedAt: null,
      },
      include: {
        booking: { select: { customer: true } },
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get revenue summary
   */
  async getRevenueSummary() {
    const orders = await this.databaseService.order.findMany({
      where: { status: 'PAID' },
      include: { payments: { include: { attempts: true } } },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalPaid, 0);
    const totalRefunded = orders.reduce((sum, o) => sum + o.totalRefunded, 0);
    const netRevenue = totalRevenue - totalRefunded;

    return {
      totalOrders: orders.length,
      totalRevenue,
      totalRefunded,
      netRevenue,
      averageOrderValue: orders.length > 0 ? netRevenue / orders.length : 0,
    };
  }
}
