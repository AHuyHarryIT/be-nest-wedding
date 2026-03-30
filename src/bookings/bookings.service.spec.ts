import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { DatabaseService } from '../database/database.service';
import { BookingStatus } from 'generated/prisma';

describe('BookingsService', () => {
  let service: BookingsService;

  const databaseServiceMock = {
    user: {
      findUnique: jest.fn(),
    },
    package: {
      findMany: jest.fn(),
    },
    service: {
      findMany: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
    },
    booking: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: DatabaseService, useValue: databaseServiceMock },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('scopes booking lists to the authenticated customer', async () => {
    databaseServiceMock.userRole.findMany.mockResolvedValue([]);
    databaseServiceMock.booking.count.mockResolvedValue(1);
    databaseServiceMock.booking.findMany.mockResolvedValue([
      {
        id: 'booking-1',
        customerId: 'customer-1',
        orders: [],
      },
    ]);

    await service.findAll(
      { customerId: 'other-customer' } as any,
      'customer-1',
    );

    expect(databaseServiceMock.booking.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        customerId: 'customer-1',
      },
    });
    expect(databaseServiceMock.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customerId: 'customer-1',
        }),
      }),
    );
  });

  it('allows staff users to filter bookings by any customer', async () => {
    databaseServiceMock.userRole.findMany.mockResolvedValue([
      {
        role: {
          name: 'admin',
        },
      },
    ]);
    databaseServiceMock.booking.count.mockResolvedValue(1);
    databaseServiceMock.booking.findMany.mockResolvedValue([]);

    await service.findAll({ customerId: 'customer-2' } as any, 'staff-1');

    expect(databaseServiceMock.booking.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        customerId: 'customer-2',
      },
    });
  });

  it('rejects customer access to another customer booking', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      customerId: 'customer-2',
      status: BookingStatus.PENDING,
      orders: [],
    });
    databaseServiceMock.userRole.findMany.mockResolvedValue([]);

    await expect(
      service.findOne('booking-1', 'customer-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows staff access to any booking', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      customerId: 'customer-2',
      status: BookingStatus.CONFIRMED,
      orders: [],
    });
    databaseServiceMock.userRole.findMany.mockResolvedValue([
      {
        role: {
          name: 'staff',
        },
      },
    ]);

    const booking = await service.findOne('booking-1', 'staff-1');

    expect(booking.id).toBe('booking-1');
    expect(booking.customerId).toBe('customer-2');
  });

  it('creates a customer booking for the authenticated customer and computes total price', async () => {
    databaseServiceMock.userRole.findMany.mockResolvedValue([]);
    databaseServiceMock.user.findUnique.mockResolvedValue({
      id: 'customer-1',
    });
    databaseServiceMock.package.findMany.mockResolvedValue([
      { id: 'package-1', price: 250000 },
    ]);
    databaseServiceMock.service.findMany.mockResolvedValue([
      { id: 'service-1', price: 50000 },
    ]);
    databaseServiceMock.booking.create.mockResolvedValue({
      id: 'booking-1',
      customerId: 'customer-1',
      totalPrice: 300000,
      status: BookingStatus.PENDING,
    });

    await service.create(
      {
        packageIds: ['package-1'],
        serviceIds: ['service-1'],
        eventDate: '2026-12-20T10:00:00.000Z',
      },
      'customer-1',
    );

    expect(databaseServiceMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customer: { connect: { id: 'customer-1' } },
          totalPrice: 300000,
        }),
      }),
    );
  });

  it('rejects customer attempts to create bookings for another customer', async () => {
    databaseServiceMock.userRole.findMany.mockResolvedValue([]);

    await expect(
      service.create(
        {
          customerId: 'customer-2',
          packageIds: ['package-1'],
          eventDate: '2026-12-20T10:00:00.000Z',
        },
        'customer-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
