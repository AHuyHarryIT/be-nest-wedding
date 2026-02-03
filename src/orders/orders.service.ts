import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Booking } from 'generated/prisma';
import { DatabaseService } from '../database/database.service';
import { PaymentEventsService } from '../payments/events/payment-events.service';
import {
  MomoIPNCallback,
  MomoIPNResponse,
  MomoPaymentService,
} from '../payments/momo.service';
import { PaymentAttemptService } from '../payments/payment-attempt.service';
import { PaymentService } from '../payments/payment-core.service';
import { PaymentGatewayTransactionService } from '../payments/payment-gateway-transaction.service';
import { MomoTransactionQueryResponse } from '../payments/momo.service';
import { CheckoutDto } from './dto';

@Injectable()
export class OrdersService {
  private readonly MIN_DEPOSIT_PERCENTAGE = 30;
  private readonly logger = new Logger('OrdersService');

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly momoService: MomoPaymentService,
    private readonly paymentService: PaymentService,
    private readonly paymentAttemptService: PaymentAttemptService,
    private readonly gatewayTransactionService: PaymentGatewayTransactionService,
    private readonly paymentEventsService: PaymentEventsService,
  ) {}

  /**
   * Create order for booking checkout
   * First-time checkout: can optionally pay deposit (minimum 30%)
   * Second-time checkout: must pay remaining amount
   */
  async checkout(checkoutDto: CheckoutDto) {
    const booking = await this.databaseService.booking.findUnique({
      where: { id: checkoutDto.bookingId },
    });

    if (!booking) {
      throw new NotFoundException(
        `Booking with ID ${checkoutDto.bookingId} not found`,
      );
    }

    // Check if order already exists for this booking
    const existingOrder = await this.databaseService.order.findUnique({
      where: { bookingId: checkoutDto.bookingId },
    });

    if (!existingOrder) {
      return this.createNewOrder(booking, checkoutDto);
    } else {
      return this.payRemaining(existingOrder.id, checkoutDto);
    }
  }

  /**
   * Create a new order for first-time booking checkout
   */
  private async createNewOrder(booking: Booking, checkoutDto: CheckoutDto) {
    const totalPrice = booking.totalPrice;

    // Calculate deposit amount if needed
    let depositAmount = 0;
    let paymentAmount = 0;
    let paymentType = 'REMAINING';

    if (
      checkoutDto.makeDeposit ||
      (checkoutDto.depositValue && checkoutDto.depositValue >= totalPrice)
    ) {
      const depositValue =
        checkoutDto.depositValue || this.MIN_DEPOSIT_PERCENTAGE;
      const isPercentage = checkoutDto.isDepositPercentage !== false;

      let amountToPay = 0;

      if (isPercentage) {
        if (depositValue < this.MIN_DEPOSIT_PERCENTAGE || depositValue > 100) {
          throw new BadRequestException(
            `Deposit percentage must be between ${this.MIN_DEPOSIT_PERCENTAGE} and 100`,
          );
        }
        amountToPay = (totalPrice * depositValue) / 100;
      } else {
        const minDepositAmount =
          (totalPrice * this.MIN_DEPOSIT_PERCENTAGE) / 100;
        if (depositValue < minDepositAmount && depositValue < totalPrice) {
          throw new BadRequestException(
            `Deposit amount must be at least ${minDepositAmount}`,
          );
        }
        amountToPay = Math.min(depositValue, totalPrice);
      }

      if (amountToPay >= totalPrice) {
        paymentAmount = totalPrice;
        paymentType = 'FULL';
      } else {
        depositAmount = amountToPay;
        paymentAmount = amountToPay;
        paymentType = 'DEPOSIT';
      }
    }

    // Generate reference number
    const referenceNumber = `ORD-${booking.id.substring(0, 8)}-${Date.now().toString().slice(-6)}`;

    // Create order
    const order = await this.databaseService.order.create({
      data: {
        booking: { connect: { id: checkoutDto.bookingId } },
        referenceNumber,
        totalPrice,
        status: 'UNPAID',
      },
      include: { payments: true },
    });

    // Create payment if amount > 0
    if (paymentAmount > 0) {
      const payment = await this.paymentService.createPayment({
        orderId: order.id,
        amount: paymentAmount,
        method: checkoutDto.paymentMethod || 'CASH',
        paymentType: paymentType as 'DEPOSIT' | 'FULL' | 'REMAINING',
        description:
          paymentType === 'DEPOSIT'
            ? `Deposit (${Math.round((depositAmount / totalPrice) * 100)}%)`
            : paymentType === 'FULL'
              ? 'Full payment'
              : 'Remaining balance',
      });

      // For non-E-WALLET, mark as successful immediately
      if ((checkoutDto.paymentMethod || 'CASH') !== 'E_WALLET') {
        await this.completeNonEWalletPayment(payment.id, checkoutDto.txnId);
      }
    }

    return this.getOrderDetails(order.id);
  }

  /**
   * Pay remaining balance for existing order
   */
  async payRemaining(bookingId: string, payRemainingDto: CheckoutDto) {
    const order = await this.databaseService.order.findUnique({
      where: { bookingId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException(`Order for booking ${bookingId} not found`);
    }

    if (order.status === 'PAID') {
      throw new BadRequestException('Order is already fully paid');
    }

    // Calculate balance remaining
    const totalPaid = order.payments
      .filter((p) => p.status === 'SUCCESSFUL')
      .reduce((sum, p) => sum + p.amount, 0);
    const balanceRemaining = order.totalPrice - totalPaid;

    if (balanceRemaining <= 0) {
      throw new BadRequestException('Order is already fully paid');
    }

    // Create remaining payment
    const payment = await this.paymentService.createPayment({
      orderId: order.id,
      amount: balanceRemaining,
      method: payRemainingDto.paymentMethod || 'CASH',
      paymentType: 'REMAINING',
      description: 'Remaining balance',
    });

    // For non-E-WALLET, mark as successful immediately
    if ((payRemainingDto.paymentMethod || 'CASH') !== 'E_WALLET') {
      await this.completeNonEWalletPayment(payment.id, payRemainingDto.txnId);
    }

    return this.getOrderDetails(order.id);
  }

  /**
   * Complete non-E-WALLET payment immediately
   */
  private async completeNonEWalletPayment(paymentId: string, txnId?: string) {
    // Create attempt
    const attempt = await this.paymentAttemptService.createAttempt({
      paymentId,
      attemptNumber: 1,
      status: 'SUCCESS',
      attemptedAmount:
        (
          await this.databaseService.payment.findUnique({
            where: { id: paymentId },
          })
        )?.amount || 0,
    });

    // Record gateway transaction
    if (txnId) {
      await this.gatewayTransactionService.recordTransaction({
        paymentId,
        paymentAttemptId: attempt.id,
        gatewayProvider: 'manual',
        gatewayTransactionId: txnId,
        amount: attempt.attemptedAmount,
        gatewayStatus: 'SUCCESS',
      });
    }

    // Mark as successful
    await this.paymentService.completePaymentAttempt(
      attempt.id,
      'SUCCESS',
      '0',
      'Manual payment',
    );
  }

  /**
   * Get all orders
   */
  async findAll() {
    const orders = await this.databaseService.order.findMany({
      include: {
        booking: {
          include: {
            packages: true,
            services: true,
          },
        },
        payments: {
          include: { attempts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary for each order
    return orders.map((order) => {
      const totalPaid = order.payments
        .filter((p) => p.status === 'SUCCESSFUL')
        .reduce((sum, p) => sum + p.amount, 0);

      const remainingAmount = Math.max(0, order.totalPrice - totalPaid);

      return {
        ...order,
        summary: {
          totalPrice: order.totalPrice,
          depositAmount: 0,
          remainingAmount,
          depositPaid: 0,
          remainingPaid: 0,
          totalPaid,
          isPaid: remainingAmount === 0,
          pendingAmount: remainingAmount,
        },
      };
    });
  }

  /**
   * Get order by ID with full details
   */
  async getOrderDetails(orderId: string) {
    const order = await this.databaseService.order.findUnique({
      where: { id: orderId },
      include: {
        booking: {
          include: {
            packages: true,
            services: true,
            customer: true,
          },
        },
        payments: {
          include: {
            attempts: { include: { gatewayTransaction: true } },
            gatewayTransactions: true,
          },
          orderBy: { paymentSequence: 'asc' },
        },
        refunds: {
          include: { attempts: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Calculate summaries
    const totalPaid = order.payments
      .filter((p) => p.status === 'SUCCESSFUL')
      .reduce((sum, p) => sum + p.amount, 0);

    const balanceRemaining = Math.max(0, order.totalPrice - totalPaid);

    return {
      ...order,
      summary: {
        totalPrice: order.totalPrice,
        depositAmount: 0,
        remainingAmount: balanceRemaining,
        depositPaid: 0,
        remainingPaid: 0,
        totalPaid,
        isPaid: balanceRemaining === 0,
        pendingAmount: balanceRemaining,
      },
    };
  }

  /**
   * Get order by booking ID (legacy support)
   */
  async findOneByBookingId(bookingId: string) {
    const order = await this.databaseService.order.findUnique({
      where: { bookingId },
      include: {
        booking: {
          include: {
            packages: true,
            services: true,
            customer: true,
          },
        },
        payments: {
          include: { attempts: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order for booking ${bookingId} not found`);
    }

    return this.getOrderDetails(order.id);
  }

  /**
   * Get order status by booking ID
   */
  async getOrderStatus(bookingId: string) {
    const foundOrder = await this.databaseService.order.findUnique({
      where: { bookingId },
    });
    if (!foundOrder) {
      throw new NotFoundException(`Order not found for booking ${bookingId}`);
    }
    const order = await this.getOrderDetails(foundOrder.id);

    return {
      bookingId: order.bookingId,
      orderId: order.id,
      status: order.status,
      ...order.summary,
    };
  }

  /**
   * Initiate MOMO payment for E-WALLET payment method
   */
  async initiateMomoPayment(orderId: string, paymentId: string) {
    const payment = await this.databaseService.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    try {
      const momoResponse = await this.momoService.createPayment({
        amount: payment.amount,
        bookingId: payment.order.bookingId,
        orderInfo: `Payment for order ${payment.order.referenceNumber}`,
        extraData: JSON.stringify({
          orderId: payment.orderId,
          paymentId: payment.id,
          bookingId: payment.order.bookingId,
          orderType: 'wedding-booking',
        }),
      });

      return momoResponse;
    } catch (error) {
      throw new BadRequestException(
        `Failed to initiate MOMO payment: ${error.message}`,
      );
    }
  }

  /**
   * Check MOMO payment status
   */
  async checkMomoPaymentStatus(
    orderId: string,
  ): Promise<MomoTransactionQueryResponse> {
    try {
      this.logger.log(`Checking Momo payment status for orderId: ${orderId}`);
      const status = await this.momoService.queryTransactionStatus(orderId);
      this.logger.log(`Momo payment status: ${JSON.stringify(status)}`);
      return status;
    } catch (error) {
      this.logger.error(
        `Failed to check Momo payment status: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException(
        `Failed to check payment status: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Handle MOMO IPN (Instant Payment Notification) callback
   */
  async handleMomoCallback(
    callbackData: Partial<MomoIPNCallback>,
  ): Promise<MomoIPNResponse> {
    try {
      this.logger.log(`Received IPN Callback: ${JSON.stringify(callbackData)}`);

      if (
        !callbackData.orderId ||
        !callbackData.signature ||
        callbackData.resultCode === undefined
      ) {
        this.logger.error('Missing required callback fields', callbackData);
        return { resultCode: 1, message: 'Missing required fields' };
      }

      // Extract bookingId from extraData
      let bookingId = callbackData.orderId;
      let paymentId: string | null = null;
      try {
        const extraData = JSON.parse(callbackData.extraData || '{}');
        if (extraData.bookingId) {
          bookingId = extraData.bookingId;
          paymentId = extraData.paymentId;
        }
      } catch {
        this.logger.warn('Failed to parse extraData');
      }

      // Verify signature
      const isSignatureValid = this.momoService.verifyIPNSignature(
        callbackData as MomoIPNCallback,
        callbackData.signature,
      );

      if (!isSignatureValid) {
        this.logger.error(`Invalid signature for bookingId: ${bookingId}`);
        return { resultCode: 1, message: 'Invalid signature' };
      }

      // Check idempotency
      const transIdStr = callbackData.transId?.toString() || '';
      const existingTransaction =
        await this.gatewayTransactionService.getByGatewayTransactionId(
          'momo',
          transIdStr,
        );

      if (existingTransaction) {
        this.logger.log(
          `Idempotent request detected. Transaction already processed`,
        );
        return {
          resultCode: 0,
          message: 'Transaction already processed',
        };
      }

      const isPaymentSuccessful =
        callbackData.resultCode === 0 || callbackData.resultCode === 9000;

      if (!isPaymentSuccessful) {
        this.logger.warn(
          `Payment failed for bookingId: ${bookingId}, resultCode: ${callbackData.resultCode}`,
        );

        // Find order and payment
        const order = await this.databaseService.order.findUnique({
          where: { bookingId },
        });

        if (order && paymentId) {
          const payment = await this.databaseService.payment.findUnique({
            where: { id: paymentId },
          });

          if (payment) {
            // Create failed attempt
            await this.paymentAttemptService.createAttempt({
              paymentId,
              attemptNumber: 1,
              status: 'FAILED',
              attemptedAmount: payment.amount,
            });

            await this.paymentService.updatePayment(paymentId, {
              status: 'FAILED',
            });

            this.paymentEventsService.emitPaymentFailed({
              bookingId,
              transId: callbackData.transId?.toString() || '',
              amount: callbackData.amount || 0,
              method: 'E_WALLET',
              timestamp: new Date(),
              message: callbackData.message || '',
              resultCode: callbackData.resultCode,
            });
          }
        }

        return {
          resultCode: 0,
          message: 'Callback received (payment failed)',
        };
      }

      // Get order and payment
      const order = await this.databaseService.order.findUnique({
        where: { bookingId },
        include: { payments: true },
      });

      if (!order) {
        this.logger.error(`Order not found for bookingId: ${bookingId}`);
        return { resultCode: 1, message: 'Order not found' };
      }

      if (!paymentId) {
        this.logger.error('Payment ID not found in callback');
        return { resultCode: 1, message: 'Payment ID not found' };
      }

      // Record gateway transaction and mark payment as successful
      const amount = callbackData.amount || 0;

      // Create attempt
      const attempt = await this.paymentAttemptService.createAttempt({
        paymentId,
        attemptNumber: 1,
        status: 'SUCCESS',
        attemptedAmount: amount,
      });

      // Record gateway transaction
      await this.gatewayTransactionService.recordTransaction({
        paymentId,
        paymentAttemptId: attempt.id,
        gatewayProvider: 'momo',
        gatewayTransactionId: callbackData.transId?.toString(),
        gatewayOrderId: callbackData.orderId,
        amount,
        gatewayStatus: callbackData.resultCode?.toString(),
        gatewayResponse: callbackData,
      });

      // Mark payment as successful
      await this.paymentService.completePaymentAttempt(
        attempt.id,
        'SUCCESS',
        callbackData.resultCode?.toString(),
        callbackData.message,
      );

      // Emit events
      this.paymentEventsService.emitPaymentSuccessful({
        bookingId,
        transId: callbackData.transId?.toString() || '',
        amount,
        method: 'E_WALLET',
        timestamp: new Date(),
        message: 'Payment confirmed via Momo IPN',
        resultCode: callbackData.resultCode,
      });

      this.logger.log(
        `Payment processed successfully for bookingId: ${bookingId}`,
      );

      return { resultCode: 0, message: 'Callback received successfully' };
    } catch (error) {
      this.logger.error(
        `Error processing IPN callback: ${error.message}`,
        error.stack,
      );
      return {
        resultCode: 0,
        message: 'Callback received but processing had errors',
      };
    }
  }
}
