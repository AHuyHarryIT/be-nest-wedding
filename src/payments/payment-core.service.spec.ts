import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus, OrderStatus, PaymentStatus } from 'generated/prisma';
import { PaymentService } from './payment-core.service';
import { DatabaseService } from '../database/database.service';
import { PaymentRepository } from '../common/repositories';
import { PaymentAttemptService } from './payment-attempt.service';
import { PaymentGatewayTransactionService } from './payment-gateway-transaction.service';

describe('PaymentService', () => {
  let service: PaymentService;

  const databaseServiceMock = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      updateMany: jest.fn(),
    },
  };

  const paymentRepositoryMock = {};
  const paymentAttemptServiceMock = {};
  const paymentGatewayTransactionServiceMock = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: DatabaseService, useValue: databaseServiceMock },
        { provide: PaymentRepository, useValue: paymentRepositoryMock },
        { provide: PaymentAttemptService, useValue: paymentAttemptServiceMock },
        {
          provide: PaymentGatewayTransactionService,
          useValue: paymentGatewayTransactionServiceMock,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('confirms a pending booking when any successful payment exists', async () => {
    databaseServiceMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      bookingId: 'booking-1',
      totalPrice: 100000,
      payments: [
        {
          amount: 30000,
          status: PaymentStatus.SUCCESSFUL,
        },
      ],
    });
    databaseServiceMock.order.update.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PARTIAL,
      totalPaid: 30000,
      balanceRemaining: 70000,
    });

    await service.updateOrderStatus('order-1');

    expect(databaseServiceMock.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: {
        status: OrderStatus.PARTIAL,
        totalPaid: 30000,
        balanceRemaining: 70000,
      },
    });
    expect(databaseServiceMock.booking.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'booking-1',
        status: BookingStatus.PENDING,
      },
      data: {
        status: BookingStatus.DEPOSIT_PAID,
      },
    });
  });

  it('does not confirm a booking when no successful payment exists', async () => {
    databaseServiceMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      bookingId: 'booking-1',
      totalPrice: 100000,
      payments: [
        {
          amount: 30000,
          status: PaymentStatus.PENDING,
        },
      ],
    });
    databaseServiceMock.order.update.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.UNPAID,
      totalPaid: 0,
      balanceRemaining: 100000,
    });

    await service.updateOrderStatus('order-1');

    expect(databaseServiceMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it('promotes a deposit-paid booking to confirmed after full payment', async () => {
    databaseServiceMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      bookingId: 'booking-1',
      totalPrice: 100000,
      payments: [
        {
          amount: 100000,
          status: PaymentStatus.SUCCESSFUL,
        },
      ],
    });
    databaseServiceMock.order.update.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PAID,
      totalPaid: 100000,
      balanceRemaining: 0,
    });

    await service.updateOrderStatus('order-1');

    expect(databaseServiceMock.booking.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'booking-1',
        status: {
          in: [BookingStatus.PENDING, BookingStatus.DEPOSIT_PAID],
        },
      },
      data: {
        status: BookingStatus.CONFIRMED,
      },
    });
  });
});
