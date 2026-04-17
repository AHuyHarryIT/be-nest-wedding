import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { CustomerAlbumsController } from '../../src/albums/customer-albums.controller';
import { AlbumsService } from '../../src/albums/albums.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';

describe('Customer private album list (e2e)', () => {
  let app: INestApplication<App>;
  let guardSpy: jest.SpiedFunction<JwtAuthGuard['canActivate']>;

  const customerAAlbums = [
    {
      id: 'album-a-1',
      title: 'Customer A Wedding',
      bookingId: 'booking-a-1',
      eventDate: '2026-03-01T00:00:00.000Z',
      deliveredAssetCount: 2,
      coverFile: {
        id: 'file-a-cover',
        name: 'cover-a.jpg',
      },
    },
  ];

  const customerBAlbums = [
    {
      id: 'album-b-1',
      title: 'Customer B Wedding',
      bookingId: 'booking-b-1',
      eventDate: '2026-03-02T00:00:00.000Z',
      deliveredAssetCount: 1,
      coverFile: null,
    },
  ];

  const albumsServiceMock = {
    findCustomerPrivateAlbums: jest.fn((customerId: string) => {
      if (customerId === 'customer-a') {
        return {
          data: customerAAlbums,
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrevious: false,
          },
        };
      }

      if (customerId === 'customer-b') {
        return {
          data: customerBAlbums,
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrevious: false,
          },
        };
      }

      return {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }),
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
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    guardSpy.mockRestore();
    await app.close();
  });

  beforeEach(() => {
    albumsServiceMock.findCustomerPrivateAlbums.mockClear();
  });

  it('customer A sees only customer A private albums', async () => {
    const response = await request(app.getHttpServer())
      .get('/customer/albums/private')
      .set('x-user-id', 'customer-a')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(customerAAlbums);
    expect(response.body.data).not.toEqual(customerBAlbums);
    expect(response.body.data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: expect.any(String),
        bookingId: expect.any(String),
        eventDate: expect.any(String),
        deliveredAssetCount: expect.any(Number),
      }),
    );

    expect(albumsServiceMock.findCustomerPrivateAlbums).toHaveBeenCalledWith(
      'customer-a',
      expect.objectContaining({}),
    );
  });

  it('customer B does not receive customer A records', async () => {
    const response = await request(app.getHttpServer())
      .get('/customer/albums/private')
      .set('x-user-id', 'customer-b')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(customerBAlbums);
    expect(
      response.body.data.find((album: { id: string }) => album.id === 'album-a-1'),
    ).toBeUndefined();

    expect(albumsServiceMock.findCustomerPrivateAlbums).toHaveBeenCalledWith(
      'customer-b',
      expect.objectContaining({}),
    );
  });

  it('unauthenticated request returns 401', async () => {
    await request(app.getHttpServer()).get('/customer/albums/private').expect(401);
  });
});
