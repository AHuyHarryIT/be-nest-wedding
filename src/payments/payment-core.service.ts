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
import { GenericRecord } from '../common/types';

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

/**
 * Response types for payment service methods
 */
export type PaymentDetailsResponse = GenericRecord<unknown>;
export type PaymentAttemptResponse = GenericRecord<unknown>;
export type CompletePaymentAttemptResponse = {
  attempt: GenericRecord<unknown>;
  payment: GenericRecord<unknown>;
};
export type OrderBalanceResponse = {
  totalPrice: number;
  totalPaid: number;
  balanceRemaining: number;
  isFullyPaid: boolean;
  isPartiallPaid: boolean;
};

export interface PaymentTimelineEntry {
  timestamp: Date;
  event: string;
  details: GenericRecord<unknown>;
}

export type PaymentHistoryResponse = {
  payment: GenericRecord<unknown>;
  timeline: PaymentTimelineEntry[];
};

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
  async createPayment(dto: CreatePaymentDto): Promise<GenericRecord<unknown>> {
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

    const payment = (await this.paymentRepository.create({
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
    })) as GenericRecord<unknown>;

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
  ): Promise<PaymentAttemptResponse> {
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
  ): Promise<CompletePaymentAttemptResponse> {
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
  async retryPayment(
    paymentId: string,
    maxRetries: number = 3,
  ): Promise<PaymentAttemptResponse> {
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
  async updatePayment(
    paymentId: string,
    dto: UpdatePaymentDto,
  ): Promise<GenericRecord<unknown>> {
    const payment = (await this.paymentRepository.findById(
      paymentId,
    )) as GenericRecord<unknown>;

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    return (await this.paymentRepository.update(paymentId, {
      status: dto.status,
      description: dto.description,
      dueDate: dto.dueDate,
      notes: dto.notes,
    })) as GenericRecord<unknown>;
  }

  /**
   * Get payment with all details
   */
  async getPaymentDetails(
    paymentId: string,
  ): Promise<PaymentDetailsResponse | null> {
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
  async getOrderPayments(orderId: string): Promise<GenericRecord<unknown>[]> {
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
  async calculateOrderBalance(orderId: string): Promise<OrderBalanceResponse> {
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
  async updateOrderStatus(orderId: string): Promise<GenericRecord<unknown>> {
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
  async cancelPayment(
    paymentId: string,
    reason?: string,
  ): Promise<GenericRecord<unknown>> {
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
  async getPaymentHistory(paymentId: string): Promise<PaymentHistoryResponse> {
    const payment = await this.getPaymentDetails(paymentId);

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    // Build timeline
    const timeline: PaymentTimelineEntry[] = [];

    // Payment created
    const paymentData = payment as GenericRecord<unknown>;
    timeline.push({
      timestamp: paymentData.createdAt as Date,
      event: 'PAYMENT_CREATED',
      details: {
        amount: paymentData.amount,
        method: paymentData.method,
        type: paymentData.paymentType,
      },
    });

    // Attempts
    const attempts = (paymentData.attempts as GenericRecord<unknown>[]) || [];
    for (const attempt of attempts) {
      const attemptData = attempt;
      timeline.push({
        timestamp: attemptData.requestedAt as Date,
        event: 'ATTEMPT_INITIATED',
        details: {
          attemptNumber: attemptData.attemptNumber,
          amount: attemptData.attemptedAmount,
        },
      });

      if (attemptData.respondedAt) {
        timeline.push({
          timestamp: attemptData.respondedAt as unknown as Date,
          event: 'ATTEMPT_RESPONDED',
          details: {
            attemptNumber: attemptData.attemptNumber,
            status: attemptData.status,
            resultCode: attemptData.resultCode,
          },
        });
      }

      const gatewayTx =
        attemptData.gatewayTransaction as GenericRecord<unknown>;
      if (gatewayTx) {
        timeline.push({
          timestamp: gatewayTx.createdAt as Date,
          event: 'GATEWAY_TRANSACTION_RECORDED',
          details: {
            gateway: gatewayTx.gatewayProvider,
            transactionId: gatewayTx.gatewayTransactionId,
          },
        });

        if (gatewayTx.settledAt) {
          timeline.push({
            timestamp: gatewayTx.settledAt as unknown as Date,
            event: 'GATEWAY_SETTLED',
            details: {
              gateway: gatewayTx.gatewayProvider,
            },
          });
        }
      }
    }

    return {
      payment: paymentData,
      timeline: timeline.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
    };
  }
}
