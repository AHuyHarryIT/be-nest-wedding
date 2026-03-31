import { AuthIdentityService } from '@/auth/auth-identity.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';
import { PaginationHelper } from '../common/utils/pagination.helper';
import {
  AssignRolesToUserDto,
  CreateUserDto,
  QueryUserDto,
  UpdateUserDto,
} from './dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly authIdentityService: AuthIdentityService,
  ) {}

  private async generateStaffId(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `STF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const existing = await this.databaseService.staff.findUnique({
        where: { id: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new BadRequestException('Failed to generate a unique staff ID');
  }

  async updateHashRefreshToken({
    userId,
    hashRefreshToken,
  }: {
    userId: string;
    hashRefreshToken: string | null;
  }) {
    return await this.databaseService.staff.update({
      where: { id: userId },
      data: {
        refreshToken: hashRefreshToken,
      },
    });
  }

  async create(createUserDto: CreateUserDto) {
    const { id, phoneNumber, password, roleIds, ...userData } = createUserDto;

    await this.authIdentityService.assertPhoneNumberAvailable(phoneNumber);

    if (userData.email) {
      await this.authIdentityService.assertEmailAvailable(userData.email);
    }

    const staffId = id?.trim() || (await this.generateStaffId());

    await this.authIdentityService.assertStaffIdAvailable(staffId);

    const saltRounds = Number(this.configService.get('HASH_SALT', 10)) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    if (roleIds && roleIds.length > 0) {
      const roles = await this.databaseService.role.findMany({
        where: { id: { in: roleIds } },
      });

      if (roles.length !== roleIds.length) {
        throw new BadRequestException('One or more role IDs are invalid');
      }
    }

    const createdUser = await this.databaseService.staff.create({
      data: {
        id: staffId,
        phoneNumber,
        passwordHash,
        ...userData,
        roles: roleIds?.length
          ? {
              create: roleIds.map((roleId) => ({
                roleId,
              })),
            }
          : undefined,
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      id: createdUser.id,
      phoneNumber: createdUser.phoneNumber,
      firstName: createdUser.firstName,
      lastName: createdUser.lastName,
      email: createdUser.email,
      isActive: createdUser.isActive,
      createdAt: createdUser.createdAt,
      updatedAt: createdUser.updatedAt,
      roles: createdUser.roles.map((staffRole) => staffRole.role),
    };
  }

  async findAll(params?: QueryUserDto) {
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder,
    } = PaginationHelper.mergeWithDefaults(params || {});

    const where: Prisma.StaffWhereInput = search
      ? {
          OR: [
            { phoneNumber: { contains: search, mode: 'insensitive' } },
            { id: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const orderBy: Prisma.StaffOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const total = await this.databaseService.staff.count({ where });

    const users = await this.databaseService.staff.findMany({
      where,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    const transformedUsers = users.map((user) => ({
      ...user,
      roles: user.roles.map((ur) => ur.role),
    }));

    return PaginationHelper.createPaginatedResponse(
      transformedUsers,
      page,
      limit,
      total,
    );
  }

  async findOne(id: string) {
    const user = await this.databaseService.staff.findUnique({
      where: { id },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
                permissions: {
                  select: {
                    permission: {
                      select: {
                        id: true,
                        key: true,
                        description: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return {
      ...user,
      roles: user.roles.map((ur) => ur.role),
    };
  }

  async findByPhoneNumber(phoneNumber: string) {
    return await this.databaseService.staff.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        refreshToken: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findById(id: string) {
    return await this.databaseService.staff.findUnique({
      where: { id },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        refreshToken: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.databaseService.staff.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      await this.authIdentityService.assertEmailAvailable(updateUserDto.email);
    }

    const nextStaffId = updateUserDto.id?.trim();

    if (nextStaffId && nextStaffId !== user.id) {
      await this.authIdentityService.assertStaffIdAvailable(
        nextStaffId,
        user.id,
      );
    }

    const updateData = {
      ...updateUserDto,
      ...(nextStaffId ? { id: nextStaffId } : {}),
    };

    return await this.databaseService.staff.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string) {
    const user = await this.databaseService.staff.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    await this.databaseService.staff.delete({
      where: { id },
    });

    return {
      message: `User with ID "${id}" has been deleted successfully`,
    };
  }

  async assignRoles(userId: string, assignRolesDto: AssignRolesToUserDto) {
    const user = await this.databaseService.staff.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const roles = await this.databaseService.role.findMany({
      where: { id: { in: assignRolesDto.roleIds } },
    });

    if (roles.length !== assignRolesDto.roleIds.length) {
      throw new BadRequestException('One or more role IDs are invalid');
    }

    await this.databaseService.staffRole.createMany({
      data: assignRolesDto.roleIds.map((roleId) => ({
        staffId: userId,
        roleId,
      })),
      skipDuplicates: true,
    });

    return await this.findOne(userId);
  }

  async removeRoles(userId: string, roleIds: string[]) {
    const user = await this.databaseService.staff.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    await this.databaseService.staffRole.deleteMany({
      where: {
        staffId: userId,
        roleId: { in: roleIds },
      },
    });

    return await this.findOne(userId);
  }
}
