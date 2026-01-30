import { BadRequestException, Injectable } from '@nestjs/common';
import {
  RefundAttemptStatus,
  RefundReason,
  RefundStatus,
} from 'generated/prisma';
import { DatabaseService } from '../database/database.service';

export interface CreateRefundDto {
  orderId: string;
  originalPaymentId?: string;
  amount: number;
  reason: RefundReason;
  description?: string;
  authorizedBy?: string;
  notes?: string;
}

export interface UpdateRefundDto {
  status?: RefundStatus;
  processedAt?: Date;
  completedAt?: Date;
  notes?: string;
}

export interface CreateRefundAttemptDto {
  refundId: string;
  attemptNumber: number;
  amount: number;
  notes?: string;
  processedBy?: string;
}

@Injectable()
export class RefundService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create a refund request
   */
  async createRefund(dto: CreateRefundDto) {
    // Verify order exists
    const order = await this.databaseService.order.findUnique({
      where: { id: dto.orderId },
      include: { refunds: true },
    });

    if (!order) {
      throw new BadRequestException(`Order ${dto.orderId} not found`);
    }

    // Check if original payment exists (if specified)
    if (dto.originalPaymentId) {
      const payment = await this.databaseService.payment.findUnique({
        where: { id: dto.originalPaymentId },
      });

      if (!payment) {
        throw new BadRequestException(
          `Payment ${dto.originalPaymentId} not found`,
        );
      }
    }

    // Generate reference number
    const refundSequence = (order.refunds?.length ?? 0) + 1;
    const referenceNumber = `REF-${order.referenceNumber}-${refundSequence}`;

    const refund = await this.databaseService.refund.create({
      data: {
        order: { connect: { id: dto.orderId } },
        refundSequence,
        referenceNumber,
        originalPaymentId: dto.originalPaymentId,
        amount: dto.amount,
        reason: dto.reason,
        description: dto.description,
        status: 'INITIATED',
        authorizedBy: dto.authorizedBy,
        notes: dto.notes,
      },
      include: { order: true },
    });

    return refund;
  }

  /**
   * Update refund status
   */
  async updateRefund(refundId: string, dto: UpdateRefundDto) {
    const refund = await this.databaseService.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new BadRequestException(`Refund ${refundId} not found`);
    }

    return this.databaseService.refund.update({
      where: { id: refundId },
      data: {
        status: dto.status,
        processedAt: dto.processedAt,
        completedAt: dto.completedAt,
        notes: dto.notes,
      },
    });
  }

  /**
   * Create refund attempt
   */
  async createRefundAttempt(dto: CreateRefundAttemptDto) {
    const refund = await this.databaseService.refund.findUnique({
      where: { id: dto.refundId },
      include: { attempts: true },
    });

    if (!refund) {
      throw new BadRequestException(`Refund ${dto.refundId} not found`);
    }

    const attempt = await this.databaseService.refundAttempt.create({
      data: {
        refund: { connect: { id: dto.refundId } },
        attemptNumber: dto.attemptNumber,
        amount: dto.amount,
        status: 'INITIATED',
        notes: dto.notes,
        processedBy: dto.processedBy,
      },
      include: { refund: true },
    });

    return attempt;
  }

  /**
   * Update refund attempt status
   */
  async updateRefundAttemptStatus(
    attemptId: string,
    status: string,
    resultCode?: string,
    resultMessage?: string,
  ) {
    const attempt = await this.databaseService.refundAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new BadRequestException(`Refund attempt ${attemptId} not found`);
    }

    return this.databaseService.refundAttempt.update({
      where: { id: attemptId },
      data: {
        status: status as RefundAttemptStatus,
        resultCode,
        resultMessage,
        respondedAt: new Date(),
      },
    });
  }

  /**
   * Get all refunds for an order
   */
  async getOrderRefunds(orderId: string) {
    return this.databaseService.refund.findMany({
      where: { orderId },
      include: { attempts: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get refund with attempts
   */
  async getRefund(refundId: string) {
    return this.databaseService.refund.findUnique({
      where: { id: refundId },
      include: {
        order: true,
        attempts: {
          orderBy: { attemptNumber: 'asc' },
        },
      },
    });
  }

  /**
   * Check if refund is complete
   */
  async isRefundComplete(refundId: string) {
    const refund = await this.getRefund(refundId);
    return refund?.status === 'SUCCESSFUL';
  }

  /**
   * Calculate total refunded amount for an order
   */
  async getOrderTotalRefunded(orderId: string) {
    const result = await this.databaseService.refund.aggregate({
      where: {
        orderId,
        status: 'SUCCESSFUL',
      },
      _sum: { amount: true },
    });

    return result._sum.amount ?? 0;
  }

  /**
   * Can refund be retried
   */
  async canRetry(refundId: string, maxRetries: number = 3) {
    const refund = await this.getRefund(refundId);

    if (!refund) {
      throw new BadRequestException(`Refund ${refundId} not found`);
    }

    // Already successful
    if (refund.status === 'SUCCESSFUL') {
      return false;
    }

    // Already rejected
    if (refund.status === 'REJECTED') {
      return false;
    }

    // Check attempt count
    if (refund.attempts.length >= maxRetries) {
      return false;
    }

    return true;
  }
}
