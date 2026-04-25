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

type SeededFixture = {
  bookingId: string;
  paymentId: string;
  staffPhoneNumber: string;
  totalPrice: number;
  paidAmount: number;
  remainingAmount: number;
};

type OrderSummaryContract = {
  totalPrice: number;
  totalPaid: number;
  remainingAmount: number;
  balanceRemaining: number;
  pendingAmount: number;
  isPaid: boolean;
};

type OrderRecord = {
  bookingId: string;
  status: string;
  summary?: Partial<OrderSummaryContract>;
};

describe('Orders payment visibility summary contract (e2e)', () => {
  let app: INestApplication<App>;
  let databaseService: DatabaseService;
  let fixture: SeededFixture;
  const now = Date.now();

  beforeAll(async () => {
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
        createPayment: jest.fn(),
        queryTransactionStatus: jest.fn(),
        verifyIPNSignature: jest.fn().mockReturnValue(true),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new GlobalValidationPipe(),
      new ValidationPipe({ transform: true }),
    );
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

  it('exposes baseline unpaid summary via existing GET /orders and GET /orders/:bookingId', async () => {
    const staffToken = await loginStaff(
      app,
      fixture.staffPhoneNumber,
      '123456',
    );

    const listResponse = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    const orders = extractOrders(listResponse.body);
    const listRecord = orders.find(
      (order) => order.bookingId === fixture.bookingId,
    );
    expect(listRecord).toBeDefined();
    expect(listRecord?.status).toBe('UNPAID');

    expectCanonicalSummary(listRecord?.summary, {
      totalPrice: fixture.totalPrice,
      totalPaid: 0,
      remainingAmount: fixture.totalPrice,
      balanceRemaining: fixture.totalPrice,
      pendingAmount: fixture.totalPrice,
      isPaid: false,
    });

    const detailResponse = await request(app.getHttpServer())
      .get(`/orders/${fixture.bookingId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    const detailRecord = extractData<OrderRecord>(detailResponse.body);
    expect(detailRecord.status).toBe('UNPAID');

    expectCanonicalSummary(detailRecord.summary, {
      totalPrice: fixture.totalPrice,
      totalPaid: 0,
      remainingAmount: fixture.totalPrice,
      balanceRemaining: fixture.totalPrice,
      pendingAmount: fixture.totalPrice,
      isPaid: false,
    });
  });

  it('reflects reconciled payment totals/status through the same summary contract for list and detail', async () => {
    const staffToken = await loginStaff(
      app,
      fixture.staffPhoneNumber,
      '123456',
    );

    const callbackResponse = await request(app.getHttpServer())
      .post('/orders/momo/callback')
      .send({
        partnerCode: 'MOMO',
        orderId: `${fixture.bookingId}_momo_reconciliation`,
        requestId: `req_${fixture.bookingId}`,
        amount: fixture.paidAmount,
        orderInfo: 'Deposit payment callback',
        orderType: 'wedding-booking',
        transId: now,
        resultCode: 0,
        message: 'Success',
        payType: 'qr',
        responseTime: Date.now(),
        extraData: JSON.stringify({
          bookingId: fixture.bookingId,
          paymentId: fixture.paymentId,
        }),
        signature: 'valid-mock-signature',
      })
      .expect(200);

    const callbackData = extractData<{ resultCode: number }>(
      callbackResponse.body,
    );
    expect(callbackData.resultCode).toBe(0);

    const repeatedCallbackResponse = await request(app.getHttpServer())
      .post('/orders/momo/callback')
      .send({
        partnerCode: 'MOMO',
        orderId: `${fixture.bookingId}_momo_reconciliation`,
        requestId: `req_${fixture.bookingId}`,
        amount: fixture.paidAmount,
        orderInfo: 'Deposit payment callback',
        orderType: 'wedding-booking',
        transId: now,
        resultCode: 0,
        message: 'Success',
        payType: 'qr',
        responseTime: Date.now(),
        extraData: JSON.stringify({
          bookingId: fixture.bookingId,
          paymentId: fixture.paymentId,
        }),
        signature: 'valid-mock-signature',
      })
      .expect(200);

    const repeatedCallbackData = extractData<{ resultCode: number }>(
      repeatedCallbackResponse.body,
    );
    expect(repeatedCallbackData.resultCode).toBe(0);

    const listResponse = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    const orders = extractOrders(listResponse.body);
    const listRecord = orders.find(
      (order) => order.bookingId === fixture.bookingId,
    );
    expect(listRecord).toBeDefined();
    expect(listRecord?.status).toBe('PARTIAL');

    expectCanonicalSummary(listRecord?.summary, {
      totalPrice: fixture.totalPrice,
      totalPaid: fixture.paidAmount,
      remainingAmount: fixture.remainingAmount,
      balanceRemaining: fixture.remainingAmount,
      pendingAmount: fixture.remainingAmount,
      isPaid: false,
    });

    const detailResponse = await request(app.getHttpServer())
      .get(`/orders/${fixture.bookingId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    const detailRecord = extractData<OrderRecord>(detailResponse.body);
    expect(detailRecord.status).toBe('PARTIAL');

    expectCanonicalSummary(detailRecord.summary, {
      totalPrice: fixture.totalPrice,
      totalPaid: fixture.paidAmount,
      remainingAmount: fixture.remainingAmount,
      balanceRemaining: fixture.remainingAmount,
      pendingAmount: fixture.remainingAmount,
      isPaid: false,
    });
  });
});

function extractData<T>(body: any): T {
  return (body?.data ?? body) as T;
}

function extractOrders(body: any): OrderRecord[] {
  const payload = extractData<any>(body);

  if (Array.isArray(payload)) {
    return payload as OrderRecord[];
  }

  if (Array.isArray(payload?.data)) {
    return payload.data as OrderRecord[];
  }

  return [];
}

function expectCanonicalSummary(
  summary: Partial<OrderSummaryContract> | undefined,
  expected: OrderSummaryContract,
): void {
  expect(summary).toBeDefined();

  expect(summary).toEqual(
    expect.objectContaining({
      totalPrice: expected.totalPrice,
      totalPaid: expected.totalPaid,
      remainingAmount: expected.remainingAmount,
      balanceRemaining: expected.balanceRemaining,
      pendingAmount: expected.pendingAmount,
      isPaid: expected.isPaid,
    }),
  );

  const keys = Object.keys(summary ?? {});
  expect(keys).toEqual(
    expect.arrayContaining([
      'totalPrice',
      'totalPaid',
      'remainingAmount',
      'balanceRemaining',
      'pendingAmount',
      'isPaid',
    ]),
  );
}

async function loginStaff(
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

  const customer = await databaseService.customer.create({
    data: {
      phoneNumber: `0931${suffix.toString().slice(-6)}`,
      passwordHash,
      firstName: 'Visibility',
      lastName: 'Customer',
      email: `visibility.customer.${suffix}@example.com`,
      isActive: true,
    },
  });

  const staff = await databaseService.staff.create({
    data: {
      id: `STF-VIS-${suffix}`,
      phoneNumber: `0932${suffix.toString().slice(-6)}`,
      passwordHash,
      firstName: 'Visibility',
      lastName: 'Staff',
      email: `visibility.staff.${suffix}@example.com`,
      isActive: true,
    },
  });

  const orderReadPermission = await databaseService.permission.findUnique({
    where: { key: 'orders:read' },
  });

  const staffRole = await databaseService.role.create({
    data: {
      name: `visibility-role-${suffix}`,
      description: 'Role for payment visibility e2e test staff user',
      permissions: orderReadPermission
        ? {
            create: [{ permissionId: orderReadPermission.id }],
          }
        : undefined,
    },
  });

  await databaseService.staffRole.create({
    data: {
      staffId: staff.id,
      roleId: staffRole.id,
    },
  });

  const bookingId = `77777777-7777-4777-8777-${suffix
    .toString()
    .slice(-12)
    .padStart(12, '0')}`;

  const totalPrice = 1_000_000;
  const paidAmount = 300_000;

  await databaseService.booking.create({
    data: {
      id: bookingId,
      customerId: customer.id,
      status: 'PENDING',
      eventDate: new Date('2027-02-01T08:00:00.000Z'),
      totalPrice,
      notes: `fixture-${suffix}-visibility`,
    },
  });

  const order = await databaseService.order.create({
    data: {
      bookingId,
      referenceNumber: `ORD-VIS-${suffix}`,
      totalPrice,
      totalPaid: 0,
      balanceRemaining: totalPrice,
      status: 'UNPAID',
      payments: {
        create: [
          {
            paymentSequence: 1,
            paymentType: 'DEPOSIT',
            amount: paidAmount,
            method: 'E_WALLET',
            status: 'PENDING',
            description: 'Pending customer deposit for reconciliation',
            attemptCount: 0,
          },
        ],
      },
    },
    include: {
      payments: true,
    },
  });

  return {
    bookingId,
    paymentId: order.payments[0].id,
    staffPhoneNumber: staff.phoneNumber,
    totalPrice,
    paidAmount,
    remainingAmount: totalPrice - paidAmount,
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
        name: `visibility-role-${suffix}`,
      },
    },
  });

  await databaseService.role.deleteMany({
    where: {
      name: `visibility-role-${suffix}`,
    },
  });

  await databaseService.staff.deleteMany({
    where: {
      id: `STF-VIS-${suffix}`,
    },
  });
}
