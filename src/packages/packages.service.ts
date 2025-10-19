import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { UpdatePackageServicesDto } from './dto/update-package-services.dto';
import { QueryPackageDto } from './dto/query-package.dto';
import { DatabaseService } from '../database/database.service';
import { Prisma } from 'generated/prisma';

@Injectable()
export class PackagesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createPackageDto: CreatePackageDto) {
    // Generate slug if not provided
    let slug = createPackageDto.slug;
    if (!slug) {
      slug = await this.generateUniqueSlug(createPackageDto.name);
    } else {
      // Check if provided slug is unique
      const existingPackage = await this.databaseService.package.findFirst({
        where: { slug, deletedAt: null },
      });
      if (existingPackage) {
        // Generate a unique slug based on the provided one
        slug = await this.generateUniqueSlug(slug);
      }
    }

    // Set default values if not provided
    const data: Prisma.PackageCreateInput = {
      name: createPackageDto.name,
      slug,
      description: createPackageDto.description || null,
      price: createPackageDto.price || 0,
      isActive: createPackageDto.isActive || false,
    };

    return this.databaseService.package.create({
      data,
    });
  }

  async findAll(queryDto?: QueryPackageDto) {
    const {
      q,
      isActive,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeServices = false,
    } = queryDto || {};

    // Build where clause
    const where: Prisma.PackageWhereInput = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
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

    // If pagination is requested
    if (page && limit) {
      const skip = (page - 1) * limit;
      const [packages, total] = await Promise.all([
        this.databaseService.package.findMany({
          where,
          include,
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit,
        }),
        this.databaseService.package.count({ where }),
      ]);

      return {
        data: packages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrevious: page > 1,
        },
      };
    }

    // Return all without pagination
    return this.databaseService.package.findMany({
      where,
      include,
      orderBy: { [sortBy]: sortOrder },
    });
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

  async findBySlug(slug: string) {
    const packageItem = await this.databaseService.package.findFirst({
      where: {
        slug,
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
      throw new NotFoundException(`Package with slug ${slug} not found`);
    }

    return packageItem;
  }

  async update(id: string, updatePackageDto: UpdatePackageDto) {
    // First check if package exists
    await this.findOne(id);

    // Handle slug updates
    const data: Prisma.PackageUpdateInput = { ...updatePackageDto };

    if (updatePackageDto.slug !== undefined) {
      if (updatePackageDto.slug) {
        // Check if the new slug conflicts with existing packages (excluding current one)
        const existingPackage = await this.databaseService.package.findFirst({
          where: {
            slug: updatePackageDto.slug,
            deletedAt: null,
            NOT: { id },
          },
        });

        if (existingPackage) {
          // Generate a unique slug based on the provided one
          data.slug = await this.generateUniqueSlug(updatePackageDto.slug);
        }
      }
      // If slug is empty string or null, allow it
    }

    return this.databaseService.package.update({
      where: { id },
      data,
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

  async hardDelete(id: string) {
    // First check if package exists
    await this.findOne(id);

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

  /**
   * Generate a unique slug from a given text
   */
  private async generateUniqueSlug(text: string): Promise<string> {
    // Convert to slug format
    let baseSlug = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // If baseSlug is empty, use a default
    if (!baseSlug) {
      baseSlug = 'package';
    }

    let slug = baseSlug;
    let counter = 1;

    // Check if slug exists and increment counter until unique
    while (await this.slugExists(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Check if a slug already exists
   */
  private async slugExists(slug: string): Promise<boolean> {
    const existing = await this.databaseService.package.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
    });
    return !!existing;
  }
}
