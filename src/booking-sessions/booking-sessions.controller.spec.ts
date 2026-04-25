import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { DatabaseService } from '../database/database.service';
import { BookingSessionsController } from './booking-sessions.controller';
import { BookingSessionsService } from './booking-sessions.service';

describe('BookingSessionsController', () => {
  let controller: BookingSessionsController;

  const bookingSessionsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingSessionsController],
      providers: [
        {
          provide: BookingSessionsService,
          useValue: bookingSessionsServiceMock,
        },
        { provide: JwtAuthGuard, useValue: { canActivate: () => true } },
        { provide: PermissionsGuard, useValue: { canActivate: () => true } },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: () => undefined },
        },
        {
          provide: DatabaseService,
          useValue: { staffRole: { findMany: jest.fn() } },
        },
      ],
    }).compile();

    controller = module.get<BookingSessionsController>(
      BookingSessionsController,
    );
  });

  it('applies JwtAuthGuard and PermissionsGuard on the controller', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      BookingSessionsController,
    ) as unknown[];

    expect(guards).toEqual(
      expect.arrayContaining([JwtAuthGuard, PermissionsGuard]),
    );
  });

  it('defines explicit booking permission metadata for each CRUD route', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        BookingSessionsController.prototype.create,
      ),
    ).toEqual(['bookings:create']);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        BookingSessionsController.prototype.findAll,
      ),
    ).toEqual(['bookings:read']);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        BookingSessionsController.prototype.findOne,
      ),
    ).toEqual(['bookings:read']);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        BookingSessionsController.prototype.update,
      ),
    ).toEqual(['bookings:update']);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        BookingSessionsController.prototype.remove,
      ),
    ).toEqual(['bookings:delete']);
  });

  it('returns ResponseBuilder envelopes for booking-session CRUD responses', async () => {
    bookingSessionsServiceMock.create.mockResolvedValue({ id: 'session-1' });
    bookingSessionsServiceMock.findAll.mockResolvedValue({
      data: [{ id: 'session-1' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    bookingSessionsServiceMock.findOne.mockResolvedValue({ id: 'session-1' });
    bookingSessionsServiceMock.update.mockResolvedValue({ id: 'session-1' });
    bookingSessionsServiceMock.remove.mockResolvedValue({ id: 'session-1' });

    const created = await controller.create({} as any);
    expect(created).toEqual(
      expect.objectContaining({
        success: true,
        message: expect.any(String),
        data: expect.objectContaining({ id: 'session-1' }),
      }),
    );

    const paginated = await controller.findAll({} as any);
    expect(paginated).toEqual(
      expect.objectContaining({
        success: true,
        message: expect.any(String),
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'session-1' }),
        ]),
        pagination: expect.objectContaining({ page: 1, limit: 10, total: 1 }),
      }),
    );

    const found = await controller.findOne('session-1');
    expect(found).toEqual(
      expect.objectContaining({
        success: true,
        message: expect.any(String),
        data: expect.objectContaining({ id: 'session-1' }),
      }),
    );

    const updated = await controller.update('session-1', {} as any);
    expect(updated).toEqual(
      expect.objectContaining({
        success: true,
        message: expect.any(String),
        data: expect.objectContaining({ id: 'session-1' }),
      }),
    );

    const removed = await controller.remove('session-1');
    expect(removed).toEqual(
      expect.objectContaining({
        success: true,
        message: expect.any(String),
        data: null,
      }),
    );
  });
});
