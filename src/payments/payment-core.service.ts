import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentType,
  PaymentStatus,
  PaymentMethod,
  PaymentAttemptStatus,
  OrderStatus,
} from 'generated/prisma';
import { DatabaseService } from '../database/database.service';
import { PaymentRepository } from '../common/repositories';
import { PaymentAttemptService } from './payment-attempt.service';
import { PaymentGatewayTransactionService } from './payment-gateway-transaction.service';

export interface CreatePaymentDto {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  paymentType?: PaymentType;
  description?: string;
  dueDate?: Date;
  notes?: string;
}

export interface UpdatePaymentDto {
  status?: PaymentStatus;
  description?: string;
  dueDate?: Date;
  notes?: string;
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentAttemptService: PaymentAttemptService,
    private readonly gatewayTransactionService: PaymentGatewayTransactionService,
  ) {}

  /**
   * Create a new payment record
   * NOTE: For E-WALLET, payment record is created immediately but no attempt is made
   * Attempt is created only when user initiates payment
   */
  async createPayment(dto: CreatePaymentDto) {
    // Verify order exists
    const order = await this.databaseService.order.findUnique({
      where: { id: dto.orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new BadRequestException(`Order ${dto.orderId} not found`);
    }

    // Generate payment sequence using repository
    const paymentSequence = await this.paymentRepository.getNextPaymentSequence(
      dto.orderId,
    );

    const payment = await this.paymentRepository.create({
      order: { connect: { id: dto.orderId } },
      paymentSequence,
      amount: dto.amount,
      method: dto.method,
      paymentType: dto.paymentType ?? 'REMAINING',
      status: 'PENDING',
      description:
        dto.description ||
        `Payment ${paymentSequence} (${dto.paymentType ?? 'REMAINING'})`,
      dueDate: dto.dueDate,
      notes: dto.notes,
    });

    return payment;
  }

  /**
   * Initiate payment - creates first attempt for payment processing
   * For non-E-WALLET methods, attempt is created immediately
   * For E-WALLET, attempt is created here (not during createPayment)
   */
  async initiatePayment(
    paymentId: string,
    userAgent?: string,
    ipAddress?: string,
    createdBy?: string,
  ) {
    // Use repository for better query composition
    const payment = await this.paymentRepository.findByIdWithDetails(paymentId);

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    // Check if already has successful attempt
    const hasSuccess = payment.attempts.some((a) => a.status === 'SUCCESS');
    if (hasSuccess) {
      throw new BadRequestException('Payment already successful');
    }

    // Get next attempt number
    const attemptNumber = payment.attempts.length + 1;

    // Create first attempt
    const attempt = await this.paymentAttemptService.createAttempt({
      paymentId,
      attemptNumber,
      status: 'INITIATED',
      attemptedAmount: payment.amount,
      userAgent,
      ipAddress,
      createdBy,
    });

    // Increment attempt count using repository
    await this.paymentRepository.incrementAttemptCount(paymentId);

    return attempt;
  }

  /**
   * Complete payment attempt with gateway response
   * Updates payment status based on attempt success
   */
  async completePaymentAttempt(
    attemptId: string,
    status: PaymentAttemptStatus,
    resultCode?: string,
    resultMessage?: string,
    errorReason?: string,
  ) {
    const attempt = await this.databaseService.paymentAttempt.findUnique({
      where: { id: attemptId },
      include: { payment: true },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found`);
    }

    // Update attempt
    const updatedAttempt = await this.paymentAttemptService.updateAttemptStatus(
      attemptId,
      {
        status,
        resultCode,
        resultMessage,
        errorReason,
        respondedAt: new Date(),
      },
    );

    // Update payment status based on attempt result
    let paymentStatus: PaymentStatus = 'PENDING';

    if (status === 'SUCCESS') {
      paymentStatus = 'SUCCESSFUL';
    } else if (status === 'FAILED') {
      paymentStatus = 'FAILED';
    } else if (status === 'TIMEOUT') {
      paymentStatus = 'ABANDONED';
    }

    // Use repository to update payment status
    const updatedPayment = await this.paymentRepository.updateStatus(
      attempt.payment.id,
      paymentStatus,
      { successfulAttemptId: status === 'SUCCESS' ? attemptId : undefined },
    );

    // Update order if payment successful
    if (status === 'SUCCESS') {
      if (attempt.payment.orderId) {
        await this.updateOrderStatus(attempt.payment.orderId);
      }
    }

    return {
      attempt: updatedAttempt,
      payment: updatedPayment,
    };
  }

  /**
   * Retry a failed payment
   */
  async retryPayment(paymentId: string, maxRetries: number = 3) {
    // Use repository to find due for retry
    const payments = await this.paymentRepository.findDueForRetry(maxRetries, {
      take: 1,
    });

    const payment = payments.find((p) => p.id === paymentId);

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    // Check if can retry
    const canRetry = await this.paymentAttemptService.canRetry(
      paymentId,
      maxRetries,
    );

    if (!canRetry) {
      throw new BadRequestException(
        'Payment cannot be retried: max attempts reached or already successful',
      );
    }

    // Create new attempt
    const attemptNumber = payment.attempts.length + 1;
    const attempt = await this.paymentAttemptService.createAttempt({
      paymentId,
      attemptNumber,
      status: 'INITIATED',
      attemptedAmount: payment.amount,
    });

    return attempt;
  }

  /**
   * Update payment
   */
  async updatePayment(paymentId: string, dto: UpdatePaymentDto) {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    return this.paymentRepository.update(paymentId, {
      status: dto.status,
      description: dto.description,
      dueDate: dto.dueDate,
      notes: dto.notes,
    });
  }

  /**
   * Get payment with all details
   */
  async getPaymentDetails(paymentId: string) {
    return this.databaseService.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: true,
        attempts: {
          include: {
            gatewayTransaction: true,
          },
          orderBy: { attemptNumber: 'asc' },
        },
        gatewayTransactions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Get all payments for order
   */
  async getOrderPayments(orderId: string) {
    return this.databaseService.payment.findMany({
      where: { orderId },
      include: {
        attempts: true,
        gatewayTransactions: true,
      },
      orderBy: { paymentSequence: 'asc' },
    });
  }

  /**
   * Calculate order balance
   */
  async calculateOrderBalance(orderId: string) {
    const order = await this.databaseService.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Sum successful payments
    const totalPaid = order.payments
      .filter((p) => p.status === 'SUCCESSFUL')
      .reduce((sum, p) => sum + p.amount, 0);

    const balanceRemaining = Math.max(0, order.totalPrice - totalPaid);

    return {
      totalPrice: order.totalPrice,
      totalPaid,
      balanceRemaining,
      isFullyPaid: balanceRemaining === 0,
      isPartiallPaid: totalPaid > 0 && balanceRemaining > 0,
    };
  }

  /**
   * Update order status based on payment status
   */
  async updateOrderStatus(orderId: string) {
    const order = await this.databaseService.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Calculate totals
    const totalPaid = order.payments
      .filter((p) => p.status === 'SUCCESSFUL')
      .reduce((sum, p) => sum + p.amount, 0);

    const balanceRemaining = order.totalPrice - totalPaid;

    // Determine status
    let status: OrderStatus = 'UNPAID' as OrderStatus;
    if (balanceRemaining === 0) {
      status = 'PAID' as OrderStatus;
    } else if (totalPaid > 0) {
      status = 'PARTIAL' as OrderStatus;
    }

    // Update order
    return this.databaseService.order.update({
      where: { id: orderId },
      data: {
        status,
        totalPaid,
        balanceRemaining: Math.max(0, balanceRemaining),
      },
    });
  }

  /**
   * Cancel payment
   */
  async cancelPayment(paymentId: string, reason?: string) {
    const payment = await this.databaseService.payment.findUnique({
      where: { id: paymentId },
      include: { attempts: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    // Cannot cancel successful payments
    if (payment.status === 'SUCCESSFUL') {
      throw new BadRequestException(
        'Cannot cancel successful payment. Create refund instead.',
      );
    }

    // Update payment
    const updated = await this.databaseService.payment.update({
      where: { id: paymentId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });

    // Cancel any pending attempts
    for (const attempt of payment.attempts) {
      if (attempt.status === 'INITIATED' || attempt.status === 'IN_PROGRESS') {
        await this.paymentAttemptService.cancelAttempt(attempt.id);
      }
    }

    return updated;
  }

  /**
   * Get payment history for audit
   */
  async getPaymentHistory(paymentId: string) {
    const payment = await this.getPaymentDetails(paymentId);

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    // Build timeline
    const timeline: Array<{
      timestamp: Date;
      event: string;
      details: Record<string, any>;
    }> = [];

    // Payment created
    timeline.push({
      timestamp: payment.createdAt,
      event: 'PAYMENT_CREATED',
      details: {
        amount: payment.amount,
        method: payment.method,
        type: payment.paymentType,
      },
    });

    // Attempts
    for (const attempt of payment.attempts) {
      timeline.push({
        timestamp: attempt.requestedAt,
        event: 'ATTEMPT_INITIATED',
        details: {
          attemptNumber: attempt.attemptNumber,
          amount: attempt.attemptedAmount,
        },
      });

      if (attempt.respondedAt) {
        timeline.push({
          timestamp: attempt.respondedAt,
          event: 'ATTEMPT_RESPONDED',
          details: {
            attemptNumber: attempt.attemptNumber,
            status: attempt.status,
            resultCode: attempt.resultCode,
          },
        });
      }

      if (attempt.gatewayTransaction) {
        timeline.push({
          timestamp: attempt.gatewayTransaction.createdAt,
          event: 'GATEWAY_TRANSACTION_RECORDED',
          details: {
            gateway: attempt.gatewayTransaction.gatewayProvider,
            transactionId: attempt.gatewayTransaction.gatewayTransactionId,
          },
        });

        if (attempt.gatewayTransaction.settledAt) {
          timeline.push({
            timestamp: attempt.gatewayTransaction.settledAt,
            event: 'GATEWAY_SETTLED',
            details: {
              gateway: attempt.gatewayTransaction.gatewayProvider,
            },
          });
        }
      }
    }

    return {
      payment,
      timeline: timeline.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
    };
  }
}
