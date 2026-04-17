import {
  ExecutionContext,
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

const streamFrom = (content: string) => {
  const stream = new PassThrough();
  stream.end(Buffer.from(content));
  return stream;
};

describe('Customer private album download (e2e)', () => {
  let app: INestApplication<App>;
  let guardSpy: jest.SpiedFunction<JwtAuthGuard['canActivate']>;

  const albumsServiceMock = {
    getCustomerThumbnailStream: jest.fn(async () => ({
      stream: streamFrom('thumb-content'),
      contentType: 'image/jpeg',
    })),
    getCustomerFileStream: jest.fn(async () => ({
      stream: streamFrom('full-content'),
      mimeType: 'image/jpeg',
      byteSize: 12,
      name: 'photo.jpg',
    })),
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

  it('owner streams own thumbnail with 200', async () => {
    const response = await request(app.getHttpServer())
      .get('/customer/albums/file/file-owner/thumbnail')
      .set('x-user-id', 'customer-owner')
      .expect(200);

    expect(response.headers['content-type']).toContain('image/jpeg');
    expect(albumsServiceMock.getCustomerThumbnailStream).toHaveBeenCalledWith(
      'customer-owner',
      'file-owner',
    );
  });

  it('owner streams own content with 200', async () => {
    const response = await request(app.getHttpServer())
      .get('/customer/albums/file/file-owner/content')
      .set('x-user-id', 'customer-owner')
      .expect(200);

    expect(response.headers['content-type']).toContain('image/jpeg');
    expect(response.headers['content-disposition']).toContain('photo.jpg');
    expect(albumsServiceMock.getCustomerFileStream).toHaveBeenCalledWith(
      'customer-owner',
      'file-owner',
    );
  });
});
