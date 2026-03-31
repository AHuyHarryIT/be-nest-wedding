import { AuthIdentityService } from '@/auth/auth-identity.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from '../database/database.service';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { CreateCustomerDto, QueryCustomerDto, UpdateCustomerDto } from './dto';

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

    await this.authIdentityService.assertPhoneNumberAvailable(phoneNumber);

    if (email) {
      await this.authIdentityService.assertEmailAvailable(email);
    }

    const saltRounds = Number(this.configService.get('HASH_SALT', 10)) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const customer = await this.databaseService.customer.create({
      data: {
        phoneNumber,
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
