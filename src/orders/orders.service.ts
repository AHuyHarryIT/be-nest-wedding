import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Booking,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  RefundReason,
} from 'generated/prisma';
import { DatabaseService } from '../database/database.service';
import { PaymentEventsService } from '../payments/events/payment-events.service';
import {
  MomoIPNCallback,
  MomoIPNResponse,
  MomoPaymentService,
} from '../payments/momo.service';
import { PaymentAttemptService } from '../payments/payment-attempt.service';
import { PaymentCoreService as PaymentService } from '../payments/payment-core.service';
import { RefundService } from '../payments/refund.service';
import { MomoTransactionQueryResponse } from '../payments/momo.service';
import { CheckoutDto, PayRemainingDto } from './dto';

@Injectable()
export class OrdersService {
  private readonly MIN_DEPOSIT_PERCENTAGE = 30;
  private readonly STALE_PENDING_DEPOSIT_MS = 30 * 60 * 1000;
  private readonly logger = new Logger('OrdersService');

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly momoService: MomoPaymentService,
    private readonly paymentService: PaymentService,
    private readonly paymentAttemptService: PaymentAttemptService,
    private readonly paymentEventsService: PaymentEventsService,
    private readonly refundService: RefundService,
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
    }

    if (existingOrder.status === 'UNPAID') {
      return this.collectForUnpaidExistingOrder(
        existingOrder.id,
        booking,
        checkoutDto,
      );
    }

    return this.payRemaining(checkoutDto.bookingId, {
      paymentAmount: 0,
      paymentMethod: checkoutDto.paymentMethod,
      note: checkoutDto.note,
      txnId: checkoutDto.txnId,
    });
  }

  private async collectForUnpaidExistingOrder(
    orderId: string,
    booking: Booking,
    checkoutDto: CheckoutDto,
  ) {
    const totalPrice = booking.totalPrice;

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

    if (paymentAmount > 0) {
      const payment = await this.paymentService.createPayment({
        orderId,
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

      if ((checkoutDto.paymentMethod || 'CASH') !== 'E_WALLET') {
        await this.completeNonEWalletPayment(payment.id, checkoutDto.txnId);
      }
    }

    return this.getOrderDetails(orderId);
  }

  async customerCheckoutDeposit(
    bookingId: string,
    customerId: string,
    redirectUrl?: string,
  ) {
    const booking = await this.databaseService.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (booking.customerId !== customerId) {
      throw new ForbiddenException('You cannot pay for this booking');
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      throw new BadRequestException(
        'Deposit payment is not available for this booking status',
      );
    }

    const existingOrder = await this.databaseService.order.findUnique({
      where: { bookingId },
      include: { payments: true },
    });

    if (!existingOrder) {
      const createdOrder = await this.createNewOrder(booking, {
        bookingId,
        makeDeposit: true,
        depositValue: this.MIN_DEPOSIT_PERCENTAGE,
        isDepositPercentage: true,
        paymentMethod: PaymentMethod.E_WALLET,
      });

      const depositPayment = createdOrder.payments?.find(
        (payment) =>
          payment.paymentType === PaymentType.DEPOSIT &&
          payment.status === PaymentStatus.PENDING,
      );

      if (!depositPayment) {
        throw new BadRequestException('Unable to create deposit payment');
      }

      const momo = await this.initiateMomoPayment(
        createdOrder.bookingId,
        depositPayment.id,
        redirectUrl,
      );

      return {
        order: createdOrder,
        paymentId: depositPayment.id,
        momo,
      };
    }

    const { outstandingDepositAmount, isDepositComplete } =
      this.calculateDepositProgress(existingOrder);

    if (isDepositComplete) {
      throw new BadRequestException(
        'Deposit has already been recorded for this booking',
      );
    }

    const hasStaffManagedPayment = existingOrder.payments.some(
      (payment) =>
        payment.paymentType !== PaymentType.DEPOSIT &&
        payment.status !== PaymentStatus.CANCELLED,
    );

    if (hasStaffManagedPayment) {
      throw new BadRequestException(
        'This booking payment is already being managed by the studio. Please continue in Messages.',
      );
    }

    let depositPayment = existingOrder.payments.find(
      (payment) =>
        payment.paymentType === PaymentType.DEPOSIT &&
        payment.status === PaymentStatus.PENDING,
    );

    if (depositPayment) {
      const isPendingPaymentFresh =
        Date.now() - depositPayment.updatedAt.getTime() <=
        this.STALE_PENDING_DEPOSIT_MS;

      if (!isPendingPaymentFresh) {
        this.logger.warn(
          `Pending deposit payment ${depositPayment.id} is stale for booking ${bookingId}; rotating to new payment`,
        );
        await this.paymentService.updatePayment(depositPayment.id, {
          status: PaymentStatus.ABANDONED,
        });
        depositPayment = undefined;
      }
    }

    if (!depositPayment) {
      depositPayment = await this.paymentService.createPayment({
        orderId: existingOrder.id,
        amount: outstandingDepositAmount,
        method: PaymentMethod.E_WALLET,
        paymentType: PaymentType.DEPOSIT,
        description: `Customer deposit (${this.MIN_DEPOSIT_PERCENTAGE}%)`,
      });
    }

    if (!depositPayment) {
      throw new BadRequestException('Unable to prepare deposit payment');
    }

    const momo = await this.initiateMomoPayment(
      bookingId,
      depositPayment.id,
      redirectUrl,
    );
    const order = await this.getOrderDetails(existingOrder.id);

    return {
      order,
      paymentId: depositPayment.id,
      momo,
    };
  }

  private calculateDepositProgress(order: {
    totalPrice: number;
    payments: Array<{
      amount: number;
      status: PaymentStatus;
      paymentType: PaymentType;
    }>;
  }) {
    const requiredDepositAmount =
      (order.totalPrice * this.MIN_DEPOSIT_PERCENTAGE) / 100;

    const successfulDepositAmount = order.payments
      .filter(
        (payment) =>
          payment.paymentType === PaymentType.DEPOSIT &&
          payment.status === PaymentStatus.SUCCESSFUL,
      )
      .reduce((sum, payment) => sum + payment.amount, 0);

    const outstandingDepositAmount = Math.max(
      0,
      requiredDepositAmount - successfulDepositAmount,
    );

    return {
      requiredDepositAmount,
      successfulDepositAmount,
      outstandingDepositAmount,
      isDepositComplete: outstandingDepositAmount <= 0,
    };
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
  async payRemaining(bookingId: string, payRemainingDto: PayRemainingDto) {
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

    await this.paymentService.completePaymentAttempt(
      attempt.id,
      'SUCCESS',
      txnId || '0',
      'Manual payment',
    );
  }

  private buildOrderSummary(order: {
    totalPrice: number;
    payments: Array<{ amount: number; status: PaymentStatus }>;
  }) {
    const totalPaid = order.payments
      .filter((payment) => payment.status === PaymentStatus.SUCCESSFUL)
      .reduce((sum, payment) => sum + payment.amount, 0);

    const balanceRemaining = Math.max(0, order.totalPrice - totalPaid);

    return {
      totalPrice: order.totalPrice,
      totalPaid,
      remainingAmount: balanceRemaining,
      balanceRemaining,
      pendingAmount: balanceRemaining,
      isPaid: balanceRemaining === 0,
    };
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

    return orders.map((order) => ({
      ...order,
      summary: this.buildOrderSummary(order),
    }));
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
            attempts: true,
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

    return {
      ...order,
      summary: this.buildOrderSummary(order),
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
  async initiateMomoPayment(
    orderId: string,
    paymentId: string,
    redirectUrl?: string,
  ) {
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
        redirectUrl,
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

  private extractBookingIdFromMomoOrderId(orderId: string): string {
    const separatorIndex = orderId.lastIndexOf('_');
    return separatorIndex >= 0 ? orderId.slice(0, separatorIndex) : orderId;
  }

  private async finalizeSuccessfulMomoPayment(
    paymentId: string,
    gatewayOrderId: string,
    status: MomoTransactionQueryResponse | Partial<MomoIPNCallback>,
  ): Promise<void> {
    const payment = await this.databaseService.payment.findUnique({
      where: { id: paymentId },
      include: {
        attempts: true,
      },
    });

    if (!payment) {
      this.logger.warn(
        `Unable to finalize successful Momo payment because payment ${paymentId} was not found`,
      );
      return;
    }

    const transId = status.transId?.toString();
    const existingSuccessfulAttemptForTransId = transId
      ? payment.attempts.find(
          (attempt) =>
            attempt.status === 'SUCCESS' && attempt.resultCode === transId,
        )
      : undefined;

    if (payment.status === PaymentStatus.SUCCESSFUL) {
      if (!existingSuccessfulAttemptForTransId) {
        await this.createDuplicateDepositRefundIfNeeded(
          payment,
          gatewayOrderId,
          status,
        );
      }

      await this.paymentService.updateOrderStatus(payment.orderId);
      return;
    }

    const successfulAttempt = payment.attempts.find(
      (attempt) =>
        attempt.status === 'SUCCESS' &&
        (!transId || attempt.resultCode === transId),
    );

    const attempt =
      successfulAttempt ||
      (await this.paymentAttemptService.createAttempt({
        paymentId: payment.id,
        attemptNumber: payment.attempts.length + 1,
        status: 'SUCCESS',
        attemptedAmount: payment.amount,
      }));

    await this.paymentService.completePaymentAttempt(
      attempt.id,
      'SUCCESS',
      status.resultCode?.toString(),
      status.message,
    );
  }

  private async createDuplicateDepositRefundIfNeeded(
    payment: {
      id: string;
      orderId: string;
      paymentType: PaymentType;
      method: PaymentMethod;
      amount: number;
    },
    gatewayOrderId: string,
    status: MomoTransactionQueryResponse | Partial<MomoIPNCallback>,
  ): Promise<void> {
    if (
      payment.paymentType !== PaymentType.DEPOSIT ||
      payment.method !== PaymentMethod.E_WALLET
    ) {
      return;
    }

    const duplicateCaptureKey = status.transId
      ? `momo-duplicate-trans-${status.transId}`
      : `momo-duplicate-order-${gatewayOrderId}`;

    const existingDuplicateRefund = await this.databaseService.refund.findFirst(
      {
        where: {
          orderId: payment.orderId,
          originalPaymentId: payment.id,
          reason: RefundReason.DUPLICATE,
          notes: { contains: duplicateCaptureKey },
        },
      },
    );

    if (existingDuplicateRefund) {
      return;
    }

    await this.refundService.createRefund({
      orderId: payment.orderId,
      originalPaymentId: payment.id,
      amount: payment.amount,
      reason: RefundReason.DUPLICATE,
      description: 'Automatic refund for duplicate MOMO deposit capture',
      notes: duplicateCaptureKey,
    });

    this.logger.warn(
      `Created duplicate deposit refund for payment ${payment.id} (capture key: ${duplicateCaptureKey})`,
    );
  }

  private async reconcileSuccessfulMomoStatusQuery(
    momoOrderId: string,
    status: MomoTransactionQueryResponse,
  ): Promise<void> {
    const bookingId = this.extractBookingIdFromMomoOrderId(momoOrderId);
    if (!bookingId) {
      return;
    }

    const order = await this.databaseService.order.findUnique({
      where: { bookingId },
      include: {
        payments: {
          include: {
            attempts: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!order) {
      this.logger.warn(
        `Could not reconcile Momo query success because no order was found for booking ${bookingId}`,
      );
      return;
    }

    const paymentToReconcile = order.payments.find(
      (payment) =>
        payment.method === PaymentMethod.E_WALLET &&
        payment.status !== PaymentStatus.SUCCESSFUL &&
        payment.status !== PaymentStatus.CANCELLED &&
        payment.status !== PaymentStatus.REFUNDED,
    );

    const successfulPayment = order.payments.find(
      (payment) => payment.status === PaymentStatus.SUCCESSFUL,
    );

    if (paymentToReconcile) {
      await this.finalizeSuccessfulMomoPayment(
        paymentToReconcile.id,
        momoOrderId,
        status,
      );
      return;
    }

    if (successfulPayment) {
      await this.paymentService.updateOrderStatus(order.id);
      return;
    }

    this.logger.warn(
      `Momo query reported success for booking ${bookingId}, but no reconcilable wallet payment was found`,
    );
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

      if (status.resultCode === 0 || status.resultCode === 9000) {
        await this.reconcileSuccessfulMomoStatusQuery(orderId, status);
      }

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
      const existingAttempt = transIdStr
        ? await this.databaseService.paymentAttempt.findFirst({
            where: {
              status: 'SUCCESS',
              resultCode: transIdStr,
            },
            select: { paymentId: true },
          })
        : null;

      if (existingAttempt?.paymentId) {
        await this.finalizeSuccessfulMomoPayment(
          existingAttempt.paymentId,
          callbackData.orderId,
          callbackData,
        );
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

      const amount = callbackData.amount || 0;
      await this.finalizeSuccessfulMomoPayment(
        paymentId,
        callbackData.orderId,
        callbackData,
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
