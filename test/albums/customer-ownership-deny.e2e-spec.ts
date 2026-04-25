import {
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { CustomerAlbumsController } from '../../src/albums/customer-albums.controller';
import { AlbumsService } from '../../src/albums/albums.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';

const DENY_MESSAGE = 'Album not found or you do not have access.';

describe('Customer private album ownership denial (e2e)', () => {
  let app: INestApplication<App>;
  let guardSpy: jest.SpiedFunction<JwtAuthGuard['canActivate']>;

  const albumsServiceMock = {
    getCustomerThumbnailStream: jest.fn(
      async (_customerId: string, fileId: string) => {
        if (fileId === 'file-owner') {
          return {
            stream: {
              pipe: (_: unknown) => _,
            } as unknown as NodeJS.ReadableStream,
            contentType: 'image/jpeg',
          };
        }

        throw new ForbiddenException(DENY_MESSAGE);
      },
    ),
    getCustomerFileStream: jest.fn(
      async (_customerId: string, fileId: string) => {
        if (fileId === 'file-owner') {
          return {
            stream: {
              pipe: (_: unknown) => _,
            } as unknown as NodeJS.ReadableStream,
            mimeType: 'image/jpeg',
            byteSize: 12,
            name: 'owner.jpg',
          };
        }

        throw new ForbiddenException(DENY_MESSAGE);
      },
    ),
  };

  const mockGuardCanActivate = (context: ExecutionContext): boolean => {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user?: unknown }>();

    const customerId = req.headers['x-user-id'];

    if (!customerId) {
      throw new UnauthorizedException('Unauthorized');
    }

    req.user = {
      userId: customerId,
      phoneNumber: '0900000000',
      userType: 'customer',
    };

    return true;
  };

  beforeAll(async () => {
    guardSpy = jest
      .spyOn(JwtAuthGuard.prototype, 'canActivate')
      .mockImplementation(mockGuardCanActivate);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CustomerAlbumsController],
      providers: [
        {
          provide: AlbumsService,
          useValue: albumsServiceMock,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    guardSpy.mockRestore();
    await app.close();
  });

  beforeEach(() => {
    albumsServiceMock.getCustomerThumbnailStream.mockClear();
    albumsServiceMock.getCustomerFileStream.mockClear();
  });

  it('non-owner using leaked fileId is denied on thumbnail with non-enumerating message', async () => {
    const response = await request(app.getHttpServer())
      .get('/customer/albums/file/file-foreign/thumbnail')
      .set('x-user-id', 'customer-owner')
      .expect(403);

    expect(response.body.message).toBe(DENY_MESSAGE);
  });

  it('non-owner using leaked fileId is denied on content with non-enumerating message', async () => {
    const response = await request(app.getHttpServer())
      .get('/customer/albums/file/file-foreign/content')
      .set('x-user-id', 'customer-owner')
      .expect(403);

    expect(response.body.message).toBe(DENY_MESSAGE);
  });

  it('nonexistent and foreign IDs do not leak existence metadata', async () => {
    const response = await request(app.getHttpServer())
      .get('/customer/albums/file/file-nonexistent/content')
      .set('x-user-id', 'customer-owner')
      .expect(403);

    expect(response.body.message).toBe(DENY_MESSAGE);
    expect(response.body).not.toHaveProperty('details.customerId');
    expect(response.body).not.toHaveProperty('details.bookingId');
  });
});
