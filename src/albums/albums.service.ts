import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from '../database/database.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';

@Injectable()
export class AlbumsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createDto: CreateAlbumDto) {
    return await this.databaseService.album.create({
      data: {
        ownerUserId: createDto.ownerUserId,
        bookingId: createDto.bookingId,
        title: createDto.title,
        description: createDto.description,
        isPublic: createDto.isPublic ?? false,
        share_token: createDto.shareToken,
        expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : null,
        coverFileId: createDto.coverFileId,
      },
    });
  }

  async findAll() {
    return await this.databaseService.album.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        owner: true,
        booking: true,
        coverFile: true,
      },
    });
  }

  async findOne(id: string) {
    const album = await this.databaseService.album.findFirst({
      where: {
        id,
        deletedAt: null,
      },
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
      throw new NotFoundException(`Album with ID "${id}" not found`);
    }

    return album;
  }

  async update(id: string, updateDto: UpdateAlbumDto) {
    await this.findOne(id);

    const updateData: Prisma.AlbumUpdateInput = {};
    if (updateDto.title !== undefined) updateData.title = updateDto.title;
    if (updateDto.description !== undefined)
      updateData.description = updateDto.description;
    if (updateDto.isPublic !== undefined)
      updateData.isPublic = updateDto.isPublic;
    if (updateDto.shareToken !== undefined)
      updateData.share_token = updateDto.shareToken;
    if (updateDto.expiresAt !== undefined) {
      updateData.expiresAt = updateDto.expiresAt
        ? new Date(updateDto.expiresAt)
        : null;
    }
    if (updateDto.coverFileId !== undefined) {
      updateData.coverFile = updateDto.coverFileId
        ? { connect: { id: updateDto.coverFileId } }
        : { disconnect: true };
    }
    if (updateDto.bookingId !== undefined) {
      updateData.booking = updateDto.bookingId
        ? { connect: { id: updateDto.bookingId } }
        : { disconnect: true };
    }

    return await this.databaseService.album.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.databaseService.album.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
