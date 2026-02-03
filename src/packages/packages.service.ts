import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { DatabaseService } from '../database/database.service';
import { CreatePackageDto, QueryPackageDto, UpdatePackageDto } from './dto';
import { UpdatePackageServicesDto } from './dto/update-package-services.dto';

@Injectable()
export class PackagesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createPackageDto: CreatePackageDto) {
    // Set default values if not provided
    const data: Prisma.PackageCreateInput = {
      name: createPackageDto.name,
      description: createPackageDto.description || null,
      price: createPackageDto.price || 0,
      isActive: createPackageDto.isActive ?? false,
    };

    // Handle service associations if provided
    if (createPackageDto.serviceIds && createPackageDto.serviceIds.length > 0) {
      data.services = {
        create: createPackageDto.serviceIds.map((serviceId) => ({
          serviceId,
        })),
      };
    }

    return this.databaseService.package.create({
      data,
      include: {
        services: true,
      },
    });
  }

  /**
   * Get all packages with pagination and filtering
   */
  async findAll(params?: QueryPackageDto) {
    const paginationParams = PaginationHelper.mergeWithDefaults(params || {});
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder,
    } = paginationParams;

    const {
      isActive,
      minPrice,
      maxPrice,
      includeServices = false,
    } = params || {};

    const where: Prisma.PackageWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    // Exclude soft-deleted records
    where.deletedAt = null;

    // Build include clause
    const include = includeServices
      ? {
          services: {
            include: {
              service: true,
            },
          },
        }
      : undefined;

    // Build orderBy
    const orderBy: Prisma.PackageOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Get total count for pagination
    const total = await this.databaseService.package.count({ where });

    // Get paginated data
    const packages = await this.databaseService.package.findMany({
      where,
      include,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(
      packages,
      page,
      limit,
      total,
    );
  }

  async findOne(id: string) {
    const packageItem = await this.databaseService.package.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!packageItem) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }

    return packageItem;
  }

  async update(id: string, updatePackageDto: UpdatePackageDto) {
    // First check if package exists
    await this.findOne(id);

    // Separate serviceIds from other update data
    const { serviceIds, ...updateData } = updatePackageDto;

    const data: Prisma.PackageUpdateInput = { ...updateData };

    // Handle service associations if provided
    if (serviceIds !== undefined) {
      // Delete existing service associations
      await this.databaseService.packageService.deleteMany({
        where: { packageId: id },
      });

      // Create new associations if serviceIds is not empty
      if (serviceIds.length > 0) {
        await this.databaseService.packageService.createMany({
          data: serviceIds.map((serviceId) => ({
            packageId: id,
            serviceId,
          })),
        });
      }
    }

    return this.databaseService.package.update({
      where: { id },
      data,
      include: {
        services: true,
      },
    });
  }

  async remove(id: string) {
    // First check if package exists
    await this.findOne(id);

    // Soft delete by setting deletedAt
    return this.databaseService.package.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Get all soft-deleted packages with pagination and filtering
   */
  async findDeleted(params?: QueryPackageDto) {
    const paginationParams = PaginationHelper.mergeWithDefaults(params || {});
    const {
      page,
      limit,
      search,
      sortBy = 'deletedAt',
      sortOrder,
    } = paginationParams;

    const {
      isActive,
      minPrice,
      maxPrice,
      includeServices = false,
    } = params || {};

    // Build where clause for search and filters
    const where: Prisma.PackageWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    // Only include soft-deleted records
    where.deletedAt = { not: null };

    // Build include clause
    const include = includeServices
      ? {
          services: {
            include: {
              service: true,
            },
          },
        }
      : undefined;

    // Build orderBy
    const orderBy: Prisma.PackageOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Get total count for pagination
    const total = await this.databaseService.package.count({ where });

    // Get paginated data
    const packages = await this.databaseService.package.findMany({
      where,
      include,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(
      packages,
      page,
      limit,
      total,
    );
  }

  /**
   * Permanently delete a package
   */
  async hardDelete(id: string) {
    // First check if soft-deleted package exists
    const packageItem = await this.databaseService.package.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!packageItem) {
      throw new NotFoundException(`Package with ID "${id}" not found`);
    }

    return this.databaseService.package.delete({
      where: { id },
    });
  }

  async restore(id: string) {
    const packageItem = await this.databaseService.package.findUnique({
      where: { id },
    });

    if (!packageItem) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }

    return this.databaseService.package.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });
  }

  async findActivePackages() {
    return this.databaseService.package.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async toggleActiveStatus(id: string) {
    const packageItem = await this.findOne(id);

    return this.databaseService.package.update({
      where: { id },
      data: {
        isActive: !packageItem.isActive,
      },
    });
  }

  async getPackageServices(id: string) {
    const packageWithServices = await this.findOne(id);
    return packageWithServices.services.map((ps) => ps.service);
  }

  async updatePackageServices(
    id: string,
    updatePackageServicesDto: UpdatePackageServicesDto,
  ) {
    // First check if package exists
    await this.findOne(id);

    // Validate that all service IDs exist
    const services = await this.databaseService.service.findMany({
      where: {
        id: { in: updatePackageServicesDto.serviceIds },
        deletedAt: null,
      },
    });

    if (services.length !== updatePackageServicesDto.serviceIds.length) {
      const foundIds = services.map((s) => s.id);
      const missingIds = updatePackageServicesDto.serviceIds.filter(
        (id) => !foundIds.includes(id),
      );
      throw new NotFoundException(
        `Services not found: ${missingIds.join(', ')}`,
      );
    }

    // Use transaction to ensure data consistency
    return this.databaseService.$transaction(async (prisma) => {
      // First, remove all existing services
      await prisma.packageService.deleteMany({
        where: { packageId: id },
      });

      // Then add new services
      if (updatePackageServicesDto.serviceIds.length > 0) {
        const packageServices = updatePackageServicesDto.serviceIds.map(
          (serviceId) => ({
            packageId: id,
            serviceId: serviceId,
          }),
        );

        await prisma.packageService.createMany({
          data: packageServices,
        });
      }

      // Return updated package with services
      return prisma.package.findUnique({
        where: { id },
        include: {
          services: {
            include: {
              service: true,
            },
          },
        },
      });
    });
  }
}
