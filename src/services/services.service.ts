import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { DatabaseService } from '../database/database.service';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { CreateServiceDto, QueryServiceDto, UpdateServiceDto } from './dto';

@Injectable()
export class ServicesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createServiceDto: CreateServiceDto) {
    // Set default values if not provided
    const data: Prisma.ServiceCreateInput = {
      name: createServiceDto.name,
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
      search,
      sortBy = 'createdAt',
      sortOrder,
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
    const data = await this.databaseService.service.findMany({
      where,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(data, page, limit, total);
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

    // Handle updates
    const data: Prisma.ServiceUpdateInput = { ...updateServiceDto };

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
   * Get all soft-deleted services with pagination and filtering
   */
  async findDeleted(params?: QueryServiceDto) {
    const {
      page,
      limit,
      search,
      sortBy = 'deletedAt',
      sortOrder,
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

    // Only include soft-deleted records
    where.deletedAt = { not: null };

    // Build orderBy
    const orderBy: Prisma.ServiceOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Get total count for pagination
    const total = await this.databaseService.service.count({ where });

    // Get paginated data
    const data = await this.databaseService.service.findMany({
      where,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(data, page, limit, total);
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
   * Upload and update service image
   * @param id Service ID
   * @param imageBuffer Image file buffer
   * @param fileName Original filename
   */
  async uploadServiceImage(id: string, imageBuffer: Buffer, fileName: string) {
    // Verify service exists
    const service = await this.findOne(id);

    // Delete old image if it exists
    if (service.cloudinaryPublicId) {
      await this.cloudinaryService.deleteImage(service.cloudinaryPublicId);
    }

    // Upload new image to Cloudinary
    const uploadResult = await this.cloudinaryService.uploadImage(
      imageBuffer,
      fileName,
      'wedding/services',
    );

    if (!uploadResult.success) {
      throw new BadRequestException(
        `Failed to upload image: ${uploadResult.error}`,
      );
    }

    // Update service with new image details
    return this.databaseService.service.update({
      where: { id },
      data: {
        imageUrl: uploadResult.webUrl,
        cloudinaryPublicId: uploadResult.publicId,
      },
    });
  }

  /**
   * Delete service image
   * @param id Service ID
   */
  async deleteServiceImage(id: string) {
    const service = await this.findOne(id);

    if (!service.cloudinaryPublicId) {
      throw new BadRequestException('Service has no image to delete');
    }

    // Delete from Cloudinary
    await this.cloudinaryService.deleteImage(service.cloudinaryPublicId);

    // Update service to remove image references
    return this.databaseService.service.update({
      where: { id },
      data: {
        imageUrl: null,
        cloudinaryPublicId: null,
      },
    });
  }

  /**
   * Create service with optional image upload
   * @param createServiceDto Service data
   * @param imageBuffer Optional image buffer
   * @param fileName Optional image filename
   */
  async createWithImage(
    createServiceDto: CreateServiceDto,
    imageBuffer?: Buffer,
    fileName?: string,
  ) {
    // Set default values if not provided
    const data: Prisma.ServiceCreateInput = {
      name: createServiceDto.name,
      description: createServiceDto.description || null,
      price: createServiceDto.price || 0,
      isActive: createServiceDto.isActive || false,
    };

    let createdService = await this.databaseService.service.create({
      data,
    });

    // If image provided, upload it
    if (imageBuffer && fileName) {
      createdService = await this.uploadServiceImage(
        createdService.id,
        imageBuffer,
        fileName,
      );
    }

    return createdService;
  }

  /**
   * Update service with optional image replacement
   * @param id Service ID
   * @param updateServiceDto Service data to update
   * @param imageBuffer Optional image buffer for replacement
   * @param fileName Optional image filename
   */
  async updateWithImage(
    id: string,
    updateServiceDto: UpdateServiceDto,
    imageBuffer?: Buffer,
    fileName?: string,
  ) {
    // First check if service exists
    await this.findOne(id);

    // Handle updates
    const data: Prisma.ServiceUpdateInput = { ...updateServiceDto };

    let updatedService = await this.databaseService.service.update({
      where: { id },
      data,
    });

    // If new image provided, upload it
    if (imageBuffer && fileName) {
      updatedService = await this.uploadServiceImage(id, imageBuffer, fileName);
    }

    return updatedService;
  }
}
