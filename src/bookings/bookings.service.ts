import {
  Injectable,
  Logger,
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
      sourceKey?: string | null;
      staffId: string;
      serviceLabel?: string | null;
      job?: string | null;
      locationName?: string | null;
      startTime?: string | null;
      endTime?: string | null;
    };

type AssignStaffConflictOptions = {
  allowConflictOverride?: boolean;
  overrideReason?: string;
};

type StaffConflictDetail = {
  staffId: string;
  source: 'booking' | 'session';
  sourceId: string;
  sourceTitle: string | null;
  overlapStart: string;
  overlapEnd: string;
  assignmentStart: string;
  assignmentEnd: string;
};

type StaffAssignmentConflict = {
  staffId: string;
  sourceKey: string;
  requestedStartTime: string;
  requestedEndTime: string;
  conflicts: StaffConflictDetail[];
};

const OVERLAP_REASON_MAX_LENGTH = 500;

@Injectable()
export class BookingsService {
  private readonly staffRoleNames = new Set([
    'super-admin',
    'admin',
    'manager',
    'staff',
  ]);

  private readonly logger = new Logger(BookingsService.name);

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
  ): Array<{
    sourceKey: string;
    staffId: string;
    serviceLabel: string | null;
    job: string | null;
    locationName: string | null;
    startTime: string | null;
    endTime: string | null;
  }> {
    const normalizedAssignments = staffAssignments
      .map((assignment) => {
        if (typeof assignment === 'string') {
          const staffId = assignment.trim();
          return staffId
            ? {
                sourceKey: `staff:${staffId}`,
                staffId,
                serviceLabel: null,
                job: null,
                locationName: null,
                startTime: null,
                endTime: null,
              }
            : null;
        }

        const staffId = assignment.staffId.trim();
        if (!staffId) {
          return null;
        }

        return {
          sourceKey:
            typeof assignment.sourceKey === 'string' &&
            assignment.sourceKey.trim()
              ? assignment.sourceKey.trim()
              : `staff:${staffId}`,
          staffId,
          serviceLabel:
            typeof assignment.serviceLabel === 'string' &&
            assignment.serviceLabel.trim()
              ? assignment.serviceLabel.trim()
              : null,
          job:
            typeof assignment.job === 'string' && assignment.job.trim()
              ? assignment.job.trim()
              : null,
          locationName:
            typeof assignment.locationName === 'string' &&
            assignment.locationName.trim()
              ? assignment.locationName.trim()
              : null,
          startTime:
            typeof assignment.startTime === 'string' &&
            assignment.startTime.trim()
              ? assignment.startTime.trim()
              : null,
          endTime:
            typeof assignment.endTime === 'string' && assignment.endTime.trim()
              ? assignment.endTime.trim()
              : null,
        };
      })
      .filter(
        (
          assignment,
        ): assignment is {
          sourceKey: string;
          staffId: string;
          serviceLabel: string | null;
          job: string | null;
          locationName: string | null;
          startTime: string | null;
          endTime: string | null;
        } => Boolean(assignment),
      );

    const uniqueAssignments: Array<{
      sourceKey: string;
      staffId: string;
      serviceLabel: string | null;
      job: string | null;
      locationName: string | null;
      startTime: string | null;
      endTime: string | null;
    }> = [];
    const seenKeys = new Set<string>();

    for (const assignment of normalizedAssignments) {
      if (seenKeys.has(assignment.sourceKey)) {
        continue;
      }

      seenKeys.add(assignment.sourceKey);
      uniqueAssignments.push(assignment);
    }

    return uniqueAssignments;
  }

  private normalizeStaffIds(staffIds: string[]): string[] {
    return [
      ...new Set(staffIds.map((staffId) => staffId.trim()).filter(Boolean)),
    ];
  }

  private extractRequiredServiceAssignments(
    source:
      | {
          services?: Array<{
            serviceId?: string;
            service?: { id?: string; jobId?: string | null } | null;
          }>;
          packages?: Array<{
            packageId?: string;
            package?: {
              id?: string;
              services?: Array<{
                serviceId: string;
                service?: { id?: string; jobId?: string | null } | null;
              }>;
            } | null;
          }>;
        }
      | null
      | undefined,
  ): Array<{ sourceKey: string; jobId: string }> {
    if (!source) {
      return [];
    }

    const assignments: Array<{ sourceKey: string; jobId: string }> = [];

    for (const item of source.services ?? []) {
      const serviceId = item.service?.id || item.serviceId;
      const jobId = item.service?.jobId;
      if (!serviceId || !jobId) {
        continue;
      }

      assignments.push({
        sourceKey: `service:${serviceId}`,
        jobId,
      });
    }

    for (const item of source.packages ?? []) {
      const packageId = item.package?.id || item.packageId;
      if (!packageId) {
        continue;
      }

      for (const pkgService of item.package?.services ?? []) {
        const serviceId = pkgService.service?.id || pkgService.serviceId;
        const jobId = pkgService.service?.jobId;
        if (!serviceId || !jobId) {
          continue;
        }

        assignments.push({
          sourceKey: `package:${packageId}:service:${serviceId}`,
          jobId,
        });
      }
    }

    return assignments;
  }

  private async resolveRequiredServiceAssignments(params: {
    packageIds?: string[];
    serviceIds?: string[];
  }): Promise<Array<{ sourceKey: string; jobId: string }>> {
    const directServiceIds = this.normalizeStaffIds(params.serviceIds ?? []);
    const packageIds = this.normalizeStaffIds(params.packageIds ?? []);
    const assignments: Array<{ sourceKey: string; jobId: string }> = [];

    if (directServiceIds.length > 0) {
      const services = await this.databaseService.service.findMany({
        where: {
          id: { in: directServiceIds },
          deletedAt: null,
        },
        select: {
          id: true,
          jobId: true,
        },
      });

      services.forEach((service) => {
        if (service.jobId) {
          assignments.push({
            sourceKey: `service:${service.id}`,
            jobId: service.jobId,
          });
        }
      });
    }

    if (packageIds.length > 0) {
      const packages = await this.databaseService.package.findMany({
        where: {
          id: { in: packageIds },
          deletedAt: null,
        },
        select: {
          id: true,
          services: {
            select: {
              serviceId: true,
              service: {
                select: {
                  id: true,
                  jobId: true,
                },
              },
            },
          },
        },
      });

      packages.forEach((pkg) => {
        (pkg.services ?? []).forEach((pkgService) => {
          const serviceId = pkgService.service?.id || pkgService.serviceId;
          const jobId = pkgService.service?.jobId;
          if (!serviceId || !jobId) {
            return;
          }

          assignments.push({
            sourceKey: `package:${pkg.id}:service:${serviceId}`,
            jobId,
          });
        });
      });
    }

    return assignments;
  }

  private async validateStaffAssignments(
    staffAssignments: Array<{
      sourceKey: string;
      staffId: string;
      serviceLabel: string | null;
      job: string | null;
      locationName: string | null;
      startTime: string | null;
      endTime: string | null;
    }>,
    requiredServiceAssignments: Array<{
      sourceKey: string;
      jobId: string;
    }> = [],
  ): Promise<void> {
    if (!staffAssignments.length) {
      return;
    }

    const uniqueStaffIds = this.normalizeStaffIds(
      staffAssignments.map(({ staffId }) => staffId),
    );
    const staffs = await this.databaseService.staff.findMany({
      where: {
        id: { in: uniqueStaffIds },
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
        roles: {
          select: { roleId: true },
          take: 1,
        },
        staffJobs: {
          select: { jobId: true },
        },
      },
    });

    if (staffs.length !== uniqueStaffIds.length) {
      throw new NotFoundException('One or more staff members not found');
    }

    const invalidStaffIds = staffs
      .filter((staff) => {
        if (
          !staff.isActive ||
          staff.roles.length === 0 ||
          staff.staffJobs.length === 0
        ) {
          return true;
        }
        return false;
      })
      .map((staff) => staff.id);

    if (invalidStaffIds.length > 0) {
      throw new BadRequestException(
        `Assigned staff must be active and have at least one role and one managed job: ${invalidStaffIds.join(', ')}`,
      );
    }

    if (requiredServiceAssignments.length === 0) {
      return;
    }

    const requiredJobBySourceKey = new Map(
      requiredServiceAssignments.map((assignment) => [
        assignment.sourceKey,
        assignment.jobId,
      ]),
    );
    const staffById = new Map(
      staffs.map((staff) => [
        staff.id,
        new Set(staff.staffJobs.map((staffJob) => staffJob.jobId)),
      ]),
    );

    const mismatchedAssignments = staffAssignments
      .filter((assignment) => {
        const requiredJobId = requiredJobBySourceKey.get(assignment.sourceKey);
        if (!requiredJobId) {
          return false;
        }

        const staffJobIds = staffById.get(assignment.staffId);
        return !staffJobIds?.has(requiredJobId);
      })
      .map(
        (assignment) =>
          `${assignment.serviceLabel || assignment.sourceKey}: ${assignment.staffId}`,
      );

    if (mismatchedAssignments.length > 0) {
      throw new BadRequestException(
        `Assigned staff must have the matching managed job for each service row: ${mismatchedAssignments.join(', ')}`,
      );
    }
  }

  private parseAssignmentDate(value: string | null | undefined): Date | null {
    if (!value || typeof value !== 'string') {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  private hasTimeOverlap(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date,
  ): boolean {
    return startA < endB && startB < endA;
  }

  private buildOverlapWindow(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date,
  ): { overlapStart: string; overlapEnd: string } {
    const overlapStart = new Date(
      Math.max(startA.getTime(), startB.getTime()),
    ).toISOString();
    const overlapEnd = new Date(Math.min(endA.getTime(), endB.getTime())).toISOString();

    return {
      overlapStart,
      overlapEnd,
    };
  }

  private async detectAssignmentConflicts(
    bookingId: string,
    staffAssignments: Array<{
      sourceKey: string;
      staffId: string;
      serviceLabel: string | null;
      job: string | null;
      locationName: string | null;
      startTime: string | null;
      endTime: string | null;
    }>,
  ): Promise<StaffAssignmentConflict[]> {
    const assignmentsWithWindow = staffAssignments
      .map((assignment) => {
        const startAt = this.parseAssignmentDate(assignment.startTime);
        const endAt = this.parseAssignmentDate(assignment.endTime);
        if (!startAt || !endAt || startAt >= endAt) {
          return null;
        }

        return {
          ...assignment,
          startAt,
          endAt,
        };
      })
      .filter(
        (
          assignment,
        ): assignment is {
          sourceKey: string;
          staffId: string;
          serviceLabel: string | null;
          job: string | null;
          locationName: string | null;
          startTime: string | null;
          endTime: string | null;
          startAt: Date;
          endAt: Date;
        } => Boolean(assignment),
      );

    if (assignmentsWithWindow.length === 0) {
      return [];
    }

    const staffIds = this.normalizeStaffIds(
      assignmentsWithWindow.map((assignment) => assignment.staffId),
    );

    const [bookingConflicts, sessionConflicts] = await Promise.all([
      this.databaseService.booking.findMany({
        where: {
          id: { not: bookingId },
          deletedAt: null,
          assignedStaffs: {
            some: {
              staffId: { in: staffIds },
            },
          },
        },
        select: {
          id: true,
          eventDate: true,
          assignedStaffs: {
            where: {
              staffId: { in: staffIds },
            },
            select: {
              sourceKey: true,
              staffId: true,
              serviceLabel: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      }),
      this.databaseService.bookingSession.findMany({
        where: {
          bookingId: { not: bookingId },
          staffs: {
            some: {
              staffId: { in: staffIds },
            },
          },
        },
        select: {
          id: true,
          bookingId: true,
          title: true,
          startsAt: true,
          endsAt: true,
          staffs: {
            where: {
              staffId: { in: staffIds },
            },
            select: {
              staffId: true,
            },
          },
        },
      }),
    ]);

    const conflicts: StaffAssignmentConflict[] = [];

    assignmentsWithWindow.forEach((assignment) => {
      const details: StaffConflictDetail[] = [];

      bookingConflicts.forEach((existingBooking) => {
        existingBooking.assignedStaffs.forEach((existingAssignment) => {
          if (existingAssignment.staffId !== assignment.staffId) {
            return;
          }

          const existingStart = this.parseAssignmentDate(existingAssignment.startTime);
          const existingEnd = this.parseAssignmentDate(existingAssignment.endTime);
          if (!existingStart || !existingEnd || existingStart >= existingEnd) {
            return;
          }

          if (
            !this.hasTimeOverlap(
              assignment.startAt,
              assignment.endAt,
              existingStart,
              existingEnd,
            )
          ) {
            return;
          }

          const overlapWindow = this.buildOverlapWindow(
            assignment.startAt,
            assignment.endAt,
            existingStart,
            existingEnd,
          );

          details.push({
            staffId: assignment.staffId,
            source: 'booking',
            sourceId: existingBooking.id,
            sourceTitle: existingAssignment.serviceLabel || existingAssignment.sourceKey,
            overlapStart: overlapWindow.overlapStart,
            overlapEnd: overlapWindow.overlapEnd,
            assignmentStart: assignment.startAt.toISOString(),
            assignmentEnd: assignment.endAt.toISOString(),
          });
        });
      });

      sessionConflicts.forEach((session) => {
        const hasStaff = session.staffs.some(
          (sessionStaff) => sessionStaff.staffId === assignment.staffId,
        );
        if (!hasStaff || !session.startsAt || !session.endsAt) {
          return;
        }

        const sessionStart = new Date(session.startsAt);
        const sessionEnd = new Date(session.endsAt);
        if (sessionStart >= sessionEnd) {
          return;
        }

        if (
          !this.hasTimeOverlap(
            assignment.startAt,
            assignment.endAt,
            sessionStart,
            sessionEnd,
          )
        ) {
          return;
        }

        const overlapWindow = this.buildOverlapWindow(
          assignment.startAt,
          assignment.endAt,
          sessionStart,
          sessionEnd,
        );

        details.push({
          staffId: assignment.staffId,
          source: 'session',
          sourceId: session.id,
          sourceTitle: session.title,
          overlapStart: overlapWindow.overlapStart,
          overlapEnd: overlapWindow.overlapEnd,
          assignmentStart: assignment.startAt.toISOString(),
          assignmentEnd: assignment.endAt.toISOString(),
        });
      });

      if (details.length > 0) {
        conflicts.push({
          staffId: assignment.staffId,
          sourceKey: assignment.sourceKey,
          requestedStartTime: assignment.startAt.toISOString(),
          requestedEndTime: assignment.endAt.toISOString(),
          conflicts: details,
        });
      }
    });

    return conflicts;
  }

  private mapAssignedStaffs(
    booking: BookingWithOrderSummary & {
      assignedStaffs?: Array<{
        sourceKey: string;
        staffId: string;
        serviceLabel?: string | null;
        job?: string | null;
        locationName?: string | null;
        startTime?: string | null;
        endTime?: string | null;
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
          sourceKey: assignment.sourceKey,
          ...assignment.staff,
          staffId: assignment.staffId,
          serviceLabel: assignment.serviceLabel ?? null,
          job: assignment.job ?? null,
          locationName: assignment.locationName ?? null,
          startTime: assignment.startTime ?? null,
          endTime: assignment.endTime ?? null,
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
              include: {
                services: {
                  include: {
                    service: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        price: true,
                        isLocation: true,
                        isTime: true,
                        jobId: true,
                        job: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        services: {
          include: {
            service: {
              include: {
                job: true,
              },
            },
          },
        },
        sessions: {
          include: {
            staffs: {
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
            },
            services: {
              include: {
                service: true,
              },
            },
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
    requiredServiceAssignments: Array<{
      sourceKey: string;
      jobId: string;
    }> = [],
  ): Promise<
    Array<{
      sourceKey: string;
      staffId: string;
      serviceLabel: string | null;
      job: string | null;
      locationName: string | null;
      startTime: string | null;
      endTime: string | null;
    }>
  > {
    const normalizedAssignments =
      this.normalizeStaffAssignments(staffAssignments);
    await this.validateStaffAssignments(
      normalizedAssignments,
      requiredServiceAssignments,
    );

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
    const requiredServiceAssignments =
      await this.resolveRequiredServiceAssignments({
        packageIds,
        serviceIds,
      });
    const staffAssignments = createBookingDto.staffAssignments
      ? await this.buildAssignedStaffData(
          createBookingDto.staffAssignments,
          requiredServiceAssignments,
        )
      : this.normalizeStaffIds(createBookingDto.staffIds || []).map(
          (staffId) => ({
            sourceKey: `staff:${staffId}`,
            staffId,
            serviceLabel: null,
            job: null,
            locationName: null,
            startTime: null,
            endTime: null,
          }),
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
      await this.validateStaffAssignments(staffAssignments, []);
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
        create: staffAssignments.map(
          ({
            sourceKey,
            staffId,
            serviceLabel,
            job,
            locationName,
            startTime,
            endTime,
          }) => ({
            sourceKey,
            staffId,
            serviceLabel,
            job,
            ...(locationName ? { locationName } : {}),
            ...(startTime ? { startTime } : {}),
            ...(endTime ? { endTime } : {}),
          }),
        ),
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

    if (hasStatusUpdate && !hasBookingFieldUpdates) {
      const nextStatus = updateBookingDto.status as BookingStatus;

      if (nextStatus === BookingStatus.COMPLETED) {
        if (booking.status !== BookingStatus.CONFIRMED) {
          throw new BadRequestException(
            `Only bookings with CONFIRMED status can be completed. Current status: ${booking.status}`,
          );
        }
      }

      if (nextStatus === BookingStatus.CONFIRMED) {
        const confirmableStatuses = new Set<BookingStatus>([
          BookingStatus.PENDING,
          BookingStatus.DEPOSIT_PAID,
          BookingStatus.RESCHEDULED,
        ]);

        if (!confirmableStatuses.has(booking.status as BookingStatus)) {
          throw new BadRequestException(
            `Only PENDING, DEPOSIT_PAID, or RESCHEDULED bookings can be confirmed. Current status: ${booking.status}`,
          );
        }
      }
    }

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
        ? await this.buildAssignedStaffData(
            updateBookingDto.staffAssignments,
            await this.resolveRequiredServiceAssignments({
              packageIds:
                updateBookingDto.packageIds ??
                booking.packages?.map((item) => item.packageId),
              serviceIds:
                updateBookingDto.serviceIds ??
                booking.services?.map((item) => item.serviceId),
            }),
          )
        : updateBookingDto.staffIds !== undefined
          ? this.normalizeStaffIds(updateBookingDto.staffIds).map(
              (staffId) => ({
                sourceKey: `staff:${staffId}`,
                staffId,
                serviceLabel: null,
                job: null,
                locationName: null,
                startTime: null,
                endTime: null,
              }),
            )
          : undefined;

    if (normalizedStaffAssignments) {
      const requiredServiceAssignments =
        await this.resolveRequiredServiceAssignments({
          packageIds:
            updateBookingDto.packageIds ??
            booking.packages?.map((item) => item.packageId),
          serviceIds:
            updateBookingDto.serviceIds ??
            booking.services?.map((item) => item.serviceId),
        });
      await this.validateStaffAssignments(
        normalizedStaffAssignments,
        requiredServiceAssignments,
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
              create: normalizedStaffAssignments.map(
                ({
                  sourceKey,
                  staffId,
                  serviceLabel,
                  job,
                  locationName,
                  startTime,
                  endTime,
                }) => ({
                  sourceKey,
                  staffId,
                  serviceLabel,
                  job,
                  ...(locationName ? { locationName } : {}),
                  ...(startTime ? { startTime } : {}),
                  ...(endTime ? { endTime } : {}),
                }),
              ),
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
        sessions: {
          include: {
            staffs: {
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
            },
            services: {
              include: {
                service: true,
              },
            },
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
    conflictOptions: AssignStaffConflictOptions = {},
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
    const requiredServiceAssignments =
      this.extractRequiredServiceAssignments(booking);
    await this.validateStaffAssignments(
      normalizedStaffAssignments,
      requiredServiceAssignments,
    );

    const conflicts = await this.detectAssignmentConflicts(
      id,
      normalizedStaffAssignments,
    );

    if (conflicts.length > 0) {
      const allowConflictOverride = conflictOptions.allowConflictOverride === true;
      const overrideReason =
        typeof conflictOptions.overrideReason === 'string'
          ? conflictOptions.overrideReason.trim()
          : '';

      if (!allowConflictOverride) {
        throw new BadRequestException({
          message:
            'Staff assignment has overlap conflicts and requires explicit override',
          code: 'BOOKING_STAFF_CONFLICT',
          details: {
            conflicts,
            requiresOverride: true,
            requiredPermission: 'bookings:update',
          },
        });
      }

      if (
        overrideReason.length < 1 ||
        overrideReason.length > OVERLAP_REASON_MAX_LENGTH
      ) {
        throw new BadRequestException(
          `Override reason must be between 1 and ${OVERLAP_REASON_MAX_LENGTH} characters`,
        );
      }

      this.logger.warn(
        `Booking ${id} staff overlap override accepted: ${overrideReason}`,
      );
    }

    const updatedBooking = await this.databaseService.booking.update({
      where: { id },
      data: {
        assignedStaffs: {
          deleteMany: {},
          ...(normalizedStaffAssignments.length > 0
            ? {
                create: normalizedStaffAssignments.map(
                  ({
                    sourceKey,
                    staffId,
                    serviceLabel,
                    job,
                    locationName,
                    startTime,
                    endTime,
                  }) => ({
                    sourceKey,
                    staffId,
                    serviceLabel,
                    job,
                    ...(locationName ? { locationName } : {}),
                    ...(startTime ? { startTime } : {}),
                    ...(endTime ? { endTime } : {}),
                  }),
                ),
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
    const booking = await this.findBookingById(id);
    const confirmableStatuses = new Set<BookingStatus>([
      BookingStatus.PENDING,
      BookingStatus.DEPOSIT_PAID,
      BookingStatus.RESCHEDULED,
    ]);

    if (!confirmableStatuses.has(booking.status as BookingStatus)) {
      throw new BadRequestException(
        `Only PENDING, DEPOSIT_PAID, or RESCHEDULED bookings can be confirmed. Current status: ${booking.status}`,
      );
    }

    await this.databaseService.booking.update({
      where: { id },
      data: { status: BookingStatus.CONFIRMED },
    });

    return this.findBookingById(id);
  }
}
