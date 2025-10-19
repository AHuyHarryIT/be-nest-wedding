import { Injectable } from '@nestjs/common';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { UpdatePackageServicesDto } from './dto/update-package-services.dto';
import { DatabaseService } from '../database/database.service';
import { Prisma } from 'generated/prisma';

@Injectable()
export class PackagesService {
  constructor(private readonly databaseService: DatabaseService) {}

  create(createPackageDto: CreatePackageDto) {
    return this.databaseService.package.create({ data: createPackageDto });
  }

  findAll(
    q?: string,
    isActive?: boolean,
    minPrice?: number,
    maxPrice?: number,
  ) {
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

    return this.databaseService.package.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.databaseService.package.findUnique({
      where: { id },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });
  }

  update(id: string, updatePackageDto: UpdatePackageDto) {
    return this.databaseService.package.update({
      where: { id },
      data: updatePackageDto,
    });
  }

  remove(id: string) {
    return this.databaseService.package.delete({ where: { id } });
  }

  async getPackageServices(id: string) {
    const packageWithServices = await this.databaseService.package.findUnique({
      where: { id },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!packageWithServices) {
      return null;
    }

    return packageWithServices.services.map((ps) => ps.service);
  }

  async updatePackageServices(
    id: string,
    updatePackageServicesDto: UpdatePackageServicesDto,
  ) {
    // First, remove all existing services
    await this.databaseService.packageService.deleteMany({
      where: { packageId: id },
    });

    // Then add new services
    const packageServices = updatePackageServicesDto.serviceIds.map(
      (serviceId) => ({
        packageId: id,
        serviceId: serviceId,
      }),
    );

    await this.databaseService.packageService.createMany({
      data: packageServices,
    });

    return this.getPackageServices(id);
  }
}
