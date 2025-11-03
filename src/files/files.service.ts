import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class FilesService {
  constructor(private readonly databaseService: DatabaseService) {}

  create(createFileDto: CreateFileDto) {
    return this.databaseService.file.create({
      data: createFileDto,
      include: {
        uploader: true,
      },
    });
  }

  findAll() {
    return this.databaseService.file.findMany({
      include: {
        uploader: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const file = await this.databaseService.file.findUnique({
      where: { id },
      include: {
        uploader: true,
        albums: true,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  update(id: string, updateFileDto: UpdateFileDto) {
    return this.databaseService.file.update({
      where: { id },
      data: updateFileDto,
      include: {
        uploader: true,
      },
    });
  }

  remove(id: string) {
    return this.databaseService.file.delete({ where: { id } });
  }
}
