import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DatabaseService } from '../../src/database/database.service';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from '../../src/common/exceptions/global-exception.filter';
import {
  PrismaClientExceptionFilter,
  PrismaExceptionFilter,
} from '../../src/common/filters/prisma-exception';
import { GlobalValidationPipe } from '../../src/common/exceptions/validation.pipe';

type ChatFixture = {
  customerId: string;
  customerPhone: string;
  customerPassword: string;
  bookingId: string;
};

describe('Chat customer send + canonical thread contract (e2e)', () => {
  let app: INestApplication<App>;
  let databaseService: DatabaseService;
  let fixture: ChatFixture;
  const now = Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  it('reuses canonical booking thread for repeated create requests', async () => {
    const accessToken = await loginCustomer(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );

    const firstCreate = await request(app.getHttpServer())
      .post('/chats')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        customerId: fixture.customerId,
        bookingId: fixture.bookingId,
      })
      .expect(201);

    const firstThread = firstCreate.body?.data;
    expect(firstThread?.id).toBeDefined();

    await request(app.getHttpServer())
      .put(`/chats/${firstThread.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ staffId: `STF-CHAT-CS-${now}-SECONDARY` })
      .expect(403);

    const secondCreate = await request(app.getHttpServer())
      .post('/chats')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        customerId: fixture.customerId,
        bookingId: fixture.bookingId,
      })
      .expect(201);

    const secondThread = secondCreate.body?.data;

    expect(secondThread?.id).toBe(firstThread?.id);
    expect(secondThread?.bookingId).toBe(fixture.bookingId);
  });

  it('reuses single general support thread under concurrent create requests', async () => {
    const accessToken = await loginCustomer(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );

    const results = await Promise.all(
      Array.from({ length: 8 }).map(() =>
        request(app.getHttpServer())
          .post('/chats')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ customerId: fixture.customerId })
          .expect(201),
      ),
    );

    const chatIds = results
      .map((response) => response.body?.data?.id as string | undefined)
      .filter(Boolean);

    expect(chatIds.length).toBe(8);
    expect(new Set(chatIds).size).toBe(1);
  });

  it('persists customer message through REST authority path', async () => {
    const accessToken = await loginCustomer(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );

    const createResponse = await request(app.getHttpServer())
      .post('/chats')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ customerId: fixture.customerId });

    expect(createResponse.status).not.toBe(500);
    expect(createResponse.status).toBe(201);

    const chatId = createResponse.body?.data?.id as string;

    const sendResponse = await request(app.getHttpServer())
      .post(`/chats/${chatId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'Customer hello from e2e contract' });

    expect(sendResponse.status).not.toBe(500);
    expect(sendResponse.status).toBe(201);

    expect(sendResponse.body.success).toBe(true);
    expect(sendResponse.body.data).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        chatId,
        senderId: fixture.customerId,
        content: 'Customer hello from e2e contract',
      }),
    );

    const persistedMessage = await databaseService.message.findUnique({
      where: { id: sendResponse.body.data.id as string },
      select: {
        id: true,
        chatId: true,
        senderCustomerId: true,
        senderStaffId: true,
        content: true,
      },
    });

    expect(persistedMessage).toEqual(
      expect.objectContaining({
        chatId,
        senderCustomerId: fixture.customerId,
        senderStaffId: null,
        content: 'Customer hello from e2e contract',
      }),
    );
  });

  it('returns controlled 4xx envelope instead of runtime 500 for invalid first-message create request', async () => {
    const accessToken = await loginCustomer(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );

    const response = await request(app.getHttpServer())
      .post('/chats')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        customerId: fixture.customerId,
        bookingId: 'not-a-uuid',
      });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(response.status).not.toBe(500);
    expect(response.body?.success).toBe(false);
    expect(response.body?.message).toBeDefined();
  });

  it('returns controlled 4xx envelope instead of runtime 500 for invalid first-message send payload', async () => {
    const accessToken = await loginCustomer(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );

    const chatResponse = await request(app.getHttpServer())
      .post('/chats')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ customerId: fixture.customerId })
      .expect(201);

    const chatId = chatResponse.body?.data?.id as string;

    const response = await request(app.getHttpServer())
      .post(`/chats/${chatId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: '' });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(response.status).not.toBe(500);
    expect(response.body?.success).toBe(false);
    expect(response.body?.message).toBeDefined();
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
      `Expected access token from /auth/login, got: ${JSON.stringify(response.body)}`,
    );
  }

  return accessToken;
}

async function ensureStaffRole(
  databaseService: DatabaseService,
): Promise<string> {
  const existingRole = await databaseService.role.findUnique({
    where: { name: 'staff' },
    select: { id: true },
  });

  if (existingRole) {
    return existingRole.id;
  }

  const role = await databaseService.role.create({
    data: {
      name: 'staff',
      description: 'Fallback staff role for chat e2e fixture',
    },
    select: { id: true },
  });

  return role.id;
}

async function createStaffFixture(
  databaseService: DatabaseService,
  suffix: number,
  tag: string,
): Promise<{ staffId: string }> {
  const staffPassword = '123456';
  const passwordHash = await bcrypt.hash(staffPassword, 10);
  const staffRoleId = await ensureStaffRole(databaseService);

  const staff = await databaseService.staff.create({
    data: {
      id: `STF-CHAT-CS-${suffix}-${tag}`,
      phoneNumber: `097${(suffix + tag.length).toString().slice(-7).padStart(7, '0')}`,
      passwordHash,
      firstName: 'Chat',
      lastName: tag,
      email: `chat.customer.send.${tag.toLowerCase()}.${suffix}@example.com`,
      isActive: true,
    },
    select: { id: true },
  });

  await databaseService.staffRole.upsert({
    where: {
      staffId_roleId: {
        staffId: staff.id,
        roleId: staffRoleId,
      },
    },
    update: {},
    create: {
      staffId: staff.id,
      roleId: staffRoleId,
    },
  });

  return {
    staffId: staff.id,
  };
}

async function seedFixture(
  databaseService: DatabaseService,
  suffix: number,
): Promise<ChatFixture> {
  const customerPassword = '123456';
  const passwordHash = await bcrypt.hash(customerPassword, 10);

  const customerPhone = `0938${suffix.toString().slice(-6)}`;

  const customer = await databaseService.customer.create({
    data: {
      phoneNumber: customerPhone,
      passwordHash,
      firstName: 'Chat',
      lastName: 'Customer',
      email: `chat.customer.${suffix}@example.com`,
      isActive: true,
    },
  });

  await createStaffFixture(databaseService, suffix, 'PRIMARY');

  const bookingId = `90000000-0000-4000-8000-${suffix
    .toString()
    .slice(-12)
    .padStart(12, '0')}`;

  await databaseService.booking.create({
    data: {
      id: bookingId,
      customerId: customer.id,
      status: 'PENDING',
      eventDate: new Date('2027-02-01T08:00:00.000Z'),
      totalPrice: 1000000,
      notes: `chat-fixture-${suffix}`,
    },
  });

  return {
    customerId: customer.id,
    customerPhone,
    customerPassword,
    bookingId,
  };
}

async function cleanupFixture(
  databaseService: DatabaseService,
  suffix: number,
): Promise<void> {
  const fixtureNote = `chat-fixture-${suffix}`;

  const bookings = await databaseService.booking.findMany({
    where: {
      notes: fixtureNote,
    },
    select: {
      id: true,
      customerId: true,
    },
  });

  if (bookings.length === 0) {
    return;
  }

  const bookingIds = bookings.map((booking) => booking.id);
  const customerIds = [
    ...new Set(bookings.map((booking) => booking.customerId)),
  ];

  const chats = await databaseService.chat.findMany({
    where: {
      OR: [
        { bookingId: { in: bookingIds } },
        { customerId: { in: customerIds } },
      ],
    },
    select: { id: true },
  });

  const chatIds = chats.map((chat) => chat.id);

  if (chatIds.length > 0) {
    await databaseService.message.deleteMany({
      where: { chatId: { in: chatIds } },
    });

    await databaseService.chat.deleteMany({
      where: { id: { in: chatIds } },
    });
  }

  await databaseService.booking.deleteMany({
    where: { id: { in: bookingIds } },
  });

  await databaseService.customer.deleteMany({
    where: { id: { in: customerIds } },
  });

  const staffFixtures = await databaseService.staff.findMany({
    where: {
      id: {
        startsWith: `STF-CHAT-CS-${suffix}-`,
      },
    },
    select: { id: true },
  });

  if (staffFixtures.length > 0) {
    const staffIds = staffFixtures.map((staff) => staff.id);
    await databaseService.staffRole.deleteMany({
      where: { staffId: { in: staffIds } },
    });
    await databaseService.staff.deleteMany({ where: { id: { in: staffIds } } });
  }
}
