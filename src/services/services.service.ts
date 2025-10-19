import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { DatabaseService } from '../database/database.service';
import { Prisma } from 'generated/prisma';

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

  async findAll(queryDto?: QueryServiceDto) {
    const {
      q,
      isActive,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto || {};

    const where: Prisma.ServiceWhereInput = {};

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

    // If pagination is requested
    if (page && limit) {
      const skip = (page - 1) * limit;
      const [services, total] = await Promise.all([
        this.databaseService.service.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit,
        }),
        this.databaseService.service.count({ where }),
      ]);

      return {
        data: services,
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
    return this.databaseService.service.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
    });
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
