import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { BaseRepository } from './base.repository';

/**
 * User Repository - Handles all user data operations
 * Manages authentication, roles, permissions, and profiles
 */
@Injectable()
export class UserRepository extends BaseRepository<any> {
  constructor(protected db: DatabaseService) {
    super(db);
    this.modelName = 'user';
  }

  /**
   * Find user by phone number (unique field)
   */
  async findByPhoneNumber(phoneNumber: string) {
    return this.db.user.findUnique({
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

  /**
   * Find user by ID with full profile and permissions
   */
  async findByIdWithPermissions(userId: string) {
    const user = await this.db.user.findUnique({
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
        bookings: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        files: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) return null;

    // Extract permissions from roles
    const permissions = user.roles.flatMap((ur) =>
      ur.role.permissions.map((rp) => rp.permission.key),
    );

    return {
      ...user,
      permissions: Array.from(new Set(permissions)),
    };
  }

  /**
   * Find user with minimal data (for auth/sessions)
   */
  async findByIdLean(userId: string) {
    return this.db.user.findUnique({
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

  /**
   * Find active users with pagination
   */
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

    return this.db.user.findMany({
      where,
      include: {
        roles: { include: { role: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: params?.skip,
      take: params?.take,
    });
  }

  /**
   * Find users by role
   */
  async findByRole(
    roleName: string,
    params?: { skip?: number; take?: number },
  ) {
    return this.db.user.findMany({
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

  /**
   * Add role to user
   */
  async addRole(userId: string, roleId: string) {
    return this.db.userRole.create({
      data: {
        userId,
        roleId,
      },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string) {
    return this.db.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
  }

  /**
   * Check if user has permission
   */
  async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
    const permission = await this.db.rolePermission.findFirst({
      where: {
        role: {
          users: {
            some: { userId },
          },
        },
        permission: { key: permissionKey },
      },
    });

    return !!permission;
  }

  /**
   * Check if user has role
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const userRole = await this.db.userRole.findFirst({
      where: {
        userId,
        role: { name: roleName },
      },
    });

    return !!userRole;
  }

  /**
   * Update refresh token
   */
  async updateRefreshToken(
    userId: string,
    token: string | null,
    expiresAt?: Date,
  ) {
    return this.db.user.update({
      where: { id: userId },
      data: {
        refreshToken: token,
        refreshTokenExpiry: expiresAt,
      },
    });
  }

  /**
   * Get user statistics
   */
  async getStatistics() {
    const [total, active, inactive, withBookings] = await Promise.all([
      this.db.user.count(),
      this.db.user.count({ where: { isActive: true } }),
      this.db.user.count({ where: { isActive: false } }),
      this.db.user.count({
        where: {
          bookings: {
            some: {},
          },
        },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      withBookings,
      activePercentage: total > 0 ? (active / total) * 100 : 0,
    };
  }

  /**
   * Deactivate user
   */
  async deactivate(userId: string) {
    return this.db.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        refreshToken: null,
        refreshTokenExpiry: null,
      },
    });
  }

  /**
   * Activate user
   */
  async activate(userId: string) {
    return this.db.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  }
}
