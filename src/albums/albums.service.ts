import { Injectable } from '@nestjs/common';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AlbumsService {
  constructor(private readonly databaseService: DatabaseService) {}

  create(createAlbumDto: CreateAlbumDto) {
    const data: any = { ...createAlbumDto };
    if (createAlbumDto.expiresAt) {
      data.expiresAt = new Date(createAlbumDto.expiresAt);
    }
    return this.databaseService.album.create({
      data,
      include: {
        owner: true,
        booking: true,
        coverFile: true,
      },
    });
  }

  findAll() {
    return this.databaseService.album.findMany({
      include: {
        owner: true,
        booking: true,
        coverFile: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const album = await this.databaseService.album.findUnique({
      where: { id },
      include: {
        owner: true,
        booking: true,
        coverFile: true,
        files: {
          include: {
            file: true,
          },
        },
      },
    });

    if (!album) {
      throw new Error('Album not found');
    }

    return album;
  }

  update(id: string, updateAlbumDto: UpdateAlbumDto) {
    const data: any = { ...updateAlbumDto };
    if (updateAlbumDto.expiresAt) {
      data.expiresAt = new Date(updateAlbumDto.expiresAt);
    }
    return this.databaseService.album.update({
      where: { id },
      data,
      include: {
        owner: true,
        booking: true,
        coverFile: true,
      },
    });
  }

  remove(id: string) {
    return this.databaseService.album.delete({ where: { id } });
  }
}
