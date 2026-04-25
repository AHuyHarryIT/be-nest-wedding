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

describe('Customer private album assets (e2e)', () => {
  let app: INestApplication<App>;
  let guardSpy: jest.SpiedFunction<JwtAuthGuard['canActivate']>;

  const ownerAssets = [
    {
      id: 'file-1',
      name: 'photo-1.jpg',
      mimeType: 'image/jpeg',
      byteSize: 1200,
    },
    {
      id: 'file-2',
      name: 'photo-2.jpg',
      mimeType: 'image/jpeg',
      byteSize: 1400,
    },
  ];

  const albumsServiceMock = {
    findCustomerPrivateAlbumAssets: jest.fn(
      async (_customerId: string, albumId: string) => {
        if (albumId === 'album-owner') {
          return ownerAssets;
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
    albumsServiceMock.findCustomerPrivateAlbumAssets.mockClear();
  });

  it('GET /customer/albums/:albumId/assets returns owned album file metadata for owner', async () => {
    const response = await request(app.getHttpServer())
      .get('/customer/albums/album-owner/assets')
      .set('x-user-id', 'customer-owner')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(ownerAssets);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          mimeType: expect.any(String),
          byteSize: expect.any(Number),
        }),
      ]),
    );

    expect(
      albumsServiceMock.findCustomerPrivateAlbumAssets,
    ).toHaveBeenCalledWith('customer-owner', 'album-owner');
  });

  it('foreign albumId returns 403 explicit non-enumerating denial', async () => {
    const response = await request(app.getHttpServer())
      .get('/customer/albums/album-foreign/assets')
      .set('x-user-id', 'customer-owner')
      .expect(403);

    expect(response.body.message).toBe(DENY_MESSAGE);
    expect(response.body).not.toHaveProperty('details.customerId');
    expect(response.body).not.toHaveProperty('details.bookingId');
  });

  it('nonexistent albumId returns the same 403 explicit non-enumerating denial', async () => {
    const response = await request(app.getHttpServer())
      .get('/customer/albums/album-missing/assets')
      .set('x-user-id', 'customer-owner')
      .expect(403);

    expect(response.body.message).toBe(DENY_MESSAGE);
    expect(response.body).not.toHaveProperty('details.customerId');
    expect(response.body).not.toHaveProperty('details.bookingId');
  });
});
