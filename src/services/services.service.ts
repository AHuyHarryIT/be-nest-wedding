import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { DatabaseService } from '../database/database.service';
import { CreateServiceDto, QueryServiceDto, UpdateServiceDto } from './dto';

@Injectable()
export class ServicesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createServiceDto: CreateServiceDto) {
    // Generate slug if not provided
    let slug = createServiceDto.slug;
    if (!slug) {
      slug = await this.generateUniqueSlug(createServiceDto.name);
    } else {
      // Check if provided slug is unique
      const existingService = await this.databaseService.service.findFirst({
        where: { slug, deletedAt: null },
      });
      if (existingService) {
        // Generate a unique slug based on the provided one
        slug = await this.generateUniqueSlug(slug);
      }
    }

    // Set default values if not provided
    const data: Prisma.ServiceCreateInput = {
      name: createServiceDto.name,
      slug,
      description: createServiceDto.description || null,
      price: createServiceDto.price || 0,
      isActive: createServiceDto.isActive || false,
    };

    return this.databaseService.service.create({
      data,
    });
  }

  async findAll(params?: QueryServiceDto) {
    const {
      page,
      limit,
      sortBy = 'createdAt',
      sortOrder,
      search,
    } = PaginationHelper.mergeWithDefaults(params || {});

    const { isActive, minPrice, maxPrice } = params || {};

    // Build where clause for search and filters
    const where: Prisma.ServiceWhereInput = {};

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

    // Build orderBy
    const orderBy: Prisma.ServiceOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Get total count for pagination
    const total = await this.databaseService.service.count({ where });

    // Get paginated data
    const services = await this.databaseService.service.findMany({
      where,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(
      services,
      page,
      limit,
      total,
    );
  }

  async findOne(id: string) {
    const service = await this.databaseService.service.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async update(id: string, updateServiceDto: UpdateServiceDto) {
    // First check if service exists
    await this.findOne(id);

    // Handle slug updates
    const data: Prisma.ServiceUpdateInput = { ...updateServiceDto };

    if (updateServiceDto.slug !== undefined) {
      if (updateServiceDto.slug) {
        // Check if the new slug conflicts with existing services (excluding current one)
        const existingService = await this.databaseService.service.findFirst({
          where: {
            slug: updateServiceDto.slug,
            deletedAt: null,
            NOT: { id },
          },
        });

        if (existingService) {
          // Generate a unique slug based on the provided one
          data.slug = await this.generateUniqueSlug(updateServiceDto.slug);
        }
      }
      // If slug is empty string or null, allow it
    }

    return this.databaseService.service.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    // First check if service exists
    await this.findOne(id);

    // Soft delete by setting deletedAt
    return this.databaseService.service.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async restore(id: string) {
    const service = await this.databaseService.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return this.databaseService.service.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });
  }

  async toggleActiveStatus(id: string) {
    const service = await this.findOne(id);

    return this.databaseService.service.update({
      where: { id },
      data: {
        isActive: !service.isActive,
      },
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
      baseSlug = 'service';
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
   * Get all soft-deleted services with pagination and filtering
   */
  async findDeleted(params?: QueryServiceDto) {
    const paginationParams = PaginationHelper.mergeWithDefaults(params || {});
    const { page, limit, sortBy = 'deletedAt', sortOrder } = paginationParams;

    const { isActive, minPrice, maxPrice, search } = params || {};

    // Build where clause for search and filters
    const where: Prisma.ServiceWhereInput = {};

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

    // Build orderBy
    const orderBy: Prisma.ServiceOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Get total count for pagination
    const total = await this.databaseService.service.count({ where });

    // Get paginated data
    const services = await this.databaseService.service.findMany({
      where,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(
      services,
      page,
      limit,
      total,
    );
  }

  /**
   * Permanently delete a service
   */
  async hardDelete(id: string) {
    // First check if soft-deleted service exists
    const service = await this.databaseService.service.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID "${id}" not found`);
    }

    return await this.databaseService.service.delete({
      where: { id },
    });
  }

  /**
   * Check if a slug already exists
   */
  private async slugExists(slug: string): Promise<boolean> {
    const existing = await this.databaseService.service.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
    });
    return !!existing;
  }
}
