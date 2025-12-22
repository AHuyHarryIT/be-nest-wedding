import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from '../database/database.service';
import { CreateAlbumDto, UpdateAlbumDto } from './dto';

@Injectable()
export class AlbumsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createAlbumDto: CreateAlbumDto) {
    // Validate owner exists
    const owner = await this.databaseService.user.findUnique({
      where: { id: createAlbumDto.ownerUserId },
    });
    if (!owner) {
      throw new NotFoundException(
        `Owner with ID ${createAlbumDto.ownerUserId} not found`,
      );
    }

    // Validate booking exists if provided
    if (createAlbumDto.bookingId) {
      const booking = await this.databaseService.booking.findFirst({
        where: { id: createAlbumDto.bookingId, deletedAt: null },
      });
      if (!booking) {
        throw new NotFoundException(
          `Booking with ID ${createAlbumDto.bookingId} not found`,
        );
      }
    }

    // Validate cover file exists if provided
    if (createAlbumDto.coverFileId) {
      const coverFile = await this.databaseService.file.findFirst({
        where: { id: createAlbumDto.coverFileId, deletedAt: null },
      });
      if (!coverFile) {
        throw new NotFoundException(
          `Cover file with ID ${createAlbumDto.coverFileId} not found`,
        );
      }
    }

    const data: Prisma.AlbumCreateInput = {
      owner: { connect: { id: createAlbumDto.ownerUserId } },
      title: createAlbumDto.title,
      description: createAlbumDto.description,
      isPublic: createAlbumDto.isPublic ?? false,
      share_token: createAlbumDto.share_token,
      expiresAt: createAlbumDto.expiresAt
        ? new Date(createAlbumDto.expiresAt)
        : null,
    };

    if (createAlbumDto.bookingId) {
      data.booking = { connect: { id: createAlbumDto.bookingId } };
    }

    if (createAlbumDto.coverFileId) {
      data.coverFile = { connect: { id: createAlbumDto.coverFileId } };
    }

    return this.databaseService.album.create({
      data,
      include: { owner: true, booking: true, coverFile: true },
    });
  }

  async findAll() {
    return this.databaseService.album.findMany({
      where: { deletedAt: null },
      include: { owner: true, booking: true, coverFile: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const album = await this.databaseService.album.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: true,
        booking: true,
        coverFile: true,
        files: { include: { file: true } },
      },
    });

    if (!album) {
      throw new NotFoundException(`Album with ID ${id} not found`);
    }

    return album;
  }

  async update(id: string, updateAlbumDto: UpdateAlbumDto) {
    await this.findOne(id);

    const data: Prisma.AlbumUpdateInput = {};
    if (updateAlbumDto.ownerUserId)
      data.owner = { connect: { id: updateAlbumDto.ownerUserId } };
    if (updateAlbumDto.bookingId !== undefined) {
      data.booking = updateAlbumDto.bookingId
        ? { connect: { id: updateAlbumDto.bookingId } }
        : { disconnect: true };
    }
    if (updateAlbumDto.title) data.title = updateAlbumDto.title;
    if (updateAlbumDto.description !== undefined)
      data.description = updateAlbumDto.description;
    if (updateAlbumDto.isPublic !== undefined)
      data.isPublic = updateAlbumDto.isPublic;
    if (updateAlbumDto.share_token !== undefined)
      data.share_token = updateAlbumDto.share_token;
    if (updateAlbumDto.expiresAt !== undefined) {
      data.expiresAt = updateAlbumDto.expiresAt
        ? new Date(updateAlbumDto.expiresAt)
        : null;
    }
    if (updateAlbumDto.coverFileId !== undefined) {
      data.coverFile = updateAlbumDto.coverFileId
        ? { connect: { id: updateAlbumDto.coverFileId } }
        : { disconnect: true };
    }

    return this.databaseService.album.update({
      where: { id },
      data,
      include: { owner: true, booking: true, coverFile: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.databaseService.album.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
