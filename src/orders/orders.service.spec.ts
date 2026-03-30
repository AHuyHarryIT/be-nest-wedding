import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, PaymentStatus } from 'generated/prisma';
import { OrdersService } from './orders.service';
import { DatabaseService } from '../database/database.service';
import { MomoPaymentService } from '../payments/momo.service';
import { PaymentService } from '../payments/payment-core.service';
import { PaymentAttemptService } from '../payments/payment-attempt.service';
import { PaymentGatewayTransactionService } from '../payments/payment-gateway-transaction.service';
import { PaymentEventsService } from '../payments/events/payment-events.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const databaseServiceMock = {
    paymentGatewayTransaction: {
      findFirst: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
    },
  };

  const momoPaymentServiceMock = {
    queryTransactionStatus: jest.fn(),
  };

  const paymentServiceMock = {
    completePaymentAttempt: jest.fn(),
    updateOrderStatus: jest.fn(),
  };

  const paymentAttemptServiceMock = {
    createAttempt: jest.fn(),
  };

  const paymentGatewayTransactionServiceMock = {
    recordTransaction: jest.fn(),
    getByGatewayTransactionId: jest.fn(),
  };

  const paymentEventsServiceMock = {
    emitPaymentSuccessful: jest.fn(),
    emitPaymentFailed: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: DatabaseService, useValue: databaseServiceMock },
        { provide: MomoPaymentService, useValue: momoPaymentServiceMock },
        { provide: PaymentService, useValue: paymentServiceMock },
        { provide: PaymentAttemptService, useValue: paymentAttemptServiceMock },
        {
          provide: PaymentGatewayTransactionService,
          useValue: paymentGatewayTransactionServiceMock,
        },
        {
          provide: PaymentEventsService,
          useValue: paymentEventsServiceMock,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('reconciles a successful Momo status query into the local payment record', async () => {
    momoPaymentServiceMock.queryTransactionStatus.mockResolvedValue({
      partnerCode: 'MOMO',
      requestId: 'booking-1_123',
      orderId: 'booking-1_123',
      transId: 'txn-1',
      resultCode: 0,
      message: 'Successful.',
      responseTime: 1,
    });
    databaseServiceMock.paymentGatewayTransaction.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    databaseServiceMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      bookingId: 'booking-1',
      payments: [
        {
          id: 'payment-1',
          amount: 97500,
          method: PaymentMethod.E_WALLET,
          status: PaymentStatus.PENDING,
          attempts: [],
        },
      ],
    });
    databaseServiceMock.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      amount: 97500,
      status: PaymentStatus.PENDING,
      attempts: [],
    });
    paymentAttemptServiceMock.createAttempt.mockResolvedValue({
      id: 'attempt-1',
    });

    const result = await service.checkMomoPaymentStatus('booking-1_123');

    expect(result.resultCode).toBe(0);
    expect(paymentAttemptServiceMock.createAttempt).toHaveBeenCalledWith({
      paymentId: 'payment-1',
      attemptNumber: 1,
      status: 'SUCCESS',
      attemptedAmount: 97500,
    });
    expect(
      paymentGatewayTransactionServiceMock.recordTransaction,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment-1',
        gatewayOrderId: 'booking-1_123',
        gatewayTransactionId: 'txn-1',
      }),
    );
    expect(paymentServiceMock.completePaymentAttempt).toHaveBeenCalledWith(
      'attempt-1',
      'SUCCESS',
      '0',
      'Successful.',
    );
  });
});
