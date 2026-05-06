import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PaymentAttemptStatus, Prisma } from 'generated/prisma';
import { DatabaseService } from '../database/database.service';

export interface CreatePaymentAttemptDto {
  paymentId: string;
  attemptNumber: number;
  status?: PaymentAttemptStatus;
  attemptedAmount: number;
  userAgent?: string;
  ipAddress?: string;
  deviceInfo?: string;
  createdBy?: string;
  notes?: string;
}

export interface UpdatePaymentAttemptDto {
  status?: PaymentAttemptStatus;
  resultCode?: string;
  resultMessage?: string;
  errorReason?: string;
  respondedAt?: Date;
  duration?: number;
}

@Injectable()
export class PaymentAttemptService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create a new payment attempt with idempotency
   */
  async createAttempt(dto: CreatePaymentAttemptDto) {
    // Check if payment exists
    const payment = await this.databaseService.payment.findUnique({
      where: { id: dto.paymentId },
    });

    if (!payment) {
      throw new BadRequestException(`Payment ${dto.paymentId} not found`);
    }

    // Generate idempotency key to prevent duplicate submissions
    const idempotencyKey = `${dto.paymentId}-attempt-${dto.attemptNumber}-${Date.now()}`;

    try {
      const attempt = await this.databaseService.paymentAttempt.create({
        data: {
          payment: { connect: { id: dto.paymentId } },
          attemptNumber: dto.attemptNumber,
          status: dto.status ?? 'INITIATED',
          attemptedAmount: dto.attemptedAmount,
          idempotencyKey,
          userAgent: dto.userAgent,
          ipAddress: dto.ipAddress,
          deviceInfo: dto.deviceInfo,
          createdBy: dto.createdBy,
          notes: dto.notes,
        },
        include: {
          payment: true,
        },
      });

      // Update payment with attempt info
      await this.databaseService.payment.update({
        where: { id: dto.paymentId },
        data: {
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });

      return attempt;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Payment attempt already exists: ${JSON.stringify(error.meta?.target)}`,
        );
      }
      throw error;
    }
  }

  /**
   * Update payment attempt status
   */
  async updateAttemptStatus(attemptId: string, dto: UpdatePaymentAttemptDto) {
    const attempt = await this.databaseService.paymentAttempt.findUnique({
      where: { id: attemptId },
      include: { payment: true },
    });

    if (!attempt) {
      throw new BadRequestException(`Attempt ${attemptId} not found`);
    }

    // Update attempt
    const updated = await this.databaseService.paymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: dto.status,
        resultCode: dto.resultCode,
        resultMessage: dto.resultMessage,
        errorReason: dto.errorReason,
        respondedAt: dto.respondedAt,
        duration: dto.duration,
      },
      include: { payment: true },
    });

    return updated;
  }

  /**
   * Get all attempts for a payment
   */
  async getPaymentAttempts(paymentId: string) {
    return this.databaseService.paymentAttempt.findMany({
      where: { paymentId },
      orderBy: { attemptNumber: 'asc' },
    });
  }

  /**
   * Check if payment has succeeded
   */
  async hasSuccessfulAttempt(paymentId: string) {
    const attempt = await this.databaseService.paymentAttempt.findFirst({
      where: {
        paymentId,
        status: 'SUCCESS',
      },
    });

    return !!attempt;
  }

  /**
   * Get last attempt for a payment
   */
  async getLastAttempt(paymentId: string) {
    return this.databaseService.paymentAttempt.findFirst({
      where: { paymentId },
      orderBy: { attemptNumber: 'desc' },
    });
  }

  /**
   * Check if payment can be retried
   */
  async canRetry(paymentId: string, maxRetries: number = 3) {
    const attempts = await this.getPaymentAttempts(paymentId);

    // Already has successful attempt
    if (attempts.some((a) => a.status === 'SUCCESS')) {
      return false;
    }

    // Exceeded max retries
    if (attempts.length >= maxRetries) {
      return false;
    }

    return true;
  }

  /**
   * Mark attempt as expired
   */
  async markAsExpired(attemptId: string) {
    return this.updateAttemptStatus(attemptId, {
      status: 'TIMEOUT',
      respondedAt: new Date(),
    });
  }

  /**
   * Cancel attempt
   */
  async cancelAttempt(attemptId: string) {
    return this.updateAttemptStatus(attemptId, {
      status: 'CANCELLED',
      respondedAt: new Date(),
    });
  }
}
