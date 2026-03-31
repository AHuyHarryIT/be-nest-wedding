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
  assignedStaffs?: any[];
}

type BookingStaffAssignmentInput =
  | string
  | {
      staffId: string;
      job?: string | null;
    };

@Injectable()
export class BookingsService {
  private readonly staffRoleNames = new Set([
    'super-admin',
    'admin',
    'manager',
    'staff',
  ]);

  constructor(private readonly databaseService: DatabaseService) {}

  private readonly assignedStaffInclude: any = {
    include: {
      staff: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          isActive: true,
        },
      },
    },
  };

  private normalizeStaffAssignments(
    staffAssignments: BookingStaffAssignmentInput[],
  ): Array<{ staffId: string; job: string | null }> {
    const normalizedAssignments: Array<{
      staffId: string;
      job: string | null;
    }> = staffAssignments
      .map((assignment) => {
        if (typeof assignment === 'string') {
          return { staffId: assignment.trim(), job: null };
        }

        return {
          staffId: assignment.staffId.trim(),
          job:
            typeof assignment.job === 'string' && assignment.job.trim()
              ? assignment.job.trim()
              : null,
        };
      })
      .filter((assignment) => Boolean(assignment.staffId));

    const uniqueAssignments: Array<{ staffId: string; job: string | null }> =
      [];
    const seenIds = new Set<string>();

    for (const assignment of normalizedAssignments) {
      if (seenIds.has(assignment.staffId)) {
        continue;
      }

      seenIds.add(assignment.staffId);
      uniqueAssignments.push(assignment);
    }

    return uniqueAssignments;
  }

  private normalizeStaffIds(staffIds: string[]): string[] {
    return [
      ...new Set(staffIds.map((staffId) => staffId.trim()).filter(Boolean)),
    ];
  }

  private async validateStaffAssignments(staffIds: string[]): Promise<void> {
    if (!staffIds.length) {
      return;
    }

    const uniqueStaffIds = this.normalizeStaffIds(staffIds);
    const staffs = await this.databaseService.staff.findMany({
      where: {
        id: { in: uniqueStaffIds },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (staffs.length !== uniqueStaffIds.length) {
      throw new NotFoundException('One or more staff members not found');
    }
  }

  private mapAssignedStaffs(
    booking: BookingWithOrderSummary & {
      assignedStaffs?: Array<{
        staffId: string;
        job?: string | null;
        staff: {
          id: string;
          firstName: string | null;
          lastName: string | null;
          email: string | null;
          phoneNumber: string;
          isActive: boolean;
        };
      }>;
    },
  ): BookingWithOrderSummary {
    return {
      ...booking,
      assignedStaffs:
        booking.assignedStaffs?.map((assignment) => ({
          ...assignment.staff,
          staffId: assignment.staffId,
          job: assignment.job ?? null,
        })) ?? [],
    };
  }

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
        assignedStaffs: this.assignedStaffInclude,
        albums: true,
        orders: {
          include: {
            payments: true,
          },
        },
      } as any,
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    const response: BookingWithOrderSummary = this.mapAssignedStaffs(
      booking as any,
    );
    if (booking.orders && booking.orders.length > 0) {
      const order = booking.orders[0] as any;
      const payments = (order.payments ?? []) as Payment[];
      const totalPaid = payments
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

  private async buildAssignedStaffData(
    staffAssignments: BookingStaffAssignmentInput[],
  ): Promise<Array<{ staffId: string; job: string | null }>> {
    const normalizedAssignments =
      this.normalizeStaffAssignments(staffAssignments);
    const staffIds = normalizedAssignments.map(({ staffId }) => staffId);

    await this.validateStaffAssignments(staffIds);

    return normalizedAssignments;
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
    const staffAssignments = createBookingDto.staffAssignments
      ? await this.buildAssignedStaffData(createBookingDto.staffAssignments)
      : this.normalizeStaffIds(createBookingDto.staffIds || []).map(
          (staffId) => ({ staffId, job: null }),
        );

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

    if (!createBookingDto.staffAssignments) {
      await this.validateStaffAssignments(
        staffAssignments.map(({ staffId }) => staffId),
      );
    }

    const isStaff = await this.isStaffUser(actorUserId);
    const totalPrice =
      isStaff && createBookingDto.totalPrice !== undefined
        ? createBookingDto.totalPrice
        : computedTotalPrice;

    const data: any = {
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

    if (staffAssignments.length > 0) {
      data.assignedStaffs = {
        create: staffAssignments.map(({ staffId, job }) => ({
          staffId,
          job,
        })),
      };
    }

    const booking = await this.databaseService.booking.create({
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
        assignedStaffs: this.assignedStaffInclude,
      } as any,
    });

    return this.mapAssignedStaffs(
      booking as unknown as BookingWithOrderSummary & { assignedStaffs: any[] },
    );
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
      includeStaffs,
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

    const include: any = {};
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
    if (includeStaffs) {
      include.assignedStaffs = this.assignedStaffInclude;
    }

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

    const bookingRows = includeStaffs
      ? (bookings as any[]).map((booking) => this.mapAssignedStaffs(booking))
      : bookings;

    return PaginationHelper.createPaginatedResponse(
      bookingRows as any[],
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

    // Hide edit and delete when status is 'COMPLETED' or 'CANCELLED'
    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot edit bookings with status ${booking.status}`,
      );
    }

    // Only allow status updates or other edits if booking is PENDING
    // (unless only status is being updated)
    const hasBookingFieldUpdates =
      updateBookingDto.customerId !== undefined ||
      updateBookingDto.notes !== undefined ||
      updateBookingDto.eventDate !== undefined ||
      updateBookingDto.totalPrice !== undefined ||
      updateBookingDto.packageIds !== undefined ||
      updateBookingDto.serviceIds !== undefined;
    const hasStatusUpdate = updateBookingDto.status !== undefined;
    const isOnlyStatusUpdate =
      Object.keys(updateBookingDto).length === 1 && hasStatusUpdate;
    const requiresPendingStatus =
      hasBookingFieldUpdates || (hasStatusUpdate && !isOnlyStatusUpdate);
    if (requiresPendingStatus && booking.status !== BookingStatus.PENDING) {
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

    const normalizedStaffAssignments =
      updateBookingDto.staffAssignments !== undefined
        ? await this.buildAssignedStaffData(updateBookingDto.staffAssignments)
        : updateBookingDto.staffIds !== undefined
          ? this.normalizeStaffIds(updateBookingDto.staffIds).map(
              (staffId) => ({ staffId, job: null }),
            )
          : undefined;

    if (normalizedStaffAssignments) {
      await this.validateStaffAssignments(
        normalizedStaffAssignments.map(({ staffId }) => staffId),
      );
    }

    const data: any = {};
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

    if (normalizedStaffAssignments !== undefined) {
      data.assignedStaffs = {
        deleteMany: {},
        ...(normalizedStaffAssignments.length > 0
          ? {
              create: normalizedStaffAssignments.map(({ staffId, job }) => ({
                staffId,
                job,
              })),
            }
          : {}),
      };
    }

    const updatedBooking = await this.databaseService.booking.update({
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
        assignedStaffs: this.assignedStaffInclude,
      } as any,
    });

    return this.mapAssignedStaffs(
      updatedBooking as unknown as BookingWithOrderSummary & {
        assignedStaffs?: any[];
      },
    );
  }

  async assignStaff(
    id: string,
    staffAssignments: BookingStaffAssignmentInput[],
  ) {
    const booking = await this.findBookingById(id);

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Cannot assign staff when booking status is ${booking.status}`,
      );
    }

    const normalizedStaffAssignments =
      this.normalizeStaffAssignments(staffAssignments);
    await this.validateStaffAssignments(
      normalizedStaffAssignments.map(({ staffId }) => staffId),
    );

    const updatedBooking = await this.databaseService.booking.update({
      where: { id },
      data: {
        assignedStaffs: {
          deleteMany: {},
          ...(normalizedStaffAssignments.length > 0
            ? {
                create: normalizedStaffAssignments.map(({ staffId, job }) => ({
                  staffId,
                  job,
                })),
              }
            : {}),
        },
      } as any,
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
        assignedStaffs: this.assignedStaffInclude,
        albums: true,
        orders: {
          include: {
            payments: true,
          },
        },
      } as any,
    });

    return this.mapAssignedStaffs(
      updatedBooking as unknown as BookingWithOrderSummary & {
        assignedStaffs?: any[];
      },
    );
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
