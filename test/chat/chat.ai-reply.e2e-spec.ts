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
import { AiService } from '../../src/ai/ai.service';

type ChatAiFixture = {
  customerId: string;
  customerPhone: string;
  customerPassword: string;
  staffId: string;
  staffPhone: string;
  staffPassword: string;
  bookingIds: {
    enabled: string;
    defaultOn: string;
    globalOff: string;
    chatOff: string;
    aiFailure: string;
    unauthorized: string;
  };
};

describe('Chat AI auto-reply contract (e2e)', () => {
  let app: INestApplication<App>;
  let databaseService: DatabaseService;
  let aiService: AiService;
  let fixture: ChatAiFixture;
  const now = Date.now();

  const originalAnthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const originalChatAiEnabled = process.env.CHAT_AI_ENABLED;

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
    aiService = app.get(AiService);
    fixture = await seedFixture(databaseService, now);
  });

  afterAll(async () => {
    process.env.ANTHROPIC_API_KEY = originalAnthropicApiKey;
    process.env.CHAT_AI_ENABLED = originalChatAiEnabled;

    if (databaseService) {
      await cleanupFixture(databaseService, now);
    }

    if (app) {
      await app.close();
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.ANTHROPIC_API_KEY = originalAnthropicApiKey;
    process.env.CHAT_AI_ENABLED = originalChatAiEnabled;
  });

  it('persists AI message when AI is globally enabled and chat aiEnabled is true', async () => {
    process.env.CHAT_AI_ENABLED = 'true';
    process.env.ANTHROPIC_API_KEY = 'test-key';

    jest
      .spyOn(aiService, 'generateChatReply')
      .mockResolvedValue('AI reply for enabled scenario');

    const customerToken = await login(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );

    const chat = await createChatAsCustomer(
      app,
      customerToken,
      fixture.customerId,
      fixture.bookingIds.enabled,
    );

    await request(app.getHttpServer())
      .post(`/chats/${chat.id}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ content: 'Hello AI, are you there?' })
      .expect(201);

    const persisted = await databaseService.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' },
      select: { senderType: true, content: true },
    });

    expect(persisted.length).toBe(2);
    expect(persisted[0]).toEqual(
      expect.objectContaining({
        senderType: 'CUSTOMER',
        content: 'Hello AI, are you there?',
      }),
    );
    expect(persisted[1]).toEqual(
      expect.objectContaining({
        senderType: 'AI',
        content: 'AI reply for enabled scenario',
      }),
    );
  });

  it('sends AI message when CHAT_AI_ENABLED is unset', async () => {
    process.env.CHAT_AI_ENABLED = undefined;
    process.env.ANTHROPIC_API_KEY = 'test-key';

    jest
      .spyOn(aiService, 'generateChatReply')
      .mockResolvedValue('AI reply for default-enabled scenario');

    const customerToken = await login(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );

    const chat = await createChatAsCustomer(
      app,
      customerToken,
      fixture.customerId,
      fixture.bookingIds.defaultOn,
    );

    await request(app.getHttpServer())
      .post(`/chats/${chat.id}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ content: 'Should trigger AI by default' })
      .expect(201);

    const persisted = await databaseService.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' },
      select: { senderType: true, content: true },
    });

    expect(persisted.length).toBe(2);
    expect(persisted[0]).toEqual(
      expect.objectContaining({
        senderType: 'CUSTOMER',
        content: 'Should trigger AI by default',
      }),
    );
    expect(persisted[1]).toEqual(
      expect.objectContaining({
        senderType: 'AI',
        content: 'AI reply for default-enabled scenario',
      }),
    );
  });

  it('does not send AI message when CHAT_AI_ENABLED is false', async () => {
    process.env.CHAT_AI_ENABLED = 'false';
    process.env.ANTHROPIC_API_KEY = 'test-key';

    const spy = jest.spyOn(aiService, 'generateChatReply');

    const customerToken = await login(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );

    const chat = await createChatAsCustomer(
      app,
      customerToken,
      fixture.customerId,
      fixture.bookingIds.globalOff,
    );

    await request(app.getHttpServer())
      .post(`/chats/${chat.id}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ content: 'Should not trigger AI' })
      .expect(201);

    expect(spy).not.toHaveBeenCalled();

    const persisted = await databaseService.message.findMany({
      where: { chatId: chat.id },
      select: { senderType: true },
    });

    expect(persisted).toHaveLength(1);
    expect(persisted[0].senderType).toBe('CUSTOMER');
  });

  it('does not send AI message when chat aiEnabled is false', async () => {
    process.env.CHAT_AI_ENABLED = 'true';
    process.env.ANTHROPIC_API_KEY = 'test-key';

    const spy = jest.spyOn(aiService, 'generateChatReply');

    const customerToken = await login(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );
    const staffToken = await login(
      app,
      fixture.staffPhone,
      fixture.staffPassword,
    );

    const chat = await createChatAsCustomer(
      app,
      customerToken,
      fixture.customerId,
      fixture.bookingIds.chatOff,
    );

    await request(app.getHttpServer())
      .put(`/chats/${chat.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ aiEnabled: false })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/chats/${chat.id}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ content: 'AI disabled for this chat' })
      .expect(201);

    expect(spy).not.toHaveBeenCalled();

    const persisted = await databaseService.message.findMany({
      where: { chatId: chat.id },
      select: { senderType: true },
    });

    expect(persisted).toHaveLength(1);
    expect(persisted[0].senderType).toBe('CUSTOMER');
  });

  it('keeps customer send successful when AI service throws', async () => {
    process.env.CHAT_AI_ENABLED = 'true';
    process.env.ANTHROPIC_API_KEY = 'test-key';

    jest
      .spyOn(aiService, 'generateChatReply')
      .mockRejectedValue(new Error('Anthropic timeout'));

    const customerToken = await login(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );

    const chat = await createChatAsCustomer(
      app,
      customerToken,
      fixture.customerId,
      fixture.bookingIds.aiFailure,
    );

    const response = await request(app.getHttpServer())
      .post(`/chats/${chat.id}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ content: 'This should still succeed' })
      .expect(201);

    expect(response.body?.success).toBe(true);

    const persisted = await databaseService.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' },
      select: { senderType: true, content: true },
    });

    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toEqual(
      expect.objectContaining({
        senderType: 'CUSTOMER',
        content: 'This should still succeed',
      }),
    );
  });

  it('rejects customer attempt to toggle aiEnabled', async () => {
    process.env.CHAT_AI_ENABLED = 'true';
    process.env.ANTHROPIC_API_KEY = 'test-key';

    const customerToken = await login(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );

    const chat = await createChatAsCustomer(
      app,
      customerToken,
      fixture.customerId,
      fixture.bookingIds.unauthorized,
    );

    const response = await request(app.getHttpServer())
      .put(`/chats/${chat.id}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ aiEnabled: false })
      .expect(403);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        statusCode: 403,
        code: 'FORBIDDEN',
      }),
    );
  });
});

async function login(
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

async function createChatAsCustomer(
  app: INestApplication<App>,
  customerToken: string,
  customerId: string,
  bookingId: string,
): Promise<{ id: string }> {
  const response = await request(app.getHttpServer())
    .post('/chats')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ customerId, bookingId })
    .expect(201);

  return response.body?.data as { id: string };
}

async function ensurePermission(
  databaseService: DatabaseService,
  key: 'chat.read' | 'chat.reply',
): Promise<{ id: string; key: string }> {
  return databaseService.permission.upsert({
    where: { key },
    update: {},
    create: {
      key,
      description: `Created for chat ai e2e fixture: ${key}`,
    },
    select: {
      id: true,
      key: true,
    },
  });
}

async function ensureBookingExists(
  databaseService: DatabaseService,
  customerId: string,
  bookingId: string,
  note: string,
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
      eventDate: new Date('2027-04-01T08:00:00.000Z'),
      totalPrice: 1500000,
      notes: note,
    },
  });
}

async function seedFixture(
  databaseService: DatabaseService,
  suffix: number,
): Promise<ChatAiFixture> {
  const customerPassword = '123456';
  const staffPassword = '123456';

  const customerHash = await bcrypt.hash(customerPassword, 10);
  const staffHash = await bcrypt.hash(staffPassword, 10);

  const customerPhone = `0971${suffix.toString().slice(-6)}`;
  const staffPhone = `0972${suffix.toString().slice(-6)}`;

  const customer = await databaseService.customer.create({
    data: {
      phoneNumber: customerPhone,
      passwordHash: customerHash,
      firstName: 'AI',
      lastName: 'Customer',
      email: `chat.ai.customer.${suffix}@example.com`,
      isActive: true,
    },
  });

  const staff = await databaseService.staff.create({
    data: {
      id: `STF-CHAT-AI-${suffix}`,
      phoneNumber: staffPhone,
      passwordHash: staffHash,
      firstName: 'AI',
      lastName: 'Staff',
      email: `chat.ai.staff.${suffix}@example.com`,
      isActive: true,
    },
  });

  const role = await databaseService.role.create({
    data: {
      name: `chat-ai-role-${suffix}`,
      description: 'Role for chat ai e2e fixture',
    },
  });

  const permissions = await Promise.all([
    ensurePermission(databaseService, 'chat.read'),
    ensurePermission(databaseService, 'chat.reply'),
  ]);

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

  const bookingIds = {
    enabled: `91111111-1111-4111-8111-${suffix.toString().slice(-12).padStart(12, '0')}`,
    defaultOn: `91119999-1111-4111-8111-${suffix.toString().slice(-12).padStart(12, '0')}`,
    globalOff: `92222222-2222-4222-8222-${suffix.toString().slice(-12).padStart(12, '0')}`,
    chatOff: `93333333-3333-4333-8333-${suffix.toString().slice(-12).padStart(12, '0')}`,
    aiFailure: `94444444-4444-4444-8444-${suffix.toString().slice(-12).padStart(12, '0')}`,
    unauthorized: `95555555-5555-4555-8555-${suffix.toString().slice(-12).padStart(12, '0')}`,
  };

  await Promise.all([
    ensureBookingExists(
      databaseService,
      customer.id,
      bookingIds.enabled,
      `chat-ai-enabled-${suffix}`,
    ),
    ensureBookingExists(
      databaseService,
      customer.id,
      bookingIds.defaultOn,
      `chat-ai-default-on-${suffix}`,
    ),
    ensureBookingExists(
      databaseService,
      customer.id,
      bookingIds.globalOff,
      `chat-ai-global-off-${suffix}`,
    ),
    ensureBookingExists(
      databaseService,
      customer.id,
      bookingIds.chatOff,
      `chat-ai-chat-off-${suffix}`,
    ),
    ensureBookingExists(
      databaseService,
      customer.id,
      bookingIds.aiFailure,
      `chat-ai-failure-${suffix}`,
    ),
    ensureBookingExists(
      databaseService,
      customer.id,
      bookingIds.unauthorized,
      `chat-ai-unauthorized-${suffix}`,
    ),
  ]);

  return {
    customerId: customer.id,
    customerPhone,
    customerPassword,
    staffId: staff.id,
    staffPhone,
    staffPassword,
    bookingIds,
  };
}

async function cleanupFixture(
  databaseService: DatabaseService,
  suffix: number,
): Promise<void> {
  const staffId = `STF-CHAT-AI-${suffix}`;
  const roleName = `chat-ai-role-${suffix}`;
  const customerPhone = `0971${suffix.toString().slice(-6)}`;

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
      await databaseService.chat.deleteMany({
        where: { id: { in: chatIds } },
      });
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
