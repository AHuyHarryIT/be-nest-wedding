import {
  BadRequestException,
  Body,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { QueryRoleDto } from './dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create a new role with optional permissions
   */
  async create(@Body() createRoleDto: CreateRoleDto) {
    const { permissionIds, ...roleData } = createRoleDto;

    // Check if role name already exists
    const existingRole = await this.databaseService.role.findUnique({
      where: { name: roleData.name },
    });

    if (existingRole) {
      throw new ConflictException(
        `Role with name "${roleData.name}" already exists`,
      );
    }

    // If permissions are provided, verify they exist
    if (permissionIds && permissionIds.length > 0) {
      const permissions = await this.databaseService.permission.findMany({
        where: { id: { in: permissionIds } },
      });

      if (permissions.length !== permissionIds.length) {
        throw new BadRequestException('One or more permission IDs are invalid');
      }

      // Create role with permissions
      return await this.databaseService.role.create({
        data: {
          ...roleData,
          permissions: {
            create: permissionIds.map((permissionId) => ({
              permissionId,
            })),
          },
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    }
    // Create role without permissions
    return await this.databaseService.role.create({
      data: roleData,
    });
  }

  /**
   * Get all roles with their permissions (paginated)
   */
  async findAll(params?: QueryRoleDto) {
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder,
    } = PaginationHelper.mergeWithDefaults(params || {});

    // Build where clause for search
    const where: Prisma.RoleWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    // Build orderBy
    const orderBy: Prisma.RoleOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Get total count for pagination
    const total = await this.databaseService.role.count({ where });

    // Get paginated data
    const rolesService = await this.databaseService.role.findMany({
      where,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return PaginationHelper.createPaginatedResponse(
      rolesService,
      page,
      limit,
      total,
    );
  }

  /**
   * Get a single role by ID with permissions
   */
  async findOne(id: string) {
    const role = await this.databaseService.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    return role;
  }

  /**
   * Update a role
   */
  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const { permissionIds, ...roleData } = updateRoleDto;

    // Check if role exists
    await this.findOne(id);

    // If name is being updated, check for conflicts
    if (roleData.name) {
      const existingRole = await this.databaseService.role.findFirst({
        where: {
          name: roleData.name,
          NOT: { id },
        },
      });

      if (existingRole) {
        throw new ConflictException(
          `Role with name "${roleData.name}" already exists`,
        );
      }
    }

    // If permissions are provided, update them
    if (permissionIds !== undefined) {
      if (permissionIds.length > 0) {
        const permissions = await this.databaseService.permission.findMany({
          where: { id: { in: permissionIds } },
        });

        if (permissions.length !== permissionIds.length) {
          throw new BadRequestException(
            'One or more permission IDs are invalid',
          );
        }
      }

      // Delete existing permissions and create new ones
      return await this.databaseService.role.update({
        where: { id },
        data: {
          ...roleData,
          permissions: {
            deleteMany: {},
            create: permissionIds.map((permissionId) => ({
              permissionId,
            })),
          },
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    }
    return await this.databaseService.role.update({
      where: { id },
      data: roleData,
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Delete a role
   */
  async remove(id: string) {
    await this.findOne(id);
    return await this.databaseService.role.delete({
      where: { id },
    });
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissions(roleId: string, permissionIds: string[]) {
    // Verify role exists
    await this.findOne(roleId);

    // Verify all permissions exist
    const permissions = await this.databaseService.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    // Get existing permissions
    const existingPermissions =
      await this.databaseService.rolePermission.findMany({
        where: { roleId },
        select: { permissionId: true },
      });

    const existingPermissionIds = new Set(
      existingPermissions.map((rp) => rp.permissionId),
    );

    // Filter out permissions that are already assigned
    const newPermissionIds = permissionIds.filter(
      (id) => !existingPermissionIds.has(id),
    );

    if (newPermissionIds.length === 0) {
      throw new ConflictException(
        'All permissions are already assigned to this role',
      );
    }

    // Assign new permissions
    await this.databaseService.rolePermission.createMany({
      data: newPermissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
    });

    return this.findOne(roleId);
  }

  /**
   * Revoke permissions from a role
   */
  async revokePermissions(roleId: string, permissionIds: string[]) {
    // Verify role exists
    await this.findOne(roleId);

    // Verify permissions are assigned to the role
    const rolePermissions = await this.databaseService.rolePermission.findMany({
      where: {
        roleId,
        permissionId: { in: permissionIds },
      },
    });

    if (rolePermissions.length === 0) {
      throw new BadRequestException(
        'None of the specified permissions are assigned to this role',
      );
    }

    // Revoke permissions
    await this.databaseService.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId: { in: permissionIds },
      },
    });

    return this.findOne(roleId);
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(roleId: string) {
    await this.findOne(roleId);

    const rolePermissions = await this.databaseService.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: true,
      },
    });

    return rolePermissions.map((rp) => rp.permission);
  }
}
