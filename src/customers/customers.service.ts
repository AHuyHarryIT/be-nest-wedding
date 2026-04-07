import { AuthIdentityService } from '@/auth/auth-identity.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from '../database/database.service';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { CreateCustomerDto, QueryCustomerDto, UpdateCustomerDto } from './dto';
import { normalizeVietnamesePhoneNumber } from '@/common/utils/phone.util';

const CUSTOMER_SELECT = {
  id: true,
  phoneNumber: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
  isActive: true,
  weddingDate: true,
  weddingVenue: true,
  emailNotifications: true,
  smsNotifications: true,
  marketingEmails: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

@Injectable()
export class CustomersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly authIdentityService: AuthIdentityService,
  ) {}

  private toView(
    customer: Prisma.CustomerGetPayload<{
      select: typeof CUSTOMER_SELECT;
    }>,
  ) {
    return customer;
  }

  async create(createCustomerDto: CreateCustomerDto) {
    const {
      phoneNumber,
      password,
      firstName,
      lastName,
      email,
      avatarUrl,
      weddingDate,
      weddingVenue,
      emailNotifications,
      smsNotifications,
      marketingEmails,
      isActive,
    } = createCustomerDto;
    const normalizedPhoneNumber = normalizeVietnamesePhoneNumber(phoneNumber);

    await this.authIdentityService.assertPhoneNumberAvailable(
      normalizedPhoneNumber,
    );

    if (email) {
      await this.authIdentityService.assertEmailAvailable(email);
    }

    const saltRounds = Number(this.configService.get('HASH_SALT', 10)) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const customer = await this.databaseService.customer.create({
      data: {
        phoneNumber: normalizedPhoneNumber,
        passwordHash,
        firstName,
        lastName,
        email,
        avatarUrl,
        weddingDate: weddingDate ? new Date(weddingDate) : null,
        weddingVenue,
        emailNotifications: emailNotifications ?? true,
        smsNotifications: smsNotifications ?? true,
        marketingEmails: marketingEmails ?? false,
        isActive: isActive ?? true,
      },
      select: CUSTOMER_SELECT,
    });

    return this.toView(customer);
  }

  async findAll(params?: QueryCustomerDto) {
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder,
    } = PaginationHelper.mergeWithDefaults(params || {});

    const where: Prisma.CustomerWhereInput = {
      deletedAt: params?.includeDeleted ? undefined : null,
      ...(search
        ? {
            OR: [
              { phoneNumber: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { weddingVenue: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.CustomerOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const total = await this.databaseService.customer.count({ where });

    const customers = await this.databaseService.customer.findMany({
      where,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
      select: CUSTOMER_SELECT,
    });

    return PaginationHelper.createPaginatedResponse(
      customers.map((customer) => this.toView(customer)),
      page,
      limit,
      total,
    );
  }

  async findOne(id: string) {
    const customer = await this.databaseService.customer.findFirst({
      where: { id, deletedAt: null },
      select: CUSTOMER_SELECT,
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    return this.toView(customer);
  }

  async findOneWithDetails(id: string) {
    const customer = await this.databaseService.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        bookings: {
          where: { deletedAt: null },
          orderBy: { eventDate: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
              },
            },
            packages: {
              include: {
                package: {
                  select: { id: true, name: true, price: true },
                },
              },
            },
            services: {
              include: {
                service: {
                  select: { id: true, name: true, price: true },
                },
              },
            },
            orders: {
              include: {
                payments: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    // Calculate derived fields
    const bookings = customer.bookings.map((booking: any) => {
      const orders = booking.orders || [];
      let totalSpent = 0;
      let totalPrice = 0;

      orders.forEach((order: any) => {
        totalPrice += order.totalPrice || 0;
        const payments = order.payments || [];
        payments.forEach((p: any) => {
          if (p.status === 'SUCCESSFUL') {
            totalSpent += p.amount || 0;
          }
        });
      });

      // Include booking-level price if no orders
      if (orders.length === 0) {
        totalPrice = booking.totalPrice || 0;
      }

      const remainingBalance = totalPrice - totalSpent;

      return {
        ...booking,
        totalPaid: totalSpent,
        totalPrice,
        remainingBalance,
        orders: orders.map((order: any) => {
          const orderPayments = order.payments || [];
          const orderPaid = orderPayments
            .filter((p: any) => p.status === 'SUCCESSFUL')
            .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
          return {
            ...order,
            totalPaid: orderPaid,
            balanceRemaining: order.balanceRemaining ?? (order.totalPrice - orderPaid),
            payments: orderPayments,
          };
        }),
      };
    });

    const totalSpent = bookings.reduce((sum: number, b: any) => sum + b.totalPaid, 0);
    const visitCount = bookings.filter((b: any) =>
      ['COMPLETED', 'CONFIRMED'].includes(b.status),
    ).length;

    return {
      id: customer.id,
      phoneNumber: customer.phoneNumber,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      avatarUrl: customer.avatarUrl,
      isActive: customer.isActive,
      weddingDate: customer.weddingDate,
      weddingVenue: customer.weddingVenue,
      emailNotifications: customer.emailNotifications,
      smsNotifications: customer.smsNotifications,
      marketingEmails: customer.marketingEmails,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      bookings,
      totalSpent,
      visitCount,
    };
  }

  async findBookingsByCustomer(customerId: string, query?: any) {
    // Verify customer exists
    const customer = await this.databaseService.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${customerId}" not found`);
    }

    const page = query?.page || 1;
    const limit = query?.limit || 10;

    const where: Prisma.BookingWhereInput = {
      customerId,
      deletedAt: null,
    };

    if (query?.status) {
      where.status = query.status;
    }

    const total = await this.databaseService.booking.count({ where });

    const bookings = await this.databaseService.booking.findMany({
      where,
      orderBy: { eventDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        orders: {
          include: {
            payments: true,
          },
        },
        packages: {
          include: {
            package: { select: { id: true, name: true, price: true } },
          },
        },
        services: {
          include: {
            service: { select: { id: true, name: true, price: true } },
          },
        },
      },
    });

    // Calculate payment info for each booking
    const enrichedBookings = bookings.map((booking: any) => {
      const orders = booking.orders || [];
      let totalPaid = 0;
      let totalPrice = booking.totalPrice || 0;

      orders.forEach((order: any) => {
        const payments = order.payments || [];
        payments.forEach((p: any) => {
          if (p.status === 'SUCCESSFUL') {
            totalPaid += p.amount || 0;
          }
        });
        if (order.totalPrice > 0) {
          totalPrice = order.totalPrice;
        }
      });

      return {
        ...booking,
        totalPaid,
        remainingBalance: totalPrice - totalPaid,
      };
    });

    return { bookings: enrichedBookings, total };
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.databaseService.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    if (updateCustomerDto.email && updateCustomerDto.email !== customer.email) {
      await this.authIdentityService.assertEmailAvailable(
        updateCustomerDto.email,
      );
    }

    const updatedCustomer = await this.databaseService.customer.update({
      where: { id },
      data: {
        ...updateCustomerDto,
        weddingDate: updateCustomerDto.weddingDate
          ? new Date(updateCustomerDto.weddingDate)
          : updateCustomerDto.weddingDate === null
            ? null
            : undefined,
      },
      select: CUSTOMER_SELECT,
    });

    return this.toView(updatedCustomer);
  }

  async delete(id: string) {
    const customer = await this.databaseService.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    await this.databaseService.customer.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        refreshToken: null,
        refreshTokenExpiry: null,
      },
    });

    return {
      message: `Customer with ID "${id}" has been deleted successfully`,
    };
  }
}
