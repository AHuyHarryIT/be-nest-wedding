import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';
import { PaginationHelper } from '../common/utils/pagination.helper';
import {
  CreateUserDto,
  QueryUserDto,
  UpdateUserDto,
  AssignRolesToUserDto,
} from './dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new user with optional roles
   */
  async create(createUserDto: CreateUserDto) {
    const { phoneNumber, password, roleIds, ...userData } = createUserDto;

    // Check if user already exists
    const existingUser = await this.databaseService.user.findUnique({
      where: { phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException(
        `User with phone number "${phoneNumber}" already exists`,
      );
    }

    // Check if email already exists (if provided)
    if (userData.email) {
      const existingEmailUser = await this.databaseService.user.findFirst({
        where: { email: userData.email },
      });

      if (existingEmailUser) {
        throw new ConflictException(
          `User with email "${userData.email}" already exists`,
        );
      }
    }

    // Hash password
    const saltRounds = this.configService.get<number>('HASH_SALT', 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // If roles are provided, verify they exist
    if (roleIds && roleIds.length > 0) {
      const roles = await this.databaseService.role.findMany({
        where: { id: { in: roleIds } },
      });

      if (roles.length !== roleIds.length) {
        throw new BadRequestException('One or more role IDs are invalid');
      }

      // Create user with roles
      return await this.databaseService.user.create({
        data: {
          phoneNumber,
          passwordHash,
          ...userData,
          roles: {
            create: roleIds.map((roleId) => ({
              roleId,
            })),
          },
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
    }

    // Create user without roles
    return await this.databaseService.user.create({
      data: {
        phoneNumber,
        passwordHash,
        ...userData,
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
  }

  /**
   * Get all users with pagination
   */
  async findAll(params?: QueryUserDto) {
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder,
    } = PaginationHelper.mergeWithDefaults(params || {});

    // Build where clause for search
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { phoneNumber: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    // Build orderBy
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Get total count for pagination
    const total = await this.databaseService.user.count({ where });

    // Get paginated data
    const users = await this.databaseService.user.findMany({
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

    // Transform response
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

  /**
   * Get a single user by ID with roles
   */
  async findOne(id: string) {
    const user = await this.databaseService.user.findUnique({
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

    // Transform response
    return {
      ...user,
      roles: user.roles.map((ur) => ur.role),
    };
  }

  /**
   * Update a user (admin can update other users)
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    // Verify user exists
    const user = await this.databaseService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // Check if email is being updated and already exists
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmailUser = await this.databaseService.user.findFirst({
        where: {
          email: updateUserDto.email,
          id: { not: id },
        },
      });

      if (existingEmailUser) {
        throw new ConflictException(
          `User with email "${updateUserDto.email}" already exists`,
        );
      }
    }

    return await this.databaseService.user.update({
      where: { id },
      data: updateUserDto,
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

  /**
   * Delete a user
   */
  async delete(id: string) {
    // Verify user exists
    const user = await this.databaseService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // Delete user and related records
    await this.databaseService.user.delete({
      where: { id },
    });

    return {
      message: `User with ID "${id}" has been deleted successfully`,
    };
  }

  /**
   * Assign roles to a user
   */
  async assignRoles(userId: string, assignRolesDto: AssignRolesToUserDto) {
    // Verify user exists
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    // Verify all roles exist
    const roles = await this.databaseService.role.findMany({
      where: { id: { in: assignRolesDto.roleIds } },
    });

    if (roles.length !== assignRolesDto.roleIds.length) {
      throw new BadRequestException('One or more role IDs are invalid');
    }

    // Add new ones

    await this.databaseService.userRole.createMany({
      data: assignRolesDto.roleIds.map((roleId) => ({
        userId,
        roleId,
      })),
    });

    // Return updated user with roles
    return await this.findOne(userId);
  }

  /**
   * Remove roles from a user
   */
  async removeRoles(userId: string, roleIds: string[]) {
    // Verify user exists
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    // Remove specified roles
    await this.databaseService.userRole.deleteMany({
      where: {
        userId,
        roleId: { in: roleIds },
      },
    });

    // Return updated user with roles
    return await this.findOne(userId);
  }
}
