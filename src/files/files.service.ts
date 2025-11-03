import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from '../database/database.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';

@Injectable()
export class FilesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createDto: CreateFileDto) {
    return await this.databaseService.file.create({
      data: {
        uploaderId: createDto.uploaderId,
        storageKey: createDto.storageKey,
        storageUrl: createDto.storageUrl,
        mimeType: createDto.mimeType,
        byteSize: createDto.byteSize,
        width: createDto.width,
        height: createDto.height,
        checksum: createDto.checksum,
        usageType: createDto.usageType,
        visibility: createDto.visibility || 'PRIVATE',
      },
    });
  }

  async findAll() {
    return await this.databaseService.file.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        uploader: true,
      },
    });
  }

  async findOne(id: string) {
    const file = await this.databaseService.file.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        uploader: true,
      },
    });

    if (!file) {
      throw new NotFoundException(`File with ID "${id}" not found`);
    }

    return file;
  }

  async update(id: string, updateDto: UpdateFileDto) {
    await this.findOne(id);

    const updateData: Prisma.FileUpdateInput = {};
    if (updateDto.visibility !== undefined)
      updateData.visibility = updateDto.visibility;
    if (updateDto.usageType !== undefined)
      updateData.usageType = updateDto.usageType;

    return await this.databaseService.file.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.databaseService.file.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
