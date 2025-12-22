import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VisibilityLevel } from 'generated/prisma';
import { DatabaseService } from '../database/database.service';
import { CreateFileDto, UpdateFileDto } from './dto';

@Injectable()
export class FilesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createFileDto: CreateFileDto) {
    // Validate uploader exists
    const uploader = await this.databaseService.user.findUnique({
      where: { id: createFileDto.uploaderId },
    });
    if (!uploader) {
      throw new NotFoundException(
        `Uploader with ID ${createFileDto.uploaderId} not found`,
      );
    }

    const data: Prisma.FileCreateInput = {
      uploader: { connect: { id: createFileDto.uploaderId } },
      storageKey: createFileDto.storageKey,
      storageUrl: createFileDto.storageUrl,
      mimeType: createFileDto.mimeType,
      byteSize: createFileDto.byteSize,
      width: createFileDto.width,
      height: createFileDto.height,
      checksum: createFileDto.checksum,
      usageType: createFileDto.usageType,
      visibility: createFileDto.visibility ?? VisibilityLevel.PRIVATE,
    };

    return this.databaseService.file.create({
      data,
      include: { uploader: true },
    });
  }

  async findAll() {
    return this.databaseService.file.findMany({
      where: { deletedAt: null },
      include: { uploader: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const file = await this.databaseService.file.findFirst({
      where: { id, deletedAt: null },
      include: { uploader: true, albums: true },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    return file;
  }

  async update(id: string, updateFileDto: UpdateFileDto) {
    await this.findOne(id);

    const data: Prisma.FileUpdateInput = {};
    if (updateFileDto.uploaderId)
      data.uploader = { connect: { id: updateFileDto.uploaderId } };
    if (updateFileDto.storageKey) data.storageKey = updateFileDto.storageKey;
    if (updateFileDto.storageUrl) data.storageUrl = updateFileDto.storageUrl;
    if (updateFileDto.mimeType) data.mimeType = updateFileDto.mimeType;
    if (updateFileDto.byteSize !== undefined)
      data.byteSize = updateFileDto.byteSize;
    if (updateFileDto.width !== undefined) data.width = updateFileDto.width;
    if (updateFileDto.height !== undefined) data.height = updateFileDto.height;
    if (updateFileDto.checksum !== undefined)
      data.checksum = updateFileDto.checksum;
    if (updateFileDto.usageType) data.usageType = updateFileDto.usageType;
    if (updateFileDto.visibility) data.visibility = updateFileDto.visibility;

    return this.databaseService.file.update({
      where: { id },
      data,
      include: { uploader: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.databaseService.file.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
