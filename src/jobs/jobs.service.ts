import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { DatabaseService } from '../database/database.service';
import { CreateJobDto, QueryJobDto, UpdateJobDto } from './dto';

@Injectable()
export class JobsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createJobDto: CreateJobDto) {
    const data: Prisma.JobCreateInput = {
      name: createJobDto.name,
      description: createJobDto.description || null,
      isActive: createJobDto.isActive || false,
    };

    return this.databaseService.job.create({ data });
  }

  async findAll(params?: QueryJobDto) {
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder,
    } = PaginationHelper.mergeWithDefaults(params || {});
    const { isActive } = params || {};

    const where: Prisma.JobWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const orderBy: Prisma.JobOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const total = await this.databaseService.job.count({ where });
    const data = await this.databaseService.job.findMany({
      where,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(data, page, limit, total);
  }

  async findActiveJobs() {
    return this.databaseService.job.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const job = await this.databaseService.job.findFirst({
      where: { id, deletedAt: null },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }

  async update(id: string, updateJobDto: UpdateJobDto) {
    await this.findOne(id);

    const data: Prisma.JobUpdateInput = { ...updateJobDto };

    return this.databaseService.job.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.databaseService.job.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async restore(id: string) {
    const job = await this.databaseService.job.findUnique({ where: { id } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return this.databaseService.job.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async hardDelete(id: string) {
    const job = await this.databaseService.job.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID "${id}" not found`);
    }

    return this.databaseService.job.delete({ where: { id } });
  }

  async toggleActiveStatus(id: string) {
    const job = await this.findOne(id);

    return this.databaseService.job.update({
      where: { id },
      data: { isActive: !job.isActive },
    });
  }

  async findDeleted(params?: QueryJobDto) {
    const {
      page,
      limit,
      search,
      sortBy = 'deletedAt',
      sortOrder,
    } = PaginationHelper.mergeWithDefaults(params || {});
    const { isActive } = params || {};

    const where: Prisma.JobWhereInput = { deletedAt: { not: null } };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const orderBy: Prisma.JobOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const total = await this.databaseService.job.count({ where });
    const data = await this.databaseService.job.findMany({
      where,
      orderBy,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(data, page, limit, total);
  }

  async createDefaultsIfEmpty() {
    const count = await this.databaseService.job.count();
    if (count > 0) {
      return;
    }

    await this.databaseService.job.createMany({
      data: [
        {
          name: 'Lead Photographer',
          description: 'Primary photography lead for wedding day coverage',
          isActive: true,
        },
        {
          name: 'Assistant Photographer',
          description: 'Assists with coverage, lighting, and logistics',
          isActive: true,
        },
        {
          name: 'Videographer',
          description: 'Handles wedding video capture and coverage',
          isActive: true,
        },
      ],
      skipDuplicates: true,
    });
  }
}
