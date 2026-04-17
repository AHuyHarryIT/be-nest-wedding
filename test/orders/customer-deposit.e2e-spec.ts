import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { DatabaseModule } from '../../src/database/database.module';
import { DatabaseService } from '../../src/database/database.service';
import { CommonModule } from '../../src/common/common.module';
import { AuthModule } from '../../src/auth/auth.module';
import { PaymentsModule } from '../../src/payments/payments.module';
import { OrdersModule } from '../../src/orders/orders.module';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from '../../src/common/exceptions/global-exception.filter';
import {
  PrismaClientExceptionFilter,
  PrismaExceptionFilter,
} from '../../src/common/filters/prisma-exception';
import { GlobalValidationPipe } from '../../src/common/exceptions/validation.pipe';
import { MomoPaymentService } from '../../src/payments/momo.service';
import { SessionModule } from '../../src/auth/session/session.module';
import { UsersModule } from '../../src/users/users.module';

type StaffUser = {
  id: string;
  phoneNumber: string;
};

type CustomerUser = {
  id: string;
  phoneNumber: string;
};

type SeededFixture = {
  ownerCustomer: CustomerUser;
  foreignCustomer: CustomerUser;
  staffUser: StaffUser;
  ownerBookingId: string;
  foreignBookingId: string;
  cancelledBookingId: string;
  completedBookingId: string;
  duplicatePaidBookingId: string;
  staffManagedBookingId: string;
};

describe('Customer Orders deposit checkout (e2e)', () => {
  let app: INestApplication<App>;
  let databaseService: DatabaseService;
  let fixture: SeededFixture;
  let momoCreatePaymentMock: jest.Mock;
  const now = Date.now();

  beforeAll(async () => {
    momoCreatePaymentMock = jest.fn(async ({ bookingId, amount, orderInfo }) => ({
      partnerCode: 'MOMO',
      bookingId,
      requestId: `req_${bookingId}`,
      amount,
      orderInfo,
      orderType: 'wedding-booking',
      transId: 0,
      resultCode: 0,
      message: 'Mocked payment created',
      payUrl: `https://momo.test/pay/${bookingId}`,
      qrCodeUrl: null,
      qrCode: null,
      deeplink: null,
      signature: 'mock-signature',
      responseTime: Date.now(),
      orderId: `${bookingId}_mocked_order`,
    }));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.dev', '.env'],
        }),
        EventEmitterModule.forRoot(),
        DatabaseModule,
        CommonModule,
        UsersModule,
        SessionModule,
        AuthModule,
        PaymentsModule,
        OrdersModule,
      ],
    })
      .overrideProvider(MomoPaymentService)
      .useValue({
        createPayment: momoCreatePaymentMock,
        queryTransactionStatus: jest.fn(),
        verifyIPNSignature: jest.fn().mockReturnValue(true),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new GlobalValidationPipe(), new ValidationPipe({ transform: true }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(
      new PrismaExceptionFilter(),
      new PrismaClientExceptionFilter(),
      new GlobalExceptionFilter(),
    );

    await app.init();

    databaseService = app.get(DatabaseService);

    fixture = await seedFixture(databaseService, now);
  });

  afterAll(async () => {
    if (databaseService) {
      await cleanupFixture(databaseService, now);
    }
    if (app) {
      await app.close();
    }
  });

  it('returns 201 + envelope + momo payload for eligible booking owner', async () => {
    const ownerToken = await loginCustomer(
      app,
      fixture.ownerCustomer.phoneNumber,
      '123456',
    );

    const response = await request(app.getHttpServer())
      .post(`/customer/orders/${fixture.ownerBookingId}/deposit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        redirectUrl:
          'http://localhost:5174/bookings/payment-result?bookingId=test-booking',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Deposit payment initiated successfully');
    expect(response.body.data).toEqual(
      expect.objectContaining({
        paymentId: expect.any(String),
        momo: expect.objectContaining({
          orderId: expect.any(String),
          payUrl: expect.any(String),
        }),
      }),
    );
  });

  it('denies non-owner booking access with deterministic 403 message', async () => {
    const foreignToken = await loginCustomer(
      app,
      fixture.foreignCustomer.phoneNumber,
      '123456',
    );

    const response = await request(app.getHttpServer())
      .post(`/customer/orders/${fixture.ownerBookingId}/deposit`)
      .set('Authorization', `Bearer ${foreignToken}`)
      .send({
        redirectUrl:
          'http://localhost:5174/bookings/payment-result?bookingId=foreign-check',
      })
      .expect(403);

    expect(response.body.code).toBe('FORBIDDEN');
    expect(response.body.message).toBe('You cannot pay for this booking');
  });

  it.each([
    {
      status: 'CANCELLED',
      bookingId: () => fixture.cancelledBookingId,
    },
    {
      status: 'COMPLETED',
      bookingId: () => fixture.completedBookingId,
    },
  ])(
    'denies blocked lifecycle status $status with deterministic 400 message',
    async ({ bookingId }) => {
      const ownerToken = await loginCustomer(
        app,
        fixture.ownerCustomer.phoneNumber,
        '123456',
      );

      const response = await request(app.getHttpServer())
        .post(`/customer/orders/${bookingId()}/deposit`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          redirectUrl:
            'http://localhost:5174/bookings/payment-result?bookingId=blocked-status',
        })
        .expect(400);

      expect(response.body.code).toBe('BAD_REQUEST');
      expect(response.body.message).toBe(
        'Deposit payment is not available for this booking status',
      );
    },
  );

  it('denies duplicate successful deposit with deterministic 400 message', async () => {
    const ownerToken = await loginCustomer(
      app,
      fixture.ownerCustomer.phoneNumber,
      '123456',
    );

    const response = await request(app.getHttpServer())
      .post(`/customer/orders/${fixture.duplicatePaidBookingId}/deposit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        redirectUrl:
          'http://localhost:5174/bookings/payment-result?bookingId=duplicate',
      })
      .expect(400);

    expect(response.body.code).toBe('BAD_REQUEST');
    expect(response.body.message).toBe(
      'Deposit has already been recorded for this booking',
    );
  });

  it('denies staff-managed non-deposit path with exact messages fallback copy', async () => {
    const ownerToken = await loginCustomer(
      app,
      fixture.ownerCustomer.phoneNumber,
      '123456',
    );

    const response = await request(app.getHttpServer())
      .post(`/customer/orders/${fixture.staffManagedBookingId}/deposit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        redirectUrl:
          'http://localhost:5174/bookings/payment-result?bookingId=staff-managed',
      })
      .expect(400);

    expect(response.body.code).toBe('BAD_REQUEST');
    expect(response.body.message).toBe(
      'This booking payment is already being managed by the studio. Please continue in Messages.',
    );
  });
});

async function loginCustomer(
  app: INestApplication<App>,
  phoneNumber: string,
  password: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ phoneNumber, password })
    .expect(200);

  const accessToken =
    (response.body?.data?.accessToken as string | undefined) ||
    (response.body?.accessToken as string | undefined);

  if (!accessToken) {
    throw new Error(
      `Expected accessToken in /auth/login response body. Received: ${JSON.stringify(response.body)}`,
    );
  }

  return accessToken;
}

async function seedFixture(
  databaseService: DatabaseService,
  suffix: number,
): Promise<SeededFixture> {
  const passwordHash = await bcrypt.hash('123456', 10);

  const ownerCustomer = await databaseService.customer.create({
    data: {
      phoneNumber: `0915${suffix.toString().slice(-6)}`,
      passwordHash,
      firstName: 'Owner',
      lastName: 'Customer',
      email: `owner.deposit.${suffix}@example.com`,
      isActive: true,
    },
  });

  const foreignCustomer = await databaseService.customer.create({
    data: {
      phoneNumber: `0916${suffix.toString().slice(-6)}`,
      passwordHash,
      firstName: 'Foreign',
      lastName: 'Customer',
      email: `foreign.deposit.${suffix}@example.com`,
      isActive: true,
    },
  });

  const staffUser = await databaseService.staff.create({
    data: {
      id: `STF-DEP-${suffix}`,
      phoneNumber: `0917${suffix.toString().slice(-6)}`,
      passwordHash,
      firstName: 'Staff',
      lastName: 'Manager',
      email: `staff.deposit.${suffix}@example.com`,
      isActive: true,
    },
  });

  const orderReadPermission = await databaseService.permission.findUnique({
    where: { key: 'orders:read' },
  });

  const staffRole = await databaseService.role.create({
    data: {
      name: `deposit-role-${suffix}`,
      description: 'Role for deposit e2e test staff user',
      permissions: orderReadPermission
        ? {
            create: [{ permissionId: orderReadPermission.id }],
          }
        : undefined,
    },
  });

  await databaseService.staffRole.create({
    data: {
      staffId: staffUser.id,
      roleId: staffRole.id,
    },
  });

  const ownerBookingId = `11111111-1111-4111-8111-${suffix
    .toString()
    .slice(-12)
    .padStart(12, '0')}`;
  const foreignBookingId = `22222222-2222-4222-8222-${suffix
    .toString()
    .slice(-12)
    .padStart(12, '0')}`;
  const cancelledBookingId = `33333333-3333-4333-8333-${suffix
    .toString()
    .slice(-12)
    .padStart(12, '0')}`;
  const completedBookingId = `44444444-4444-4444-8444-${suffix
    .toString()
    .slice(-12)
    .padStart(12, '0')}`;
  const duplicatePaidBookingId = `55555555-5555-4555-8555-${suffix
    .toString()
    .slice(-12)
    .padStart(12, '0')}`;
  const staffManagedBookingId = `66666666-6666-4666-8666-${suffix
    .toString()
    .slice(-12)
    .padStart(12, '0')}`;

  await databaseService.booking.createMany({
    data: [
      {
        id: ownerBookingId,
        customerId: ownerCustomer.id,
        status: 'PENDING',
        eventDate: new Date('2027-01-10T08:00:00.000Z'),
        totalPrice: 1_000_000,
        notes: `fixture-${suffix}-owner-eligible`,
      },
      {
        id: foreignBookingId,
        customerId: foreignCustomer.id,
        status: 'PENDING',
        eventDate: new Date('2027-01-12T08:00:00.000Z'),
        totalPrice: 800_000,
        notes: `fixture-${suffix}-foreign-owner`,
      },
      {
        id: cancelledBookingId,
        customerId: ownerCustomer.id,
        status: 'CANCELLED',
        eventDate: new Date('2027-01-14T08:00:00.000Z'),
        totalPrice: 900_000,
        notes: `fixture-${suffix}-cancelled`,
      },
      {
        id: completedBookingId,
        customerId: ownerCustomer.id,
        status: 'COMPLETED',
        eventDate: new Date('2027-01-16T08:00:00.000Z'),
        totalPrice: 900_000,
        notes: `fixture-${suffix}-completed`,
      },
      {
        id: duplicatePaidBookingId,
        customerId: ownerCustomer.id,
        status: 'PENDING',
        eventDate: new Date('2027-01-18T08:00:00.000Z'),
        totalPrice: 1_300_000,
        notes: `fixture-${suffix}-duplicate-paid`,
      },
      {
        id: staffManagedBookingId,
        customerId: ownerCustomer.id,
        status: 'PENDING',
        eventDate: new Date('2027-01-20T08:00:00.000Z'),
        totalPrice: 1_500_000,
        notes: `fixture-${suffix}-staff-managed`,
      },
    ],
  });

  await databaseService.order.create({
    data: {
      bookingId: duplicatePaidBookingId,
      referenceNumber: `ORD-DUP-${suffix}`,
      totalPrice: 1_300_000,
      totalPaid: 390_000,
      balanceRemaining: 910_000,
      status: 'PARTIAL',
      payments: {
        create: [
          {
            paymentSequence: 1,
            paymentType: 'DEPOSIT',
            amount: 390_000,
            method: 'E_WALLET',
            status: 'SUCCESSFUL',
            description: 'Successful customer deposit',
            attemptCount: 1,
          },
        ],
      },
    },
  });

  await databaseService.order.create({
    data: {
      bookingId: staffManagedBookingId,
      referenceNumber: `ORD-STAFF-${suffix}`,
      totalPrice: 1_500_000,
      totalPaid: 0,
      balanceRemaining: 1_500_000,
      status: 'UNPAID',
      payments: {
        create: [
          {
            paymentSequence: 1,
            paymentType: 'REMAINING',
            amount: 1_500_000,
            method: 'BANK_TRANSFER',
            status: 'PENDING',
            description: 'Studio-managed remaining payment pending',
            attemptCount: 0,
          },
        ],
      },
    },
  });

  return {
    ownerCustomer,
    foreignCustomer,
    staffUser,
    ownerBookingId,
    foreignBookingId,
    cancelledBookingId,
    completedBookingId,
    duplicatePaidBookingId,
    staffManagedBookingId,
  };
}

async function cleanupFixture(
  databaseService: DatabaseService,
  suffix: number,
): Promise<void> {
  const notePrefix = `fixture-${suffix}`;

  const bookings = await databaseService.booking.findMany({
    where: {
      notes: {
        startsWith: notePrefix,
      },
    },
    select: {
      id: true,
      customerId: true,
    },
  });

  if (bookings.length > 0) {
    const bookingIds = bookings.map((booking) => booking.id);

    await databaseService.paymentGatewayTransaction.deleteMany({
      where: {
        payment: {
          order: {
            bookingId: {
              in: bookingIds,
            },
          },
        },
      },
    });

    await databaseService.paymentAttempt.deleteMany({
      where: {
        payment: {
          order: {
            bookingId: {
              in: bookingIds,
            },
          },
        },
      },
    });

    await databaseService.payment.deleteMany({
      where: {
        order: {
          bookingId: {
            in: bookingIds,
          },
        },
      },
    });

    await databaseService.order.deleteMany({
      where: {
        bookingId: {
          in: bookingIds,
        },
      },
    });

    await databaseService.booking.deleteMany({
      where: {
        id: {
          in: bookingIds,
        },
      },
    });

    await databaseService.customer.deleteMany({
      where: {
        id: {
          in: [...new Set(bookings.map((booking) => booking.customerId))],
        },
      },
    });
  }

  await databaseService.staffRole.deleteMany({
    where: {
      role: {
        name: `deposit-role-${suffix}`,
      },
    },
  });

  await databaseService.role.deleteMany({
    where: {
      name: `deposit-role-${suffix}`,
    },
  });

  await databaseService.staff.deleteMany({
    where: {
      id: `STF-DEP-${suffix}`,
    },
  });
}
