import {
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PassThrough } from 'stream';
import request from 'supertest';
import { App } from 'supertest/types';
import { CustomerAlbumsController } from '../../src/albums/customer-albums.controller';
import { AlbumsService } from '../../src/albums/albums.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';

const DENY_MESSAGE = 'Album not found or you do not have access.';

const streamFrom = (content: string) => {
  const stream = new PassThrough();
  stream.end(Buffer.from(content));
  return stream;
};

describe('Customer private album zip download (e2e)', () => {
  let app: INestApplication<App>;
  let guardSpy: jest.SpiedFunction<JwtAuthGuard['canActivate']>;

  const albumsServiceMock = {
    getCustomerAlbumZipStream: jest.fn(
      async (_customerId: string, albumId: string) => {
        if (albumId === 'album-owner') {
          return {
            stream: streamFrom('zip-content-bytes'),
            fileName: 'wedding-private-assets.zip',
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
    albumsServiceMock.getCustomerAlbumZipStream.mockClear();
  });

  it('owner GET /customer/albums/:albumId/download.zip returns zip attachment headers', async () => {
    const response = await request(app.getHttpServer())
      .get('/customer/albums/album-owner/download.zip')
      .set('x-user-id', 'customer-owner')
      .expect(200);

    expect(response.headers['content-type']).toContain('application/zip');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('.zip');
    expect(albumsServiceMock.getCustomerAlbumZipStream).toHaveBeenCalledWith(
      'customer-owner',
      'album-owner',
    );
  });

  it('foreign albumId returns explicit 403 non-enumerating denial on zip endpoint', async () => {
    const response = await request(app.getHttpServer())
      .get('/customer/albums/album-foreign/download.zip')
      .set('x-user-id', 'customer-owner')
      .expect(403);

    expect(response.body.message).toBe(DENY_MESSAGE);
    expect(response.body).not.toHaveProperty('details.customerId');
    expect(response.body).not.toHaveProperty('details.bookingId');
  });

  it('nonexistent albumId returns the same explicit 403 non-enumerating denial', async () => {
    const response = await request(app.getHttpServer())
      .get('/customer/albums/album-missing/download.zip')
      .set('x-user-id', 'customer-owner')
      .expect(403);

    expect(response.body.message).toBe(DENY_MESSAGE);
    expect(response.body).not.toHaveProperty('details.customerId');
    expect(response.body).not.toHaveProperty('details.bookingId');
  });
});
