import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus } from 'generated/prisma';
import { DatabaseService } from '../database/database.service';
import { BookingsService } from './bookings.service';

describe('BookingsService', () => {
  let service: BookingsService;

  const databaseServiceMock = {
    customer: {
      findUnique: jest.fn(),
    },
    package: {
      findMany: jest.fn(),
    },
    service: {
      findMany: jest.fn(),
    },
    staffRole: {
      findMany: jest.fn(),
    },
    staff: {
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
    bookingSession: {
      findMany: jest.fn(),
    },
    bookingPackage: {
      deleteMany: jest.fn(),
    },
    bookingService: {
      deleteMany: jest.fn(),
    },
  };

  const baseBooking = {
    id: 'booking-1',
    customerId: 'customer-1',
    notes: null,
    status: BookingStatus.PENDING,
    eventDate: new Date('2026-12-20T10:00:00.000Z'),
    totalPrice: 0,
    cancelledAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    orders: [],
    assignedStaffs: [],
  };

  const makeEligibleStaff = (
    id: string,
    jobIds: string[] = ['job-1'],
    isActive = true,
  ) => ({
    id,
    isActive,
    roles: [{ roleId: 'role-1' }],
    staffJobs: jobIds.map((jobId) => ({ jobId })),
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: DatabaseService, useValue: databaseServiceMock },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('scopes booking lists to the authenticated customer', async () => {
    databaseServiceMock.staffRole.findMany.mockResolvedValue([]);
    databaseServiceMock.booking.count.mockResolvedValue(1);
    databaseServiceMock.booking.findMany.mockResolvedValue([baseBooking]);

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
    databaseServiceMock.staffRole.findMany.mockResolvedValue([
      {
        role: {
          name: 'admin',
        },
      },
    ]);
    databaseServiceMock.booking.count.mockResolvedValue(1);
    databaseServiceMock.booking.findMany.mockResolvedValue([baseBooking]);

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
      ...baseBooking,
      customerId: 'customer-2',
    });
    databaseServiceMock.staffRole.findMany.mockResolvedValue([]);

    await expect(
      service.findOne('booking-1', 'customer-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows staff access to any booking', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      customerId: 'customer-2',
      status: BookingStatus.CONFIRMED,
    });
    databaseServiceMock.staffRole.findMany.mockResolvedValue([
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

  it('creates a booking with assigned staff and computes total price', async () => {
    databaseServiceMock.staffRole.findMany.mockResolvedValue([]);
    databaseServiceMock.customer.findUnique.mockResolvedValue({
      id: 'customer-1',
    });
    databaseServiceMock.package.findMany.mockResolvedValue([
      { id: 'package-1', price: 250000 },
    ]);
    databaseServiceMock.service.findMany.mockResolvedValue([
      { id: 'service-1', price: 50000 },
    ]);
    databaseServiceMock.staff.findMany.mockResolvedValue([
      makeEligibleStaff('STF-001'),
    ]);
    databaseServiceMock.booking.create.mockResolvedValue({
      ...baseBooking,
      totalPrice: 300000,
      assignedStaffs: [
        {
          staffId: 'STF-001',
          staff: {
            id: 'STF-001',
            firstName: 'Assigned',
            lastName: 'Staff',
            email: 'staff@example.com',
            phoneNumber: '0900000001',
            isActive: true,
          },
        },
      ],
    });

    const result = await service.create(
      {
        packageIds: ['package-1'],
        serviceIds: ['service-1'],
        staffIds: ['STF-001'],
        eventDate: '2026-12-20T10:00:00.000Z',
      } as any,
      'customer-1',
    );

    expect(databaseServiceMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customer: { connect: { id: 'customer-1' } },
          totalPrice: 300000,
          assignedStaffs: {
            create: [
              expect.objectContaining({
                sourceKey: 'staff:STF-001',
                staffId: 'STF-001',
                serviceLabel: null,
                job: null,
              }),
            ],
          },
        }),
      }),
    );
    expect(result.assignedStaffs).toEqual([
      expect.objectContaining({ id: 'STF-001' }),
    ]);
  });

  it('persists optional location and time on booking staff assignments', async () => {
    databaseServiceMock.staffRole.findMany.mockResolvedValue([
      {
        role: { name: 'admin' },
      },
    ]);
    databaseServiceMock.customer.findUnique.mockResolvedValue({
      id: 'customer-1',
    });
    databaseServiceMock.service.findMany
      .mockResolvedValueOnce([{ id: 'service-1', jobId: 'job-photo' }])
      .mockResolvedValueOnce([{ id: 'service-1', price: 50000 }])
      .mockResolvedValueOnce([{ id: 'service-1', price: 50000 }]);
    databaseServiceMock.staff.findMany.mockResolvedValue([
      makeEligibleStaff('STF-001', ['job-photo']),
    ]);
    databaseServiceMock.booking.create.mockResolvedValue({
      ...baseBooking,
      totalPrice: 50000,
      assignedStaffs: [
        {
          sourceKey: 'service:service-1',
          staffId: 'STF-001',
          serviceLabel: 'Photography',
          job: 'Lead Photographer',
          locationName: 'Da Nang Beach Resort',
          startTime: '09:30',
          endTime: '11:30',
          staff: {
            id: 'STF-001',
            firstName: 'Assigned',
            lastName: 'Staff',
            email: 'staff@example.com',
            phoneNumber: '0900000001',
            isActive: true,
          },
        },
      ],
    });

    const result = await service.create(
      {
        customerId: 'customer-1',
        serviceIds: ['service-1'],
        totalPrice: 50000,
        eventDate: '2026-12-20T10:00:00.000Z',
        staffAssignments: [
          {
            sourceKey: 'service:service-1',
            staffId: 'STF-001',
            serviceLabel: 'Photography',
            job: 'Lead Photographer',
            locationName: 'Da Nang Beach Resort',
            startTime: '09:30',
            endTime: '11:30',
          },
        ],
      } as any,
      'STF-ADMIN',
    );

    expect(databaseServiceMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedStaffs: {
            create: [
              expect.objectContaining({
                sourceKey: 'service:service-1',
                staffId: 'STF-001',
                serviceLabel: 'Photography',
                job: 'Lead Photographer',
                locationName: 'Da Nang Beach Resort',
                startTime: '09:30',
                endTime: '11:30',
              }),
            ],
          },
        }),
      }),
    );
    expect(result.assignedStaffs).toEqual([
      expect.objectContaining({
        id: 'STF-001',
        locationName: 'Da Nang Beach Resort',
        startTime: '09:30',
        endTime: '11:30',
      }),
    ]);
  });

  it('rejects customer attempts to create bookings for another customer', async () => {
    databaseServiceMock.staffRole.findMany.mockResolvedValue([]);

    await expect(
      service.create(
        {
          customerId: 'customer-2',
          packageIds: ['package-1'],
          eventDate: '2026-12-20T10:00:00.000Z',
        } as any,
        'customer-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows assignment-only updates on confirmed bookings', async () => {
    databaseServiceMock.booking.findFirst
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CONFIRMED,
        assignedStaffs: [],
      })
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CONFIRMED,
        assignedStaffs: [
          {
            staffId: 'STF-002',
            staff: {
              id: 'STF-002',
              firstName: 'Second',
              lastName: 'Staff',
              email: 'staff2@example.com',
              phoneNumber: '0900000002',
              isActive: true,
            },
          },
        ],
      });
    databaseServiceMock.staff.findMany.mockResolvedValue([
      makeEligibleStaff('STF-002'),
    ]);
    databaseServiceMock.booking.update.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      assignedStaffs: [
        {
          staffId: 'STF-002',
          staff: {
            id: 'STF-002',
            firstName: 'Second',
            lastName: 'Staff',
            email: 'staff2@example.com',
            phoneNumber: '0900000002',
            isActive: true,
          },
        },
      ],
    });

    const result = await service.update('booking-1', {
      staffIds: ['STF-002'],
    } as any);

    expect(databaseServiceMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          assignedStaffs: {
            deleteMany: {},
            create: [
              expect.objectContaining({
                sourceKey: 'staff:STF-002',
                staffId: 'STF-002',
                serviceLabel: null,
                job: null,
              }),
            ],
          },
        }),
      }),
    );
    expect(result.assignedStaffs).toEqual([
      expect.objectContaining({ id: 'STF-002' }),
    ]);
  });

  it('returns BOOK-01 core detail references after creating a booking', async () => {
    databaseServiceMock.staffRole.findMany.mockResolvedValue([
      {
        role: {
          name: 'admin',
        },
      },
    ]);
    databaseServiceMock.customer.findUnique.mockResolvedValue({
      id: 'customer-1',
    });
    databaseServiceMock.package.findMany.mockResolvedValue([
      { id: 'package-1', price: 250000, isActive: true, services: [] },
    ]);
    databaseServiceMock.service.findMany.mockResolvedValue([
      { id: 'service-1', price: 50000, isActive: true, jobId: 'job-photo' },
    ]);
    databaseServiceMock.staff.findMany.mockResolvedValue([
      makeEligibleStaff('STF-001', ['job-photo']),
    ]);
    databaseServiceMock.booking.create.mockResolvedValue({
      ...baseBooking,
      customerId: 'customer-1',
      notes: 'Garden wedding',
      status: BookingStatus.PENDING,
      eventDate: new Date('2026-12-20T10:00:00.000Z'),
      totalPrice: 350000,
      customer: {
        id: 'customer-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phoneNumber: '0900111222',
      },
      packages: [
        {
          packageId: 'package-1',
          price: 250000,
          package: { id: 'package-1', name: 'Wedding Basic' },
        },
      ],
      services: [
        {
          serviceId: 'service-1',
          price: 50000,
          service: { id: 'service-1', name: 'Photography' },
        },
      ],
      assignedStaffs: [
        {
          sourceKey: 'service:service-1',
          staffId: 'STF-001',
          serviceLabel: 'Photography',
          staff: {
            id: 'STF-001',
            firstName: 'Assigned',
            lastName: 'Staff',
            email: 'staff@example.com',
            phoneNumber: '0900000001',
            isActive: true,
          },
        },
      ],
    });

    const result = await service.create(
      {
        customerId: 'customer-1',
        packageIds: ['package-1'],
        serviceIds: ['service-1'],
        eventDate: '2026-12-20T10:00:00.000Z',
        notes: 'Garden wedding',
        totalPrice: 350000,
      } as any,
      'staff-1',
    );

    expect(result).toEqual(
      expect.objectContaining({
        customerId: 'customer-1',
        status: BookingStatus.PENDING,
        totalPrice: 350000,
        notes: 'Garden wedding',
        packages: expect.arrayContaining([
          expect.objectContaining({ packageId: 'package-1' }),
        ]),
        services: expect.arrayContaining([
          expect.objectContaining({ serviceId: 'service-1' }),
        ]),
      }),
    );
  });

  it('preserves assignment/session references while updating editable BOOK-01 core fields', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.PENDING,
      packages: [
        {
          packageId: 'package-1',
          package: {
            id: 'package-1',
            services: [{ serviceId: 'service-1', service: { id: 'service-1', jobId: 'job-photo' } }],
          },
        },
      ],
      services: [{ serviceId: 'service-1', service: { id: 'service-1', jobId: 'job-photo' } }],
      sessions: [
        {
          id: 'session-1',
          title: 'Morning Session',
          staffs: [{ staffId: 'STF-001' }],
        },
      ],
      assignedStaffs: [
        {
          sourceKey: 'service:service-1',
          staffId: 'STF-001',
          serviceLabel: 'Photography',
          staff: {
            id: 'STF-001',
            firstName: 'Assigned',
            lastName: 'Staff',
            email: 'staff@example.com',
            phoneNumber: '0900000001',
            isActive: true,
          },
        },
      ],
    });
    databaseServiceMock.booking.update.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.PENDING,
      notes: 'Updated note',
      eventDate: new Date('2026-12-21T10:00:00.000Z'),
      totalPrice: 360000,
      sessions: [
        {
          id: 'session-1',
          title: 'Morning Session',
        },
      ],
      assignedStaffs: [
        {
          sourceKey: 'service:service-1',
          staffId: 'STF-001',
          serviceLabel: 'Photography',
          staff: {
            id: 'STF-001',
            firstName: 'Assigned',
            lastName: 'Staff',
            email: 'staff@example.com',
            phoneNumber: '0900000001',
            isActive: true,
          },
        },
      ],
    });

    const result = await service.update('booking-1', {
      notes: 'Updated note',
      eventDate: '2026-12-21T10:00:00.000Z',
      totalPrice: 360000,
    } as any);

    expect(databaseServiceMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          sessions: expect.any(Object),
          assignedStaffs: expect.any(Object),
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        notes: 'Updated note',
        totalPrice: 360000,
        assignedStaffs: expect.arrayContaining([
          expect.objectContaining({ staffId: 'STF-001' }),
        ]),
      }),
    );
  });

  it('returns BOOK-01 core details in booking list rows when include flags are enabled', async () => {
    databaseServiceMock.staffRole.findMany.mockResolvedValue([
      {
        role: {
          name: 'admin',
        },
      },
    ]);
    databaseServiceMock.booking.count.mockResolvedValue(1);
    databaseServiceMock.booking.findMany.mockResolvedValue([
      {
        ...baseBooking,
        customer: {
          id: 'customer-1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          phoneNumber: '0900111222',
        },
        packages: [{ packageId: 'package-1' }],
        services: [{ serviceId: 'service-1' }],
      },
    ]);

    const result = await service.findAll(
      {
        includeCustomer: true,
        includePackages: true,
        includeServices: true,
        page: 1,
        limit: 10,
      } as any,
      'staff-1',
    );

    expect(result.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          customerId: 'customer-1',
          customer: expect.objectContaining({ id: 'customer-1' }),
          packages: expect.arrayContaining([
            expect.objectContaining({ packageId: 'package-1' }),
          ]),
          services: expect.arrayContaining([
            expect.objectContaining({ serviceId: 'service-1' }),
          ]),
        }),
      ]),
    );
  });

  it('allows a status-only update from CONFIRMED to COMPLETED', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      assignedStaffs: [],
    });
    databaseServiceMock.booking.update.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.COMPLETED,
      assignedStaffs: [],
    });

    const result = await service.update('booking-1', {
      status: BookingStatus.COMPLETED,
    });

    expect(databaseServiceMock.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: {
        status: BookingStatus.COMPLETED,
      },
      include: expect.any(Object),
    });
    expect(result.status).toBe(BookingStatus.COMPLETED);
  });

  it('rejects completing a booking from non-CONFIRMED states through generic updates', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.PENDING,
      assignedStaffs: [],
    });

    await expect(
      service.update('booking-1', {
        status: BookingStatus.COMPLETED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(databaseServiceMock.booking.update).not.toHaveBeenCalled();
  });

  it('allows confirming a booking from PENDING status', async () => {
    databaseServiceMock.booking.findFirst
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.PENDING,
        assignedStaffs: [],
      })
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CONFIRMED,
        assignedStaffs: [],
      });

    databaseServiceMock.booking.update.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      assignedStaffs: [],
    });

    const result = await service.confirmBooking('booking-1');

    expect(databaseServiceMock.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { status: BookingStatus.CONFIRMED },
    });
    expect(result.status).toBe(BookingStatus.CONFIRMED);
  });

  it('rejects confirming a booking from CANCELLED status', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CANCELLED,
      assignedStaffs: [],
    });

    await expect(service.confirmBooking('booking-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(databaseServiceMock.booking.update).not.toHaveBeenCalled();
  });

  it('rejects confirming a booking from COMPLETED status', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.COMPLETED,
      assignedStaffs: [],
    });

    await expect(service.confirmBooking('booking-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(databaseServiceMock.booking.update).not.toHaveBeenCalled();
  });

  it('rejects cancelling a booking that is already cancelled', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date('2026-03-31T10:00:00.000Z'),
      assignedStaffs: [],
    });

    await expect(service.cancelBooking('booking-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(databaseServiceMock.booking.update).not.toHaveBeenCalled();
  });

  it('allows confirming a booking from DEPOSIT_PAID status', async () => {
    databaseServiceMock.booking.findFirst
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.DEPOSIT_PAID,
        assignedStaffs: [],
      })
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CONFIRMED,
        assignedStaffs: [],
      });

    databaseServiceMock.booking.update.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      assignedStaffs: [],
    });

    const result = await service.confirmBooking('booking-1');

    expect(databaseServiceMock.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { status: BookingStatus.CONFIRMED },
    });
    expect(result.status).toBe(BookingStatus.CONFIRMED);
  });

  it('rejects status-only confirm updates from CANCELLED status', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CANCELLED,
      assignedStaffs: [],
    });

    await expect(
      service.update('booking-1', {
        status: BookingStatus.CONFIRMED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(databaseServiceMock.booking.update).not.toHaveBeenCalled();
  });

  it('allows status-only confirm updates from PENDING status', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.PENDING,
      assignedStaffs: [],
    });
    databaseServiceMock.booking.update.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      assignedStaffs: [],
    });

    const result = await service.update('booking-1', {
      status: BookingStatus.CONFIRMED,
    });

    expect(databaseServiceMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          status: BookingStatus.CONFIRMED,
        }),
      }),
    );
    expect(result.status).toBe(BookingStatus.CONFIRMED);
  });

  it('rejects status-only completion updates from DEPOSIT_PAID status', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.DEPOSIT_PAID,
      assignedStaffs: [],
    });

    await expect(
      service.update('booking-1', {
        status: BookingStatus.COMPLETED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(databaseServiceMock.booking.update).not.toHaveBeenCalled();
  });

  it('retains cancelledAt stamping when cancellation succeeds', async () => {
    databaseServiceMock.booking.findFirst
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CONFIRMED,
        assignedStaffs: [],
      })
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date('2026-03-31T10:00:00.000Z'),
        assignedStaffs: [],
      });

    databaseServiceMock.booking.update.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date('2026-03-31T10:00:00.000Z'),
      assignedStaffs: [],
    });

    await service.cancelBooking('booking-1');

    expect(databaseServiceMock.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: expect.any(Date),
      },
    });
  });

  it('rejects completing a booking from CANCELLED status', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CANCELLED,
      assignedStaffs: [],
    });

    await expect(
      service.update('booking-1', {
        status: BookingStatus.COMPLETED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(databaseServiceMock.booking.update).not.toHaveBeenCalled();
  });

  it('rejects confirming a booking from COMPLETED status through generic update', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.COMPLETED,
      assignedStaffs: [],
    });

    await expect(
      service.update('booking-1', {
        status: BookingStatus.CONFIRMED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(databaseServiceMock.booking.update).not.toHaveBeenCalled();
  });

  it('allows status-only confirm updates from DEPOSIT_PAID status', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.DEPOSIT_PAID,
      assignedStaffs: [],
    });
    databaseServiceMock.booking.update.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      assignedStaffs: [],
    });

    const result = await service.update('booking-1', {
      status: BookingStatus.CONFIRMED,
    });

    expect(databaseServiceMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          status: BookingStatus.CONFIRMED,
        }),
      }),
    );
    expect(result.status).toBe(BookingStatus.CONFIRMED);
  });

  it('rejects status-only completion updates from RESCHEDULED status', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.RESCHEDULED,
      assignedStaffs: [],
    });

    await expect(
      service.update('booking-1', {
        status: BookingStatus.COMPLETED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(databaseServiceMock.booking.update).not.toHaveBeenCalled();
  });

  it('allows status-only confirm updates from RESCHEDULED status', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.RESCHEDULED,
      assignedStaffs: [],
    });
    databaseServiceMock.booking.update.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      assignedStaffs: [],
    });

    const result = await service.update('booking-1', {
      status: BookingStatus.CONFIRMED,
    });

    expect(databaseServiceMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          status: BookingStatus.CONFIRMED,
        }),
      }),
    );
    expect(result.status).toBe(BookingStatus.CONFIRMED);
  });

  it('rejects direct status updates to CANCELLED through generic booking updates', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      assignedStaffs: [],
    });

    await expect(
      service.update('booking-1', {
        status: BookingStatus.CANCELLED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('assigns staff through the dedicated booking assignment flow', async () => {
    databaseServiceMock.booking.findFirst
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CONFIRMED,
        assignedStaffs: [],
      })
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CONFIRMED,
        assignedStaffs: [
          {
            staffId: 'STF-003',
            staff: {
              id: 'STF-003',
              firstName: 'Assigned',
              lastName: 'Person',
              email: 'person@example.com',
              phoneNumber: '0900000003',
              isActive: true,
            },
          },
        ],
      });
    databaseServiceMock.staff.findMany.mockResolvedValue([
      makeEligibleStaff('STF-003'),
    ]);
    databaseServiceMock.booking.update.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      assignedStaffs: [
        {
          staffId: 'STF-003',
          staff: {
            id: 'STF-003',
            firstName: 'Assigned',
            lastName: 'Person',
            email: 'person@example.com',
            phoneNumber: '0900000003',
            isActive: true,
          },
        },
      ],
    });

    const result = await service.assignStaff('booking-1', ['STF-003']);

    expect(databaseServiceMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          assignedStaffs: {
            deleteMany: {},
            create: [
              expect.objectContaining({
                sourceKey: 'staff:STF-003',
                staffId: 'STF-003',
                serviceLabel: null,
                job: null,
              }),
            ],
          },
        }),
      }),
    );
    expect(result.assignedStaffs).toEqual([
      expect.objectContaining({ id: 'STF-003' }),
    ]);
  });

  it('assigns staff with a booking job through the dedicated flow', async () => {
    databaseServiceMock.booking.findFirst
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CONFIRMED,
        assignedStaffs: [],
      })
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CONFIRMED,
        assignedStaffs: [
          {
            staffId: 'STF-004',
            job: 'Main photographer',
            staff: {
              id: 'STF-004',
              firstName: 'Lead',
              lastName: 'Shooter',
              email: 'lead@example.com',
              phoneNumber: '0900000004',
              isActive: true,
            },
          },
        ],
      });
    databaseServiceMock.staff.findMany.mockResolvedValue([
      makeEligibleStaff('STF-004'),
    ]);
    databaseServiceMock.booking.update.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      assignedStaffs: [
        {
          staffId: 'STF-004',
          job: 'Main photographer',
          staff: {
            id: 'STF-004',
            firstName: 'Lead',
            lastName: 'Shooter',
            email: 'lead@example.com',
            phoneNumber: '0900000004',
            isActive: true,
          },
        },
      ],
    });

    const result = await service.assignStaff('booking-1', [
      {
        sourceKey: 'service:svc-1',
        staffId: 'STF-004',
        serviceLabel: 'Photography',
        job: 'Main photographer',
      },
    ]);

    expect(databaseServiceMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          assignedStaffs: {
            deleteMany: {},
            create: [
              expect.objectContaining({
                sourceKey: 'service:svc-1',
                staffId: 'STF-004',
                serviceLabel: 'Photography',
                job: 'Main photographer',
              }),
            ],
          },
        }),
      }),
    );
    expect(result.assignedStaffs).toEqual([
      expect.objectContaining({
        id: 'STF-004',
        job: 'Main photographer',
      }),
    ]);
  });

  it('rejects assigning staff who do not have both a role and a managed job', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      assignedStaffs: [],
    });
    databaseServiceMock.staff.findMany.mockResolvedValue([
      {
        id: 'STF-005',
        roles: [],
        staffJobs: [{ jobId: 'job-1' }],
      },
    ]);

    await expect(
      service.assignStaff('booking-1', ['STF-005']),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(databaseServiceMock.booking.update).not.toHaveBeenCalled();
  });

  it('rejects assigning inactive staff', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      assignedStaffs: [],
      services: [],
      packages: [],
    });
    databaseServiceMock.staff.findMany.mockResolvedValue([
      makeEligibleStaff('STF-INACTIVE', ['job-1'], false),
    ]);

    await expect(
      service.assignStaff('booking-1', ['STF-INACTIVE']),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(databaseServiceMock.booking.update).not.toHaveBeenCalled();
  });

  it('rejects assigning staff whose managed jobs differ from the booking service jobs', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      services: [
        {
          serviceId: 'svc-photo',
          service: {
            id: 'svc-photo',
            jobId: 'job-photo',
          },
        },
      ],
      packages: [],
      assignedStaffs: [],
    });
    databaseServiceMock.staff.findMany.mockResolvedValue([
      makeEligibleStaff('STF-006', ['job-video']),
    ]);

    await expect(
      service.assignStaff('booking-1', [
        {
          sourceKey: 'service:svc-photo',
          staffId: 'STF-006',
          serviceLabel: 'Photography',
          job: 'Lead Photographer',
        },
      ]),
    ).rejects.toThrow(BadRequestException);

    expect(databaseServiceMock.booking.update).not.toHaveBeenCalled();
  });

  it('allows assigning the same staff to multiple service rows in one booking', async () => {
    databaseServiceMock.booking.findFirst
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CONFIRMED,
        assignedStaffs: [],
      })
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CONFIRMED,
        assignedStaffs: [
          {
            sourceKey: 'service:svc-photo',
            staffId: 'STF-007',
            serviceLabel: 'Photography',
            job: 'Lead Photographer',
            staff: {
              id: 'STF-007',
              firstName: 'Reuse',
              lastName: 'Staff',
              email: 'reuse@example.com',
              phoneNumber: '0900000007',
              isActive: true,
            },
          },
          {
            sourceKey: 'service:svc-event',
            staffId: 'STF-007',
            serviceLabel: 'Event Planning',
            job: 'Booking Coordinator',
            staff: {
              id: 'STF-007',
              firstName: 'Reuse',
              lastName: 'Staff',
              email: 'reuse@example.com',
              phoneNumber: '0900000007',
              isActive: true,
            },
          },
        ],
      });
    databaseServiceMock.staff.findMany.mockResolvedValue([
      makeEligibleStaff('STF-007', ['job-photo', 'job-event']),
    ]);
    databaseServiceMock.booking.update.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      assignedStaffs: [
        {
          sourceKey: 'service:svc-photo',
          staffId: 'STF-007',
          serviceLabel: 'Photography',
          job: 'Lead Photographer',
          staff: {
            id: 'STF-007',
            firstName: 'Reuse',
            lastName: 'Staff',
            email: 'reuse@example.com',
            phoneNumber: '0900000007',
            isActive: true,
          },
        },
        {
          sourceKey: 'service:svc-event',
          staffId: 'STF-007',
          serviceLabel: 'Event Planning',
          job: 'Booking Coordinator',
          staff: {
            id: 'STF-007',
            firstName: 'Reuse',
            lastName: 'Staff',
            email: 'reuse@example.com',
            phoneNumber: '0900000007',
            isActive: true,
          },
        },
      ],
    });

    const result = await service.assignStaff('booking-1', [
      {
        sourceKey: 'service:svc-photo',
        staffId: 'STF-007',
        serviceLabel: 'Photography',
        job: 'Lead Photographer',
      },
      {
        sourceKey: 'service:svc-event',
        staffId: 'STF-007',
        serviceLabel: 'Event Planning',
        job: 'Booking Coordinator',
      },
    ]);

    expect(databaseServiceMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          assignedStaffs: {
            deleteMany: {},
            create: [
              expect.objectContaining({
                sourceKey: 'service:svc-photo',
                staffId: 'STF-007',
                serviceLabel: 'Photography',
                job: 'Lead Photographer',
              }),
              expect.objectContaining({
                sourceKey: 'service:svc-event',
                staffId: 'STF-007',
                serviceLabel: 'Event Planning',
                job: 'Booking Coordinator',
              }),
            ],
          },
        }),
      }),
    );
    expect(result.assignedStaffs).toEqual([
      expect.objectContaining({
        id: 'STF-007',
        sourceKey: 'service:svc-photo',
        serviceLabel: 'Photography',
      }),
      expect.objectContaining({
        id: 'STF-007',
        sourceKey: 'service:svc-event',
        serviceLabel: 'Event Planning',
      }),
    ]);
  });

  it('blocks overlapping assignment save when override context is not provided', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      services: [
        {
          serviceId: 'svc-photo',
          service: {
            id: 'svc-photo',
            jobId: 'job-photo',
          },
        },
      ],
      packages: [],
      assignedStaffs: [],
    });
    databaseServiceMock.staff.findMany.mockResolvedValue([
      makeEligibleStaff('STF-008', ['job-photo']),
    ]);
    databaseServiceMock.booking.findMany.mockResolvedValue([
      {
        id: 'booking-2',
        eventDate: new Date('2026-12-20T00:00:00.000Z'),
        assignedStaffs: [
          {
            sourceKey: 'service:svc-existing',
            staffId: 'STF-008',
            serviceLabel: 'Existing coverage',
            startTime: '2026-12-20T09:30:00.000Z',
            endTime: '2026-12-20T11:30:00.000Z',
          },
        ],
      },
    ]);
    databaseServiceMock.bookingSession.findMany.mockResolvedValue([]);

    await expect(
      service.assignStaff('booking-1', [
        {
          sourceKey: 'service:svc-photo',
          staffId: 'STF-008',
          serviceLabel: 'Photography',
          startTime: '2026-12-20T10:00:00.000Z',
          endTime: '2026-12-20T12:00:00.000Z',
        },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(databaseServiceMock.booking.update).not.toHaveBeenCalled();
  });

  it('rejects overlap override when override reason is missing or blank', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      services: [
        {
          serviceId: 'svc-photo',
          service: {
            id: 'svc-photo',
            jobId: 'job-photo',
          },
        },
      ],
      packages: [],
      assignedStaffs: [],
    });
    databaseServiceMock.staff.findMany.mockResolvedValue([
      makeEligibleStaff('STF-009', ['job-photo']),
    ]);
    databaseServiceMock.booking.findMany.mockResolvedValue([
      {
        id: 'booking-3',
        eventDate: new Date('2026-12-20T00:00:00.000Z'),
        assignedStaffs: [
          {
            sourceKey: 'service:svc-existing',
            staffId: 'STF-009',
            serviceLabel: 'Existing coverage',
            startTime: '2026-12-20T09:30:00.000Z',
            endTime: '2026-12-20T11:30:00.000Z',
          },
        ],
      },
    ]);
    databaseServiceMock.bookingSession.findMany.mockResolvedValue([]);

    await expect(
      (service.assignStaff as any)(
        'booking-1',
        [
          {
            sourceKey: 'service:svc-photo',
            staffId: 'STF-009',
            serviceLabel: 'Photography',
            startTime: '2026-12-20T10:00:00.000Z',
            endTime: '2026-12-20T12:00:00.000Z',
          },
        ],
        {
          allowConflictOverride: true,
          overrideReason: '   ',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(databaseServiceMock.booking.update).not.toHaveBeenCalled();
  });

  it('allows overlap override with non-empty reason and returns updated assignment', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      services: [
        {
          serviceId: 'svc-photo',
          service: {
            id: 'svc-photo',
            jobId: 'job-photo',
          },
        },
      ],
      packages: [],
      assignedStaffs: [],
    });
    databaseServiceMock.staff.findMany.mockResolvedValue([
      makeEligibleStaff('STF-010', ['job-photo']),
    ]);
    databaseServiceMock.booking.findMany.mockResolvedValue([
      {
        id: 'booking-4',
        eventDate: new Date('2026-12-20T00:00:00.000Z'),
        assignedStaffs: [
          {
            sourceKey: 'service:svc-existing',
            staffId: 'STF-010',
            serviceLabel: 'Existing coverage',
            startTime: '2026-12-20T09:30:00.000Z',
            endTime: '2026-12-20T11:30:00.000Z',
          },
        ],
      },
    ]);
    databaseServiceMock.bookingSession.findMany.mockResolvedValue([
      {
        id: 'session-1',
        title: 'Morning Ceremony',
        bookingId: 'booking-5',
        startsAt: new Date('2026-12-20T08:30:00.000Z'),
        endsAt: new Date('2026-12-20T10:30:00.000Z'),
        staffs: [{ staffId: 'STF-010' }],
      },
    ]);
    databaseServiceMock.booking.update.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CONFIRMED,
      assignedStaffs: [
        {
          sourceKey: 'service:svc-photo',
          staffId: 'STF-010',
          serviceLabel: 'Photography',
          startTime: '2026-12-20T10:00:00.000Z',
          endTime: '2026-12-20T12:00:00.000Z',
          staff: {
            id: 'STF-010',
            firstName: 'Override',
            lastName: 'Allowed',
            email: 'override@example.com',
            phoneNumber: '0900000010',
            isActive: true,
          },
        },
      ],
    });

    const result = await (service.assignStaff as any)(
      'booking-1',
      [
        {
          sourceKey: 'service:svc-photo',
          staffId: 'STF-010',
          serviceLabel: 'Photography',
          startTime: '2026-12-20T10:00:00.000Z',
          endTime: '2026-12-20T12:00:00.000Z',
        },
      ],
      {
        allowConflictOverride: true,
        overrideReason: 'Coverage handoff required for ceremony transition',
      },
    );

    expect(databaseServiceMock.booking.findMany).toHaveBeenCalled();
    expect(databaseServiceMock.bookingSession.findMany).toHaveBeenCalled();
    expect(databaseServiceMock.booking.update).toHaveBeenCalled();
    expect(result.assignedStaffs).toEqual([
      expect.objectContaining({ id: 'STF-010' }),
    ]);
  });

  it('cancels non-completed bookings through the dedicated cancel flow', async () => {
    databaseServiceMock.booking.findFirst
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CONFIRMED,
        assignedStaffs: [],
      })
      .mockResolvedValueOnce({
        ...baseBooking,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date('2026-03-31T10:00:00.000Z'),
        assignedStaffs: [],
      });
    databaseServiceMock.booking.update.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date('2026-03-31T10:00:00.000Z'),
      assignedStaffs: [],
    });

    const result = await service.cancelBooking('booking-1');

    expect(databaseServiceMock.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: expect.any(Date),
      },
    });
    expect(result.id).toBe('booking-1');
  });

  it('rejects cancellation for completed bookings', async () => {
    databaseServiceMock.booking.findFirst.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.COMPLETED,
      assignedStaffs: [],
    });

    await expect(service.cancelBooking('booking-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
