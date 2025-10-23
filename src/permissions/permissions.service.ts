import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { QueryPermissionDto } from './dto/query-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all permissions (paginated)
   */
  async findAll(params?: QueryPermissionDto) {
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder,
    } = PaginationHelper.mergeWithDefaults(params || {});

    // Build where clause for search
    const where: Prisma.PermissionWhereInput = search
      ? {
          OR: [
            { key: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    // Build orderBy
    const orderBy: Prisma.PermissionOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Get total count for pagination
    const total = await this.databaseService.permission.count({ where });

    // Get paginated data
    const data = await this.databaseService.permission.findMany({
      where,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
      include: {
        _count: {
          select: {
            roles: true,
          },
        },
      },
    });

    return PaginationHelper.createPaginatedResponse(data, page, limit, total);
  }

  /**
   * Get a single permission by ID
   */
  async findOne(id: string) {
    const permission = await this.databaseService.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID "${id}" not found`);
    }

    return permission;
  }

  /**
   * Get a permission by key
   */
  async findByKey(key: string) {
    const permission = await this.databaseService.permission.findUnique({
      where: { key },
      include: {
        _count: {
          select: {
            roles: true,
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with key "${key}" not found`);
    }

    return permission;
  }
}
