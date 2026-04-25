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

type UnreadFixture = {
  customerId: string;
  customerPhone: string;
  customerPassword: string;
  staffId: string;
  staffPhone: string;
  staffPassword: string;
};

describe('Chat unread + latest ordering synchronization contract (e2e)', () => {
  let app: INestApplication<App>;
  let databaseService: DatabaseService;
  let fixture: UnreadFixture;
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

  it('keeps thread-level unread counts and latest-first ordering after mark-read', async () => {
    const customerToken = await loginCustomer(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );
    const staffToken = await loginStaff(
      app,
      fixture.staffPhone,
      fixture.staffPassword,
    );

    const generalChat = await createChatAsCustomer(
      app,
      customerToken,
      fixture.customerId,
    );

    await sendMessageAsStaff(
      app,
      staffToken,
      generalChat.id,
      'Unread sync baseline from staff',
    );

    const chatsBeforeRead = await request(app.getHttpServer())
      .get('/chats')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const threadBeforeRead = (
      chatsBeforeRead.body?.data as Array<{ id: string; unreadCount?: number }>
    ).find((chat) => chat.id === generalChat.id);

    expect(threadBeforeRead).toBeDefined();
    expect(threadBeforeRead?.unreadCount).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .put(`/chats/${generalChat.id}/messages/read`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const chatsAfterRead = await request(app.getHttpServer())
      .get('/chats')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const threadAfterRead = (
      chatsAfterRead.body?.data as Array<{ id: string; unreadCount?: number }>
    ).find((chat) => chat.id === generalChat.id);

    expect(threadAfterRead).toBeDefined();
    expect(threadAfterRead?.unreadCount).toBe(0);

    const persistedUnread = await databaseService.message.count({
      where: {
        chatId: generalChat.id,
        isRead: false,
        senderStaffId: fixture.staffId,
      },
    });

    expect(persistedUnread).toBe(0);
  });

  it('reconciles unread counts after mark-read and reconnect refresh', async () => {
    const customerToken = await loginCustomer(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );
    const staffToken = await loginStaff(
      app,
      fixture.staffPhone,
      fixture.staffPassword,
    );

    const generalChat = await createChatAsCustomer(
      app,
      customerToken,
      fixture.customerId,
    );

    await sendMessageAsStaff(
      app,
      staffToken,
      generalChat.id,
      'Message 1 for unread reconcile',
    );
    await sendMessageAsStaff(
      app,
      staffToken,
      generalChat.id,
      'Message 2 for unread reconcile',
    );

    const unreadBefore = await request(app.getHttpServer())
      .get('/chats/unread-count')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(
      unreadBefore.body?.data?.count ?? unreadBefore.body?.count,
    ).toBeGreaterThanOrEqual(2);

    await request(app.getHttpServer())
      .put(`/chats/${generalChat.id}/messages/read`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const unreadAfter = await request(app.getHttpServer())
      .get('/chats/unread-count')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(unreadAfter.body?.data?.count ?? unreadAfter.body?.count).toBe(0);

    const refreshedList = await request(app.getHttpServer())
      .get('/chats')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const refreshedThread = (
      refreshedList.body?.data as Array<{ id: string; unreadCount?: number }>
    ).find((chat) => chat.id === generalChat.id);

    expect(refreshedThread).toBeDefined();
    expect(refreshedThread?.unreadCount).toBe(0);
  });

  it('keeps latest-first ordering based on lastMessageAt updates', async () => {
    const customerToken = await loginCustomer(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );
    const staffToken = await loginStaff(
      app,
      fixture.staffPhone,
      fixture.staffPassword,
    );

    const olderThread = await createChatAsCustomer(
      app,
      customerToken,
      fixture.customerId,
    );

    await sendMessageAsStaff(
      app,
      staffToken,
      olderThread.id,
      'Older thread baseline',
    );

    await new Promise((resolve) => setTimeout(resolve, 20));

    const newerBookingId = `11111111-1111-4111-8111-${(now + 99)
      .toString()
      .slice(-12)
      .padStart(12, '0')}`;

    await ensureBookingExists(
      databaseService,
      fixture.customerId,
      newerBookingId,
    );

    const newerThread = await createChatAsCustomer(
      app,
      customerToken,
      fixture.customerId,
      newerBookingId,
    );

    await sendMessageAsStaff(
      app,
      staffToken,
      newerThread.id,
      'Newer thread latest activity',
    );

    const chatsResponse = await request(app.getHttpServer())
      .get('/chats')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const chats = chatsResponse.body?.data as Array<{ id: string }>;
    const relevantChats = chats.filter(
      (chat) => chat.id === olderThread.id || chat.id === newerThread.id,
    );

    expect(relevantChats.length).toBe(2);
    expect(relevantChats[0].id).toBe(newerThread.id);
    expect(relevantChats[1].id).toBe(olderThread.id);
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
      `Expected customer access token from /auth/login, got: ${JSON.stringify(response.body)}`,
    );
  }

  return accessToken;
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
      `Expected staff access token from /auth/login, got: ${JSON.stringify(response.body)}`,
    );
  }

  return accessToken;
}

async function createChatAsCustomer(
  app: INestApplication<App>,
  customerToken: string,
  customerId: string,
  bookingId?: string,
): Promise<{ id: string; bookingId?: string | null }> {
  const payload = bookingId ? { customerId, bookingId } : { customerId };

  const response = await request(app.getHttpServer())
    .post('/chats')
    .set('Authorization', `Bearer ${customerToken}`)
    .send(payload)
    .expect(201);

  return response.body.data as { id: string; bookingId?: string | null };
}

async function sendMessageAsStaff(
  app: INestApplication<App>,
  staffToken: string,
  chatId: string,
  content: string,
): Promise<void> {
  await request(app.getHttpServer())
    .post(`/chats/${chatId}/messages`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ content })
    .expect(201);
}

async function ensureBookingExists(
  databaseService: DatabaseService,
  customerId: string,
  bookingId: string,
): Promise<void> {
  const existing = await databaseService.booking.findUnique({
    where: { id: bookingId },
  });
  if (existing) {
    return;
  }

  await databaseService.booking.create({
    data: {
      id: bookingId,
      customerId,
      status: 'PENDING',
      eventDate: new Date('2027-03-01T08:00:00.000Z'),
      totalPrice: 1200000,
      notes: `chat-unread-extra-${bookingId}`,
    },
  });
}

async function seedFixture(
  databaseService: DatabaseService,
  suffix: number,
): Promise<UnreadFixture> {
  const customerPassword = '123456';
  const staffPassword = '123456';
  const customerHash = await bcrypt.hash(customerPassword, 10);
  const staffHash = await bcrypt.hash(staffPassword, 10);

  const customerPhone = `0947${suffix.toString().slice(-6)}`;
  const staffPhone = `0957${suffix.toString().slice(-6)}`;

  const customer = await databaseService.customer.create({
    data: {
      phoneNumber: customerPhone,
      passwordHash: customerHash,
      firstName: 'Unread',
      lastName: 'Customer',
      email: `chat.unread.customer.${suffix}@example.com`,
      isActive: true,
    },
  });

  const staff = await databaseService.staff.create({
    data: {
      id: `STF-CHAT-${suffix}`,
      phoneNumber: staffPhone,
      passwordHash: staffHash,
      firstName: 'Unread',
      lastName: 'Staff',
      email: `chat.unread.staff.${suffix}@example.com`,
      isActive: true,
    },
  });

  const role = await databaseService.role.create({
    data: {
      name: `chat-unread-role-${suffix}`,
      description: 'Role for unread chat e2e fixture',
    },
  });

  const permissionKeys = ['chat.read', 'chat.reply'];
  const permissions = await Promise.all(
    permissionKeys.map((key) =>
      databaseService.permission.upsert({
        where: { key },
        update: {},
        create: {
          key,
          description: `Auto-created by e2e fixture: ${key}`,
        },
      }),
    ),
  );

  await databaseService.rolePermission.createMany({
    data: permissions.map((permission) => ({
      roleId: role.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });

  await databaseService.staffRole.create({
    data: {
      staffId: staff.id,
      roleId: role.id,
    },
  });

  return {
    customerId: customer.id,
    customerPhone,
    customerPassword,
    staffId: staff.id,
    staffPhone,
    staffPassword,
  };
}

async function cleanupFixture(
  databaseService: DatabaseService,
  suffix: number,
): Promise<void> {
  const roleName = `chat-unread-role-${suffix}`;
  const staffId = `STF-CHAT-${suffix}`;

  const customerPhone = `0947${suffix.toString().slice(-6)}`;
  const customer = await databaseService.customer.findUnique({
    where: { phoneNumber: customerPhone },
    select: { id: true },
  });

  if (customer) {
    const customerChats = await databaseService.chat.findMany({
      where: { customerId: customer.id },
      select: { id: true, bookingId: true },
    });

    const chatIds = customerChats.map((chat) => chat.id);
    if (chatIds.length > 0) {
      await databaseService.message.deleteMany({
        where: { chatId: { in: chatIds } },
      });
      await databaseService.chat.deleteMany({ where: { id: { in: chatIds } } });
    }

    const bookingIds = customerChats
      .map((chat) => chat.bookingId)
      .filter((bookingId): bookingId is string => Boolean(bookingId));

    if (bookingIds.length > 0) {
      await databaseService.booking.deleteMany({
        where: { id: { in: bookingIds } },
      });
    }

    await databaseService.customer.delete({ where: { id: customer.id } });
  }

  await databaseService.staffRole.deleteMany({ where: { staffId } });

  const role = await databaseService.role.findUnique({
    where: { name: roleName },
    select: { id: true },
  });

  if (role) {
    await databaseService.rolePermission.deleteMany({
      where: { roleId: role.id },
    });
    await databaseService.role.delete({ where: { id: role.id } });
  }

  await databaseService.staff.deleteMany({ where: { id: staffId } });
}
