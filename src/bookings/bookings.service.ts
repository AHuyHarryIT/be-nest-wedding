import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  Prisma,
  BookingStatus,
  Booking,
  Order,
  Payment,
} from 'generated/prisma';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { DatabaseService } from '../database/database.service';
import { CreateBookingDto, QueryBookingDto, UpdateBookingDto } from './dto';
import { CreateCustomerBookingDto } from './dto';

export interface BookingWithOrderSummary extends Booking {
  orders?: Array<Order & { payments: Payment[] }>;
  order?: Order & {
    payments: Payment[];
    summary: {
      totalPrice: number;
      totalPaid: number;
      balanceRemaining: number;
      isPaid: boolean;
      isPartiallyPaid: boolean;
    };
  };
  customer?: any;
  packages?: any;
  services?: any;
  albums?: any;
}

@Injectable()
export class BookingsService {
  private readonly staffRoleNames = new Set([
    'super-admin',
    'admin',
    'manager',
    'staff',
  ]);

  constructor(private readonly databaseService: DatabaseService) {}

  private async resolveCreateCustomerId(
    createBookingDto: CreateBookingDto,
    actorUserId: string,
  ): Promise<string> {
    const isStaff = await this.isStaffUser(actorUserId);

    if (isStaff) {
      if (!createBookingDto.customerId) {
        throw new BadRequestException('Customer ID is required');
      }

      return createBookingDto.customerId;
    }

    if (
      createBookingDto.customerId &&
      createBookingDto.customerId !== actorUserId
    ) {
      throw new ForbiddenException('You can only create bookings for yourself');
    }

    return actorUserId;
  }

  private async isStaffUser(userId: string): Promise<boolean> {
    const userRoles = await this.databaseService.staffRole.findMany({
      where: {
        staffId: userId,
      },
      include: {
        role: true,
      },
    });

    return userRoles.some((userRole) =>
      this.staffRoleNames.has(userRole.role.name),
    );
  }

  private async assertBookingAccess(
    booking: { customerId: string },
    userId: string,
  ): Promise<void> {
    if (booking.customerId === userId) {
      return;
    }

    const isStaff = await this.isStaffUser(userId);
    if (isStaff) {
      return;
    }

    throw new ForbiddenException('You cannot access this booking');
  }

  private async findBookingById(id: string): Promise<BookingWithOrderSummary> {
    const booking = await this.databaseService.booking.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        packages: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
              },
            },
          },
        },
        services: {
          include: {
            service: true,
          },
        },
        albums: true,
        orders: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    const response: BookingWithOrderSummary = { ...booking };
    if (booking.orders && booking.orders.length > 0) {
      const order = booking.orders[0];
      const totalPaid = order.payments
        .filter((p: Payment) => p.status === 'SUCCESSFUL')
        .reduce((sum: number, p: Payment) => sum + p.amount, 0);

      const balanceRemaining = order.totalPrice - totalPaid;

      response.order = {
        ...order,
        summary: {
          totalPrice: order.totalPrice,
          totalPaid,
          balanceRemaining,
          isPaid: balanceRemaining === 0,
          isPartiallyPaid: totalPaid > 0 && balanceRemaining > 0,
        },
      };
    }

    return response;
  }

  async create(createBookingDto: CreateBookingDto, actorUserId: string) {
    const customerId = await this.resolveCreateCustomerId(
      createBookingDto,
      actorUserId,
    );

    // Validate customer exists
    const customer = await this.databaseService.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Determine which packages/services to use
    const packageIds = createBookingDto.packageIds || [];
    const serviceIds = createBookingDto.serviceIds || [];

    // At least one package or service is required
    if (packageIds.length === 0 && serviceIds.length === 0) {
      throw new BadRequestException(
        'At least one package or service must be selected',
      );
    }

    let computedTotalPrice = 0;

    // Validate packages exist
    if (packageIds.length > 0) {
      const packages = await this.databaseService.package.findMany({
        where: {
          id: { in: packageIds },
          deletedAt: null,
          isActive: true,
        },
      });

      if (packages.length !== packageIds.length) {
        throw new NotFoundException('One or more packages not found');
      }

      computedTotalPrice += packages.reduce((sum, item) => sum + item.price, 0);
    }

    // Validate services exist
    if (serviceIds.length > 0) {
      const services = await this.databaseService.service.findMany({
        where: {
          id: { in: serviceIds },
          deletedAt: null,
          isActive: true,
        },
      });

      if (services.length !== serviceIds.length) {
        throw new NotFoundException('One or more services not found');
      }

      computedTotalPrice += services.reduce((sum, item) => sum + item.price, 0);
    }

    const isStaff = await this.isStaffUser(actorUserId);
    const totalPrice =
      isStaff && createBookingDto.totalPrice !== undefined
        ? createBookingDto.totalPrice
        : computedTotalPrice;

    const data: Prisma.BookingCreateInput = {
      customer: { connect: { id: customerId } },
      notes: createBookingDto.notes,
      eventDate: new Date(createBookingDto.eventDate),
      totalPrice,
      status: BookingStatus.PENDING,
    };

    // Add packages through junction table with their current prices
    if (packageIds.length > 0) {
      const packages = await this.databaseService.package.findMany({
        where: { id: { in: packageIds } },
        select: { id: true, price: true },
      });
      data.packages = {
        create: packageIds.map((pkgId) => {
          const pkg = packages.find((p) => p.id === pkgId);
          return {
            packageId: pkgId,
            price: pkg?.price || 0,
          };
        }),
      };
    }

    // Add services through junction table with their current prices
    if (serviceIds.length > 0) {
      const services = await this.databaseService.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, price: true },
      });
      data.services = {
        create: serviceIds.map((svcId) => {
          const svc = services.find((s) => s.id === svcId);
          return {
            serviceId: svcId,
            price: svc?.price || 0,
          };
        }),
      };
    }

    return this.databaseService.booking.create({
      data,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        packages: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
              },
            },
          },
        },
        services: {
          include: {
            service: true,
          },
        },
      },
    });
  }

  async createForCustomer(
    customerId: string,
    createBookingDto: CreateCustomerBookingDto,
  ) {
    return this.create(
      {
        ...createBookingDto,
        customerId,
      },
      customerId,
    );
  }

  async findAll(params: QueryBookingDto | undefined, userId: string) {
    const paginationParams = PaginationHelper.mergeWithDefaults(params || {});
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder,
    } = paginationParams;

    const {
      customerId,
      status,
      includeCustomer,
      includePackages,
      includeServices,
    } = params || {};

    const where: Prisma.BookingWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [{ notes: { contains: search, mode: 'insensitive' } }];
    }

    const isStaff = await this.isStaffUser(userId);
    if (isStaff) {
      if (customerId) where.customerId = customerId;
    } else {
      where.customerId = userId;
    }
    if (status) where.status = status;

    const include: Prisma.BookingInclude = {};
    if (includeCustomer)
      include.customer = {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
        },
      };
    if (includePackages)
      include.packages = {
        include: {
          package: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
            },
          },
        },
      };
    if (includeServices)
      include.services = {
        include: {
          service: true,
        },
      };

    const orderBy: Prisma.BookingOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const total = await this.databaseService.booking.count({ where });
    const bookings = await this.databaseService.booking.findMany({
      where,
      include,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(
      bookings,
      page,
      limit,
      total,
    );
  }

  async findOne(id: string, userId: string): Promise<BookingWithOrderSummary> {
    const booking = await this.findBookingById(id);
    await this.assertBookingAccess(booking, userId);
    return booking;
  }

  async update(id: string, updateBookingDto: UpdateBookingDto) {
    const booking = await this.findBookingById(id);

    if (updateBookingDto.status === BookingStatus.CANCELLED) {
      throw new BadRequestException(
        'Use the dedicated cancel action to cancel a booking',
      );
    }

    // Hide edit and delete when status is 'COMPLETED'
    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot edit completed bookings. Current status: ${booking.status}`,
      );
    }

    // Only allow status updates or other edits if booking is PENDING
    // (unless only status is being updated)
    const isOnlyStatusUpdate =
      Object.keys(updateBookingDto).length === 1 && updateBookingDto.status;
    if (!isOnlyStatusUpdate && booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Only bookings with PENDING status can be edited. Current status: ${booking.status}`,
      );
    }

    // Validate customer exists if being updated
    if (updateBookingDto.customerId) {
      const customer = await this.databaseService.customer.findUnique({
        where: { id: updateBookingDto.customerId },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${updateBookingDto.customerId} not found`,
        );
      }
    }

    // Validate packages if being updated
    if (updateBookingDto.packageIds && updateBookingDto.packageIds.length > 0) {
      const packages = await this.databaseService.package.findMany({
        where: {
          id: { in: updateBookingDto.packageIds },
          deletedAt: null,
        },
      });
      if (packages.length !== updateBookingDto.packageIds.length) {
        throw new NotFoundException('One or more packages not found');
      }
    }

    // Validate services if being updated
    if (updateBookingDto.serviceIds && updateBookingDto.serviceIds.length > 0) {
      const services = await this.databaseService.service.findMany({
        where: {
          id: { in: updateBookingDto.serviceIds },
          deletedAt: null,
        },
      });
      if (services.length !== updateBookingDto.serviceIds.length) {
        throw new NotFoundException('One or more services not found');
      }
    }

    const data: Prisma.BookingUpdateInput = {};
    if (updateBookingDto.status !== undefined)
      data.status = updateBookingDto.status;
    if (updateBookingDto.customerId)
      data.customer = { connect: { id: updateBookingDto.customerId } };
    if (updateBookingDto.notes !== undefined)
      data.notes = updateBookingDto.notes;
    if (updateBookingDto.eventDate)
      data.eventDate = new Date(updateBookingDto.eventDate);
    if (updateBookingDto.totalPrice !== undefined)
      data.totalPrice = updateBookingDto.totalPrice;

    // Handle packageIds update
    if (updateBookingDto.packageIds) {
      // Delete existing packages
      await this.databaseService.bookingPackage.deleteMany({
        where: { bookingId: id },
      });

      // Create new packages if provided with their current prices
      if (updateBookingDto.packageIds.length > 0) {
        const packages = await this.databaseService.package.findMany({
          where: { id: { in: updateBookingDto.packageIds } },
          select: { id: true, price: true },
        });
        data.packages = {
          create: updateBookingDto.packageIds.map((pkgId) => {
            const pkg = packages.find((p) => p.id === pkgId);
            return {
              packageId: pkgId,
              price: pkg?.price || 0,
            };
          }),
        };
      }
    }

    // Handle serviceIds update
    if (updateBookingDto.serviceIds) {
      // Delete existing services
      await this.databaseService.bookingService.deleteMany({
        where: { bookingId: id },
      });

      // Create new services if provided with their current prices
      if (updateBookingDto.serviceIds.length > 0) {
        const services = await this.databaseService.service.findMany({
          where: { id: { in: updateBookingDto.serviceIds } },
          select: { id: true, price: true },
        });
        data.services = {
          create: updateBookingDto.serviceIds.map((svcId) => {
            const svc = services.find((s) => s.id === svcId);
            return {
              serviceId: svcId,
              price: svc?.price || 0,
            };
          }),
        };
      }
    }

    return this.databaseService.booking.update({
      where: { id },
      data,
      include: {
        customer: true,
        packages: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
              },
            },
          },
        },
        services: {
          include: {
            service: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const booking = await this.findBookingById(id);

    // Hide edit and delete when status is 'COMPLETED'
    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot delete completed bookings. Current status: ${booking.status}`,
      );
    }

    // Check if booking status is PENDING - only PENDING bookings can be deleted
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Only bookings with PENDING status can be deleted. Current status: ${booking.status}`,
      );
    }

    return this.databaseService.booking.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    const booking = await this.databaseService.booking.findUnique({
      where: { id },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return this.databaseService.booking.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async hardDelete(id: string) {
    const booking = await this.databaseService.booking.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return this.databaseService.booking.delete({ where: { id } });
  }

  async cancelBooking(id: string) {
    const booking = await this.findBookingById(id);

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Completed bookings cannot be cancelled');
    }

    await this.databaseService.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    return this.findBookingById(id);
  }

  async confirmBooking(id: string) {
    await this.findBookingById(id);
    await this.databaseService.booking.update({
      where: { id },
      data: { status: BookingStatus.CONFIRMED },
    });

    return this.findBookingById(id);
  }
}
