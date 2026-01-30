import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod } from 'generated/prisma';
import { DatabaseService } from '../database/database.service';
import { PaymentService } from './payment-core.service';

export interface CreateOrderPaymentPlanDto {
  orderId: string;
  depositPercentage?: number; // Default 30%
  installments?: number; // Number of installments (2, 3, 6, 12)
}

@Injectable()
export class OrderPaymentService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Create deposit payment (called after order creation)
   * Creates payment record but NOT attempt (no attempt until user initiates)
   */
  async createDepositPayment(
    orderId: string,
    depositPercentage: number = 0.3,
    method: PaymentMethod = 'E_WALLET',
  ) {
    const order = await this.databaseService.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException(`Order ${orderId} not found`);
    }

    const depositAmount = order.totalPrice * depositPercentage;

    const payment = await this.paymentService.createPayment({
      orderId,
      amount: depositAmount,
      method,
      paymentType: 'DEPOSIT',
      description: `Deposit (${Math.round(depositPercentage * 100)}%)`,
    });

    return payment;
  }

  /**
   * Create remaining payment
   * Called after deposit is confirmed
   */
  async createRemainingPayment(
    orderId: string,
    method: PaymentMethod = 'E_WALLET',
  ) {
    const order = await this.databaseService.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new BadRequestException(`Order ${orderId} not found`);
    }

    // Calculate total paid from successful payments
    const totalPaid = order.payments
      .filter((p) => p.status === 'SUCCESSFUL')
      .reduce((sum, p) => sum + p.amount, 0);

    const remainingAmount = Math.max(0, order.totalPrice - totalPaid);

    if (remainingAmount <= 0) {
      throw new BadRequestException('Order is already fully paid');
    }

    const payment = await this.paymentService.createPayment({
      orderId,
      amount: remainingAmount,
      method,
      paymentType: 'REMAINING',
      description: 'Remaining balance',
    });

    return payment;
  }

  /**
   * Create full payment (if customer wants to pay everything at once)
   */
  async createFullPayment(orderId: string, method: PaymentMethod) {
    const order = await this.databaseService.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException(`Order ${orderId} not found`);
    }

    const payment = await this.paymentService.createPayment({
      orderId,
      amount: order.totalPrice,
      method,
      paymentType: 'FULL',
      description: 'Full payment',
    });

    return payment;
  }

  /**
   * Create installment payment plan
   */
  async createInstallmentPlan(
    orderId: string,
    numberOfInstallments: 2 | 3 | 6 | 12 = 3,
  ) {
    const order = await this.databaseService.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException(`Order ${orderId} not found`);
    }

    // Create payment plan
    const planType =
      numberOfInstallments === 2
        ? 'INSTALLMENT_2'
        : numberOfInstallments === 3
          ? 'INSTALLMENT_3'
          : numberOfInstallments === 6
            ? 'INSTALLMENT_6'
            : 'INSTALLMENT_12';

    const plan = await this.databaseService.paymentPlan.create({
      data: {
        order: { connect: { id: orderId } },
        planType,
        installmentCount: numberOfInstallments,
        status: 'PENDING',
      },
    });

    // Create installment payments
    const installmentAmount = Math.ceil(
      order.totalPrice / numberOfInstallments,
    );
    const payments: Array<any> = [];

    for (let i = 1; i <= numberOfInstallments; i++) {
      // Last installment gets remainder
      const amount =
        i === numberOfInstallments
          ? order.totalPrice - (numberOfInstallments - 1) * installmentAmount
          : installmentAmount;

      // Calculate due date (e.g., every month)
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);

      const payment = await this.paymentService.createPayment({
        orderId,
        amount,
        method: 'E_WALLET',
        paymentType: 'INSTALLMENT',
        description: `Installment ${i}/${numberOfInstallments}`,
        dueDate,
      });

      payments.push(payment);

      // Create schedule entry
      await this.databaseService.paymentSchedule.create({
        data: {
          paymentPlan: { connect: { id: plan.id } },
          scheduleNumber: i,
          dueDate,
          amount,
          status: 'PENDING',
        },
      });
    }

    return {
      plan,
      payments,
    };
  }

  /**
   * Get order payment summary
   */
  async getOrderPaymentSummary(orderId: string) {
    const order = await this.databaseService.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          include: {
            attempts: {
              include: { gatewayTransaction: true },
            },
          },
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
      throw new BadRequestException(`Order ${orderId} not found`);
    }

    // Calculate totals
    const totalPaid = order.payments
      .filter((p) => p.status === 'SUCCESSFUL')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalRefunded = order.refunds
      .filter((r) => r.status === 'SUCCESSFUL')
      .reduce((sum, r) => sum + r.amount, 0);

    const netPaid = totalPaid - totalRefunded;
    const balanceRemaining = order.totalPrice - netPaid;

    // Group payments by type
    const paymentsByType = {
      deposit: order.payments.filter((p) => p.paymentType === 'DEPOSIT'),
      remaining: order.payments.filter((p) => p.paymentType === 'REMAINING'),
      installments: order.payments.filter(
        (p) => p.paymentType === 'INSTALLMENT',
      ),
      full: order.payments.filter((p) => p.paymentType === 'FULL'),
    };

    // Group payments by status
    const paymentsByStatus = {
      pending: order.payments.filter((p) => p.status === 'PENDING'),
      successful: order.payments.filter((p) => p.status === 'SUCCESSFUL'),
      failed: order.payments.filter((p) => p.status === 'FAILED'),
      abandoned: order.payments.filter((p) => p.status === 'ABANDONED'),
    };

    return {
      order,
      summary: {
        totalPrice: order.totalPrice,
        totalPaid,
        totalRefunded,
        netPaid,
        balanceRemaining,
        isFullyPaid: balanceRemaining === 0,
      },
      paymentsByType,
      paymentsByStatus,
      refunds: order.refunds,
      plans: order.paymentPlans,
      paymentCount: order.payments.length,
      refundCount: order.refunds.length,
    };
  }

  /**
   * Reconcile payments - check all payments against orders
   */
  async reconcileOrderPayments(orderId: string) {
    const order = await this.databaseService.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          include: { attempts: { include: { gatewayTransaction: true } } },
        },
        refunds: true,
      },
    });

    if (!order) {
      throw new BadRequestException(`Order ${orderId} not found`);
    }

    const issues: string[] = [];

    // Check 1: Total paid matches sum of successful payments
    const totalPaid = order.payments
      .filter((p) => p.status === 'SUCCESSFUL')
      .reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid !== order.totalPaid) {
      issues.push(
        `Total paid mismatch: recorded=${order.totalPaid}, calculated=${totalPaid}`,
      );
    }

    // Check 2: All successful payments have settlement
    for (const payment of order.payments) {
      if (payment.status === 'SUCCESSFUL') {
        const hasSettledTransaction = payment.attempts.some((a) =>
          a.gatewayTransaction
            ? a.gatewayTransaction.settledAt !== null
            : false,
        );

        if (!hasSettledTransaction) {
          issues.push(
            `Payment ${payment.id} is successful but no settled gateway transaction`,
          );
        }
      }
    }

    // Check 3: No duplicate successful payments for same order
    const successPayments = order.payments.filter(
      (p) => p.status === 'SUCCESSFUL',
    );
    const amountsByMethod: Record<string, number> = {};

    for (const payment of successPayments) {
      const key = `${payment.method}`;
      amountsByMethod[key] = (amountsByMethod[key] ?? 0) + payment.amount;
    }

    // Check 4: Total refunded <= total paid
    const totalRefunded = order.refunds
      .filter((r) => r.status === 'SUCCESSFUL')
      .reduce((sum, r) => sum + r.amount, 0);

    if (totalRefunded > totalPaid) {
      issues.push(
        `Total refunded (${totalRefunded}) exceeds total paid (${totalPaid})`,
      );
    }

    return {
      orderId,
      isValid: issues.length === 0,
      issues,
      summary: {
        totalPrice: order.totalPrice,
        totalPaid,
        totalRefunded,
        paymentCount: order.payments.length,
        successfulPayments: successPayments.length,
        refundCount: order.refunds.length,
      },
    };
  }
}
