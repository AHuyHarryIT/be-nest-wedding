import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from '../src/common/exceptions/global-exception.filter';
import {
  PrismaClientExceptionFilter,
  PrismaExceptionFilter,
} from '../src/common/filters/prisma-exception';
import { GlobalValidationPipe } from '../src/common/exceptions/validation.pipe';

describe('PublicInquiriesController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new GlobalValidationPipe(), new ValidationPipe({ transform: true }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(
      new PrismaExceptionFilter(),
      new PrismaClientExceptionFilter(),
      new GlobalExceptionFilter()
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a valid payload and returns created envelope with persisted inquiry semantics', async () => {
    const payload = {
      name: 'Nyquist QA',
      email: `nyquist-${Date.now()}@example.com`,
      message: 'Please contact us about premium package options.',
      phone: '0903111222',
      packageInterest: 'Premium',
    };

    const response = await request(app.getHttpServer())
      .post('/public-inquiries')
      .send(payload)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Public inquiry submitted successfully');
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: payload.name,
        email: payload.email,
        message: payload.message,
        phone: payload.phone,
        packageInterest: payload.packageInterest,
      })
    );
    expect(response.body.data.createdAt).toEqual(expect.any(String));
    expect(response.body.data.updatedAt).toEqual(expect.any(String));
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        timestamp: expect.any(String),
        version: expect.any(String),
        requestId: expect.stringMatching(/^req_/),
      })
    );
  });
});
