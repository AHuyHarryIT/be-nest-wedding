import { AuthIdentityService } from '@/auth/auth-identity.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { normalizeVietnamesePhoneNumber } from '@/common/utils/phone.util';
import {
  AssignRolesToUserDto,
  CreateUserDto,
  QueryUserDto,
  ResetUserPasswordDto,
  UpdateUserDto,
} from './dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly authIdentityService: AuthIdentityService,
  ) {}

  private async assertJobAssignable(jobId: string): Promise<void> {
    const job = await this.databaseService.job.findFirst({
      where: { id: jobId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (!job) {
      throw new BadRequestException('Job not found or inactive');
    }
  }

  private async assertJobsAssignable(jobIds: string[]): Promise<void> {
    const uniqueJobIds = [...new Set(jobIds)];

    for (const jobId of uniqueJobIds) {
      await this.assertJobAssignable(jobId);
    }
  }

  private normalizeJobIds(
    jobIds?: string[] | null,
    jobId?: string | null,
  ): string[] {
    const normalized = new Set<string>();

    const addJobId = (value?: string | null) => {
      if (typeof value !== 'string') return;

      const trimmed = value.trim();
      if (trimmed) {
        normalized.add(trimmed);
      }
    };

    if (Array.isArray(jobIds)) {
      jobIds.forEach((value) => addJobId(value));
    }

    addJobId(jobId);

    return [...normalized];
  }

  private mapManagedJobs(staffJobs?: Array<{ job: any }>): {
    jobIds: string[];
    jobs: Array<{
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
    }>;
    jobId: string | null;
    job: {
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
    } | null;
  } {
    const jobs = (staffJobs ?? []).map((entry) => ({
      id: entry.job.id,
      name: entry.job.name,
      description: entry.job.description ?? null,
      isActive: entry.job.isActive,
    }));

    const primaryJob = jobs[0] ?? null;

    return {
      jobIds: jobs.map((job) => job.id),
      jobs,
      jobId: primaryJob?.id ?? null,
      job: primaryJob,
    };
  }

  private withManagedJobs(user: any) {
    const { staffJobs, ...rest } = user;

    return {
      ...rest,
      ...this.mapManagedJobs(staffJobs),
    };
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
    const { id, phoneNumber, password, roleIds, jobIds, jobId, ...userData } =
      createUserDto;
    const normalizedPhoneNumber = normalizeVietnamesePhoneNumber(phoneNumber);

    await this.authIdentityService.assertPhoneNumberAvailable(
      normalizedPhoneNumber,
    );

    if (userData.email) {
      await this.authIdentityService.assertEmailAvailable(userData.email);
    }

    const resolvedJobIds = this.normalizeJobIds(jobIds, jobId);
    if (resolvedJobIds.length) {
      await this.assertJobsAssignable(resolvedJobIds);
    }

    const staffId = id.trim();

    await this.authIdentityService.assertStaffIdAvailable(staffId);

    const saltRounds = Number(this.configService.get('HASH_SALT', 10)) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const resolvedRoleIds = roleIds?.length ? [...new Set(roleIds)] : [];
    if (resolvedRoleIds.length > 0) {
      const roles = await this.databaseService.role.findMany({
        where: { id: { in: resolvedRoleIds } },
        select: { id: true },
      });

      if (roles.length !== resolvedRoleIds.length) {
        throw new BadRequestException('One or more role IDs are invalid');
      }
    }

    const createdUser = await this.databaseService.staff.create({
      data: {
        id: staffId,
        phoneNumber: normalizedPhoneNumber,
        passwordHash,
        ...userData,
        ...(resolvedJobIds.length
          ? {
              staffJobs: {
                create: resolvedJobIds.map((jobId) => ({
                  job: {
                    connect: { id: jobId },
                  },
                })),
              },
            }
          : {}),
        ...(resolvedRoleIds.length
          ? {
              roles: {
                create: resolvedRoleIds.map((roleId) => ({
                  roleId,
                })),
              },
            }
          : {}),
      },
      include: {
        staffJobs: {
          include: {
            job: {
              select: {
                id: true,
                name: true,
                description: true,
                isActive: true,
              },
            },
          },
        },
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
      ...this.withManagedJobs(createdUser),
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
            {
              staffJobs: {
                some: {
                  job: {
                    is: {
                      name: { contains: search, mode: 'insensitive' },
                    },
                  },
                },
              },
            },
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
        staffJobs: {
          select: {
            job: {
              select: {
                id: true,
                name: true,
                description: true,
                isActive: true,
              },
            },
          },
        },
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
      ...this.withManagedJobs(user),
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
        staffJobs: {
          select: {
            job: {
              select: {
                id: true,
                name: true,
                description: true,
                isActive: true,
              },
            },
          },
        },
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
      ...this.withManagedJobs(user),
      roles: user.roles.map((ur) => ur.role),
    };
  }

  async findByPhoneNumber(phoneNumber: string) {
    const normalizedPhoneNumber = normalizeVietnamesePhoneNumber(phoneNumber);

    return await this.databaseService.staff
      .findUnique({
        where: { phoneNumber: normalizedPhoneNumber },
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          staffJobs: {
            select: {
              job: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  isActive: true,
                },
              },
            },
          },
          refreshToken: true,
          isActive: true,
          createdAt: true,
        },
      })
      .then((user) => (user ? this.withManagedJobs(user) : null));
  }

  async findById(id: string) {
    return await this.databaseService.staff
      .findUnique({
        where: { id },
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          staffJobs: {
            select: {
              job: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  isActive: true,
                },
              },
            },
          },
          refreshToken: true,
          isActive: true,
          createdAt: true,
        },
      })
      .then((user) => (user ? this.withManagedJobs(user) : null));
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

    const { jobIds, jobId, roleIds, ...restUpdateUserDto } = updateUserDto;
    const hasJobChanges = jobIds !== undefined || jobId !== undefined;
    const resolvedJobIds = hasJobChanges
      ? this.normalizeJobIds(jobIds, jobId)
      : [];
    const hasRoleChanges = roleIds !== undefined;

    if (hasJobChanges && resolvedJobIds.length) {
      await this.assertJobsAssignable(resolvedJobIds);
    }

    if (hasRoleChanges) {
      const uniqueRoleIds = [...new Set(roleIds ?? [])];
      const roles = await this.databaseService.role.findMany({
        where: { id: { in: uniqueRoleIds } },
        select: { id: true },
      });

      if (roles.length !== uniqueRoleIds.length) {
        throw new BadRequestException('One or more role IDs are invalid');
      }
    }

    const updateData = {
      ...restUpdateUserDto,
      ...(nextStaffId ? { id: nextStaffId } : {}),
      ...(hasJobChanges
        ? {
            staffJobs: {
              deleteMany: {},
              create: resolvedJobIds.map((jobId) => ({
                job: {
                  connect: { id: jobId },
                },
              })),
            },
          }
        : {}),
      ...(hasRoleChanges
        ? {
            roles: {
              deleteMany: {},
              create: [...new Set(roleIds ?? [])].map((roleId) => ({
                roleId,
              })),
            },
          }
        : {}),
    };

    const updatedUser = await this.databaseService.staff.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        staffJobs: {
          select: {
            job: {
              select: {
                id: true,
                name: true,
                description: true,
                isActive: true,
              },
            },
          },
        },
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

    return {
      ...this.withManagedJobs(updatedUser),
      roles: updatedUser.roles.map((ur) => ur.role),
    };
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

  async resetPassword(id: string, resetUserPasswordDto: ResetUserPasswordDto) {
    const user = await this.databaseService.staff.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    const saltRounds = Number(this.configService.get('HASH_SALT', 10)) || 10;
    const passwordHash = await bcrypt.hash(
      resetUserPasswordDto.newPassword,
      saltRounds,
    );

    await this.databaseService.$transaction(async (tx) => {
      await tx.staff.update({
        where: { id },
        data: {
          passwordHash,
          refreshToken: null,
          refreshTokenExpiry: null,
        },
      });

      await tx.authSession.updateMany({
        where: {
          staffId: id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    });

    return {
      message: 'Staff password reset successfully',
    };
  }
}
