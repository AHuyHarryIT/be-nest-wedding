import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { BaseRepository } from './base.repository';

/**
 * Staff User Repository - Handles staff identity data operations.
 */
@Injectable()
export class UserRepository extends BaseRepository<any> {
  constructor(protected db: DatabaseService) {
    super(db);
    this.modelName = 'staff';
  }

  async findByPhoneNumber(phoneNumber: string) {
    return this.db.staff.findUnique({
      where: { phoneNumber },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
  }

  async findByIdWithPermissions(userId: string) {
    const user = await this.db.staff.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        files: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) return null;

    const permissions = user.roles.flatMap((ur) =>
      ur.role.permissions.map((rp) => rp.permission.key),
    );

    return {
      ...user,
      permissions: Array.from(new Set(permissions)),
    };
  }

  async findByIdLean(userId: string) {
    return this.db.staff.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });
  }

  async findActive(params?: { skip?: number; take?: number; search?: string }) {
    const where: any = { isActive: true };

    if (params?.search) {
      where.OR = [
        { phoneNumber: { contains: params.search } },
        { email: { contains: params.search } },
        { firstName: { contains: params.search } },
        { lastName: { contains: params.search } },
      ];
    }

    return this.db.staff.findMany({
      where,
      include: {
        roles: { include: { role: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: params?.skip,
      take: params?.take,
    });
  }

  async findByRole(
    roleName: string,
    params?: { skip?: number; take?: number },
  ) {
    return this.db.staff.findMany({
      where: {
        roles: {
          some: {
            role: { name: roleName },
          },
        },
      },
      include: {
        roles: { include: { role: true } },
      },
      skip: params?.skip,
      take: params?.take,
    });
  }

  async addRole(userId: string, roleId: string) {
    return this.db.staffRole.create({
      data: {
        staffId: userId,
        roleId,
      },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
  }

  async removeRole(userId: string, roleId: string) {
    return this.db.staffRole.delete({
      where: {
        staffId_roleId: {
          staffId: userId,
          roleId,
        },
      },
    });
  }

  async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
    const permission = await this.db.rolePermission.findFirst({
      where: {
        role: {
          staff: {
            some: { staffId: userId },
          },
        },
        permission: { key: permissionKey },
      },
    });

    return !!permission;
  }

  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const userRole = await this.db.staffRole.findFirst({
      where: {
        staffId: userId,
        role: { name: roleName },
      },
    });

    return !!userRole;
  }

  async updateRefreshToken(
    userId: string,
    token: string | null,
    expiresAt?: Date,
  ) {
    return this.db.staff.update({
      where: { id: userId },
      data: {
        refreshToken: token,
        refreshTokenExpiry: expiresAt,
      },
    });
  }

  async getStatistics() {
    const [total, active, inactive] = await Promise.all([
      this.db.staff.count(),
      this.db.staff.count({ where: { isActive: true } }),
      this.db.staff.count({ where: { isActive: false } }),
    ]);

    return {
      total,
      active,
      inactive,
      withBookings: 0,
      activePercentage: total > 0 ? (active / total) * 100 : 0,
    };
  }

  async deactivate(userId: string) {
    return this.db.staff.update({
      where: { id: userId },
      data: {
        isActive: false,
        refreshToken: null,
        refreshTokenExpiry: null,
      },
    });
  }

  async activate(userId: string) {
    return this.db.staff.update({
      where: { id: userId },
      data: { isActive: true },
    });
  }
}
