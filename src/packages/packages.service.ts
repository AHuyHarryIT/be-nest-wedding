import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { DatabaseService } from '../database/database.service';
import { CreatePackageDto, QueryPackageDto, UpdatePackageDto } from './dto';
import { UpdatePackageServicesDto } from './dto/update-package-services.dto';

@Injectable()
export class PackagesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private normalizeStringArray(value: unknown): string[] | undefined {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }

    if (typeof value !== 'string') {
      return undefined;
    }

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === 'string',
        );
      }
    } catch {
      return value ? [value] : undefined;
    }

    return undefined;
  }

  async create(createPackageDto: CreatePackageDto) {
    return this.createWithImages(createPackageDto);
  }

  async createWithImages(
    createPackageDto: CreatePackageDto,
    coverImage?: Express.Multer.File,
    galleryImages: Express.Multer.File[] = [],
  ) {
    const serviceIds =
      this.normalizeStringArray(createPackageDto.serviceIds) ??
      createPackageDto.serviceIds;

    let coverImageUrl: string | null = null;
    let coverImagePublicId: string | null = null;

    if (coverImage?.buffer && coverImage.originalname) {
      const coverUpload = await this.cloudinaryService.uploadImage(
        coverImage.buffer,
        coverImage.originalname,
        'wedding/packages/cover',
      );

      if (
        !coverUpload.success ||
        !coverUpload.webUrl ||
        !coverUpload.publicId
      ) {
        throw new NotFoundException(
          coverUpload.error || 'Failed to upload package cover image',
        );
      }

      coverImageUrl = coverUpload.webUrl;
      coverImagePublicId = coverUpload.publicId;
    }

    const uploadedGallery: Array<{ imageUrl: string; publicId: string }> = [];
    for (const image of galleryImages) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        image.buffer,
        image.originalname,
        'wedding/packages/gallery',
      );

      if (
        uploadResult.success &&
        uploadResult.webUrl &&
        uploadResult.publicId
      ) {
        uploadedGallery.push({
          imageUrl: uploadResult.webUrl,
          publicId: uploadResult.publicId,
        });
      }
    }

    const data: Prisma.PackageCreateInput = {
      name: createPackageDto.name,
      description: createPackageDto.description || null,
      price: createPackageDto.price || 0,
      isActive: createPackageDto.isActive ?? false,
      coverImageUrl,
      coverImagePublicId,
    };

    if (serviceIds && serviceIds.length > 0) {
      data.services = {
        create: serviceIds.map((serviceId) => ({ serviceId })),
      };
    }

    if (uploadedGallery.length > 0) {
      data.images = {
        create: uploadedGallery.map((image, index) => ({
          imageUrl: image.imageUrl,
          cloudinaryPublicId: image.publicId,
          sortOrder: index,
        })),
      };
    }

    return this.databaseService.package.create({
      data,
      include: {
        services: {
          include: { service: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
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
        {
          services: {
            some: {
              service: {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { description: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
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
    const include = {
      ...(includeServices
        ? {
            services: {
              include: {
                service: true,
              },
            },
          }
        : {}),
      images: {
        orderBy: { sortOrder: 'asc' as const },
      },
    };

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
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!packageItem) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }

    return packageItem;
  }

  async update(id: string, updatePackageDto: UpdatePackageDto) {
    return this.updateWithImages(id, updatePackageDto);
  }

  async updateWithImages(
    id: string,
    updatePackageDto: UpdatePackageDto,
    coverImage?: Express.Multer.File,
    galleryImages: Express.Multer.File[] = [],
  ) {
    // First check if package exists
    const existingPackage = await this.findOne(id);

    // Separate serviceIds from other update data
    const { serviceIds, galleryOrder, ...updateData } = updatePackageDto;
    const normalizedServiceIds =
      this.normalizeStringArray(serviceIds) ?? serviceIds;
    const normalizedGalleryOrder =
      this.normalizeStringArray(galleryOrder) ?? galleryOrder;

    const data: Prisma.PackageUpdateInput = { ...updateData };

    if (coverImage?.buffer && coverImage.originalname) {
      const coverUpload = await this.cloudinaryService.uploadImage(
        coverImage.buffer,
        coverImage.originalname,
        'wedding/packages/cover',
      );

      if (
        !coverUpload.success ||
        !coverUpload.webUrl ||
        !coverUpload.publicId
      ) {
        throw new NotFoundException(
          coverUpload.error || 'Failed to upload package cover image',
        );
      }

      if (existingPackage.coverImagePublicId) {
        await this.cloudinaryService.deleteImage(
          existingPackage.coverImagePublicId,
        );
      }

      data.coverImageUrl = coverUpload.webUrl;
      data.coverImagePublicId = coverUpload.publicId;
    }

    // Handle service associations if provided
    if (normalizedServiceIds !== undefined) {
      // Delete existing service associations
      await this.databaseService.packageService.deleteMany({
        where: { packageId: id },
      });

      // Create new associations if serviceIds is not empty
      if (normalizedServiceIds.length > 0) {
        await this.databaseService.packageService.createMany({
          data: normalizedServiceIds.map((serviceId) => ({
            packageId: id,
            serviceId,
          })),
        });
      }
    }

    if (galleryImages.length > 0) {
      const lastImage = await this.databaseService.packageImage.findFirst({
        where: { packageId: id },
        orderBy: { sortOrder: 'desc' },
      });
      let nextSortOrder = (lastImage?.sortOrder ?? -1) + 1;

      for (const image of galleryImages) {
        const uploadResult = await this.cloudinaryService.uploadImage(
          image.buffer,
          image.originalname,
          'wedding/packages/gallery',
        );

        if (
          uploadResult.success &&
          uploadResult.webUrl &&
          uploadResult.publicId
        ) {
          await this.databaseService.packageImage.create({
            data: {
              packageId: id,
              imageUrl: uploadResult.webUrl,
              cloudinaryPublicId: uploadResult.publicId,
              sortOrder: nextSortOrder,
            },
          });
          nextSortOrder += 1;
        }
      }
    }

    if (normalizedGalleryOrder && normalizedGalleryOrder.length > 0) {
      const existingImages = await this.databaseService.packageImage.findMany({
        where: { packageId: id },
      });

      const validOrderIds = normalizedGalleryOrder.filter((imageId) =>
        existingImages.some((image) => image.id === imageId),
      );

      if (validOrderIds.length > 0) {
        await this.databaseService.$transaction(
          validOrderIds.map((imageId, index) =>
            this.databaseService.packageImage.update({
              where: { id: imageId },
              data: { sortOrder: index },
            }),
          ),
        );
      }
    }

    return this.databaseService.package.update({
      where: { id },
      data,
      include: {
        services: {
          include: { service: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
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

  async deactivate(id: string) {
    await this.findOne(id);

    return this.databaseService.package.update({
      where: { id },
      data: {
        isActive: false,
      },
      include: {
        services: {
          include: { service: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
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
    const include = {
      ...(includeServices
        ? {
            services: {
              include: {
                service: true,
              },
            },
          }
        : {}),
      images: {
        orderBy: { sortOrder: 'asc' as const },
      },
    };

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

    if (packageItem.coverImagePublicId) {
      await this.cloudinaryService.deleteImage(packageItem.coverImagePublicId);
    }

    const packageImages = await this.databaseService.packageImage.findMany({
      where: { packageId: id },
      select: { cloudinaryPublicId: true },
    });

    for (const image of packageImages) {
      await this.cloudinaryService.deleteImage(image.cloudinaryPublicId);
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
        images: {
          orderBy: { sortOrder: 'asc' },
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
          images: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });
  }
}
