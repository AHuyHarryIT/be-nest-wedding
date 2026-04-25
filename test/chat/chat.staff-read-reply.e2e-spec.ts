import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../../src/app.module';
import { DatabaseService } from '../../src/database/database.service';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from '../../src/common/exceptions/global-exception.filter';
import {
  PrismaClientExceptionFilter,
  PrismaExceptionFilter,
} from '../../src/common/filters/prisma-exception';
import { GlobalValidationPipe } from '../../src/common/exceptions/validation.pipe';

type StaffFixture = {
  staffId: string;
  phone: string;
  password: string;
};

type PermissionFixture = {
  customerId: string;
  customerPhone: string;
  customerPassword: string;
  noReadStaff: StaffFixture;
  noReplyStaff: StaffFixture;
};

describe('Chat staff read/reply + websocket identity contract (e2e)', () => {
  let app: INestApplication<App>;
  let databaseService: DatabaseService;
  let fixture: PermissionFixture;
  let socketBaseUrl: string;
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
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 80 : address.port;
    socketBaseUrl = `http://127.0.0.1:${port}`;

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

  it('rejects websocket identity spoofing without valid jwt', async () => {
    await expectWebsocketAuthRejection(socketBaseUrl, {
      auth: { userId: fixture.customerId },
    });
  });

  it('returns forbidden with Required permission: chat.read for staff queue without permission', async () => {
    const customerToken = await login(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );
    const noReadToken = await login(
      app,
      fixture.noReadStaff.phone,
      fixture.noReadStaff.password,
    );

    await createChatAsCustomer(app, customerToken, fixture.customerId);

    const response = await request(app.getHttpServer())
      .get('/chats/staff')
      .set('Authorization', `Bearer ${noReadToken}`)
      .expect(403);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        statusCode: 403,
        code: 'FORBIDDEN',
      }),
    );
    expect(response.body.details).toEqual(
      expect.objectContaining({
        requiredPermissions: ['chat.read'],
        missingPermissions: ['chat.read'],
      }),
    );
  });

  it('returns forbidden with Required permission: chat.reply for staff reply without permission', async () => {
    const customerToken = await login(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );
    const noReplyToken = await login(
      app,
      fixture.noReplyStaff.phone,
      fixture.noReplyStaff.password,
    );

    const chat = await createChatAsCustomer(
      app,
      customerToken,
      fixture.customerId,
    );

    const response = await request(app.getHttpServer())
      .post(`/chats/${chat.id}/messages`)
      .set('Authorization', `Bearer ${noReplyToken}`)
      .send({ content: 'Staff reply attempt without chat.reply permission' })
      .expect(403);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        statusCode: 403,
        code: 'FORBIDDEN',
      }),
    );
    expect(response.body.details).toEqual(
      expect.objectContaining({
        requiredPermissions: ['chat.reply'],
        missingPermissions: ['chat.reply'],
      }),
    );
  });

  it('rejects websocket join_chat with Required permission: chat.read for staff without permission', async () => {
    const customerToken = await login(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );
    const noReadToken = await login(
      app,
      fixture.noReadStaff.phone,
      fixture.noReadStaff.password,
    );

    const chat = await createChatAsCustomer(
      app,
      customerToken,
      fixture.customerId,
    );

    const socket = await connectSocketWithToken(socketBaseUrl, noReadToken);

    await expectSocketEventError(
      socket,
      'join_chat',
      { chatId: chat.id },
      {
        requiredPermissions: ['chat.read'],
        missingPermissions: ['chat.read'],
      },
    );

    socket.disconnect();
  });

  it('rejects websocket send_message with Required permission: chat.reply for staff without permission', async () => {
    const customerToken = await login(
      app,
      fixture.customerPhone,
      fixture.customerPassword,
    );
    const noReplyToken = await login(
      app,
      fixture.noReplyStaff.phone,
      fixture.noReplyStaff.password,
    );

    const chat = await createChatAsCustomer(
      app,
      customerToken,
      fixture.customerId,
    );

    const socket = await connectSocketWithToken(socketBaseUrl, noReplyToken);

    await expectSocketEventError(
      socket,
      'send_message',
      {
        chatId: chat.id,
        content: 'Websocket reply attempt without chat.reply',
      },
      {
        requiredPermissions: ['chat.reply'],
        missingPermissions: ['chat.reply'],
      },
    );

    socket.disconnect();
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
): Promise<{ id: string }> {
  const response = await request(app.getHttpServer())
    .post('/chats')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ customerId })
    .expect(201);

  return response.body?.data as { id: string };
}

async function connectSocketWithToken(
  baseUrl: string,
  token: string,
): Promise<Socket> {
  return new Promise<Socket>((resolve, reject) => {
    const socket: Socket = io(`${baseUrl}/chat`, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 1500,
      auth: { token },
      forceNew: true,
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(
        new Error('Timed out waiting for authenticated websocket connection'),
      );
    }, 3000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      resolve(socket);
    });

    socket.on('connect_error', (error: Error) => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(error);
    });
  });
}

async function expectSocketEventError(
  socket: Socket,
  eventName: 'join_chat' | 'send_message',
  payload: Record<string, unknown>,
  expectedDetails: {
    requiredPermissions: string[];
    missingPermissions: string[];
  },
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off('error', onError);
      reject(
        new Error(
          `Timed out waiting for websocket error on event: ${eventName}`,
        ),
      );
    }, 3000);

    const onError = (eventPayload: {
      message?: string;
      details?: {
        requiredPermissions?: string[];
        missingPermissions?: string[];
      };
    }) => {
      clearTimeout(timeout);
      socket.off('error', onError);

      expect(eventPayload.message || '').toMatch(
        /missing required permissions/i,
      );
      expect(eventPayload.details).toEqual(
        expect.objectContaining({
          requiredPermissions: expectedDetails.requiredPermissions,
          missingPermissions: expectedDetails.missingPermissions,
        }),
      );

      resolve();
    };

    socket.on('error', onError);
    socket.emit(eventName, payload);
  });
}

async function expectWebsocketAuthRejection(
  baseUrl: string,
  options: {
    auth?: Record<string, unknown>;
    headers?: Record<string, string>;
  },
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const socket: Socket = io(`${baseUrl}/chat`, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 1500,
      auth: options.auth,
      extraHeaders: options.headers,
      forceNew: true,
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(
        new Error('Timed out waiting for websocket authentication rejection'),
      );
    }, 3000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(
        new Error(
          'Expected websocket connection to be rejected without a valid JWT',
        ),
      );
    });

    socket.on('connect_error', (error: Error) => {
      clearTimeout(timeout);
      expect(error.message).toMatch(/unauthorized|jwt|auth|token/i);
      socket.disconnect();
      resolve();
    });
  });
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
      description: `Created for chat permission matrix e2e: ${key}`,
    },
    select: {
      id: true,
      key: true,
    },
  });
}

async function seedStaff(
  databaseService: DatabaseService,
  params: {
    suffix: number;
    tag: string;
    phonePrefix: string;
    permissions: Array<'chat.read' | 'chat.reply'>;
  },
): Promise<StaffFixture> {
  const password = '123456';
  const passwordHash = await bcrypt.hash(password, 10);

  const staff = await databaseService.staff.create({
    data: {
      id: `STF-CHAT-PERM-${params.suffix}-${params.tag}`,
      phoneNumber: `${params.phonePrefix}${params.suffix.toString().slice(-6)}`,
      passwordHash,
      firstName: 'Chat',
      lastName: params.tag,
      email: `chat.permission.${params.tag.toLowerCase()}.${params.suffix}@example.com`,
      isActive: true,
    },
  });

  const role = await databaseService.role.create({
    data: {
      name: `chat-perm-role-${params.tag.toLowerCase()}-${params.suffix}`,
      description: `Role for ${params.tag} permission matrix e2e`,
    },
  });

  if (params.permissions.length > 0) {
    const permissionRecords = await Promise.all(
      params.permissions.map((key) => ensurePermission(databaseService, key)),
    );

    await databaseService.rolePermission.createMany({
      data: permissionRecords.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });
  }

  await databaseService.staffRole.create({
    data: {
      staffId: staff.id,
      roleId: role.id,
    },
  });

  return {
    staffId: staff.id,
    phone: staff.phoneNumber,
    password,
  };
}

async function seedFixture(
  databaseService: DatabaseService,
  suffix: number,
): Promise<PermissionFixture> {
  const customerPassword = '123456';
  const customerPasswordHash = await bcrypt.hash(customerPassword, 10);

  const customer = await databaseService.customer.create({
    data: {
      phoneNumber: `0961${suffix.toString().slice(-6)}`,
      passwordHash: customerPasswordHash,
      firstName: 'Permission',
      lastName: 'Customer',
      email: `chat.permission.customer.${suffix}@example.com`,
      isActive: true,
    },
  });

  const noReadStaff = await seedStaff(databaseService, {
    suffix,
    tag: 'NOREAD',
    phonePrefix: '0962',
    permissions: ['chat.reply'],
  });

  const noReplyStaff = await seedStaff(databaseService, {
    suffix,
    tag: 'NOREPLY',
    phonePrefix: '0963',
    permissions: ['chat.read'],
  });

  return {
    customerId: customer.id,
    customerPhone: customer.phoneNumber,
    customerPassword,
    noReadStaff,
    noReplyStaff,
  };
}

async function cleanupFixture(
  databaseService: DatabaseService,
  suffix: number,
): Promise<void> {
  const customerPhone = `0961${suffix.toString().slice(-6)}`;
  const customer = await databaseService.customer.findUnique({
    where: { phoneNumber: customerPhone },
    select: { id: true },
  });

  if (customer) {
    const chats = await databaseService.chat.findMany({
      where: { customerId: customer.id },
      select: { id: true },
    });

    const chatIds = chats.map((chat) => chat.id);
    if (chatIds.length > 0) {
      await databaseService.message.deleteMany({
        where: { chatId: { in: chatIds } },
      });
      await databaseService.chat.deleteMany({ where: { id: { in: chatIds } } });
    }

    await databaseService.customer.delete({ where: { id: customer.id } });
  }

  const staffIds = [
    `STF-CHAT-PERM-${suffix}-NOREAD`,
    `STF-CHAT-PERM-${suffix}-NOREPLY`,
  ];

  await databaseService.staffRole.deleteMany({
    where: { staffId: { in: staffIds } },
  });

  const roleNames = [
    `chat-perm-role-noread-${suffix}`,
    `chat-perm-role-noreply-${suffix}`,
  ];

  await databaseService.rolePermission.deleteMany({
    where: {
      role: {
        name: { in: roleNames },
      },
    },
  });

  await databaseService.role.deleteMany({ where: { name: { in: roleNames } } });
  await databaseService.staff.deleteMany({ where: { id: { in: staffIds } } });
}
