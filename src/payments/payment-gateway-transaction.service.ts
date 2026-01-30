import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateGatewayTransactionDto {
  paymentId: string;
  paymentAttemptId?: string;
  gatewayProvider: string; // "momo", "zalo", "stripe"
  gatewayName?: string;
  gatewayTransactionId?: string;
  gatewayOrderId?: string;
  amount: number;
  currency?: string;
  gatewayStatus?: string;
  gatewayRequest?: any;
  gatewayResponse?: any;
  webhookId?: string;
  notes?: string;
}

export interface UpdateGatewayTransactionDto {
  gatewayStatus?: string;
  respondedAt?: Date;
  settledAt?: Date;
  webhookReceivedAt?: Date;
  webhookStatus?: string;
  gatewayResponse?: any;
}

@Injectable()
export class PaymentGatewayTransactionService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Record a gateway transaction
   */
  async recordTransaction(dto: CreateGatewayTransactionDto) {
    // Verify payment exists
    const payment = await this.databaseService.payment.findUnique({
      where: { id: dto.paymentId },
    });

    if (!payment) {
      throw new BadRequestException(`Payment ${dto.paymentId} not found`);
    }

    const transaction =
      await this.databaseService.paymentGatewayTransaction.create({
        data: {
          payment: { connect: { id: dto.paymentId } },
          paymentAttemptId: dto.paymentAttemptId,
          gatewayProvider: dto.gatewayProvider,
          gatewayName: dto.gatewayName,
          gatewayTransactionId: dto.gatewayTransactionId,
          gatewayOrderId: dto.gatewayOrderId,
          amount: dto.amount,
          currency: dto.currency ?? 'VND',
          gatewayStatus: dto.gatewayStatus,
          gatewayRequest: dto.gatewayRequest ?? {},
          gatewayResponse: dto.gatewayResponse ?? {},
          webhookId: dto.webhookId,
          notes: dto.notes,
        },
      });

    return transaction;
  }

  /**
   * Update gateway transaction
   */
  async updateTransaction(
    transactionId: string,
    dto: UpdateGatewayTransactionDto,
  ) {
    const transaction =
      await this.databaseService.paymentGatewayTransaction.findUnique({
        where: { id: transactionId },
      });

    if (!transaction) {
      throw new BadRequestException(`Transaction ${transactionId} not found`);
    }

    return this.databaseService.paymentGatewayTransaction.update({
      where: { id: transactionId },
      data: {
        gatewayStatus: dto.gatewayStatus,
        respondedAt: dto.respondedAt,
        settledAt: dto.settledAt,
        webhookReceivedAt: dto.webhookReceivedAt,
        webhookStatus: dto.webhookStatus,
        gatewayResponse: dto.gatewayResponse,
      },
    });
  }

  /**
   * Get transaction by gateway transaction ID (for reconciliation)
   */
  async getByGatewayTransactionId(
    gatewayProvider: string,
    gatewayTransactionId: string,
  ) {
    return this.databaseService.paymentGatewayTransaction.findFirst({
      where: {
        gatewayProvider,
        gatewayTransactionId,
      },
      include: {
        payment: {
          include: { order: true },
        },
        attempts: true,
      },
    });
  }

  /**
   * Get transaction by webhook ID
   */
  async getByWebhookId(webhookId: string) {
    return this.databaseService.paymentGatewayTransaction.findFirst({
      where: { webhookId },
      include: {
        payment: {
          include: { order: true },
        },
        attempts: true,
      },
    });
  }

  /**
   * Get all transactions for a payment
   */
  async getPaymentTransactions(paymentId: string) {
    return this.databaseService.paymentGatewayTransaction.findMany({
      where: { paymentId },
      include: { attempts: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Mark transaction as settled
   */
  async markAsSettled(transactionId: string) {
    return this.updateTransaction(transactionId, {
      settledAt: new Date(),
      gatewayStatus: 'CAPTURED',
    });
  }

  /**
   * Check if transaction is settled
   */
  async isSettled(transactionId: string) {
    const transaction =
      await this.databaseService.paymentGatewayTransaction.findUnique({
        where: { id: transactionId },
      });

    return !!transaction?.settledAt;
  }
}
