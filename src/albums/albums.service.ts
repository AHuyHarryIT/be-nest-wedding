import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import { OneDriveService } from '../storage/onedrive.service';
import { PaginationHelper } from '../common/utils/pagination.helper';
import {
  CreateAlbumDto,
  UpdateAlbumDto,
  AddFilesToAlbumDto,
  RemoveFilesFromAlbumDto,
  GenerateShareTokenDto,
  QueryAlbumDto,
} from './dto';

@Injectable()
export class AlbumsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly oneDriveService: OneDriveService,
  ) {}

  async create(createAlbumDto: CreateAlbumDto) {
    // Validate owner exists if provided
    if (createAlbumDto.ownerUserId) {
      const owner = await this.databaseService.user.findUnique({
        where: { id: createAlbumDto.ownerUserId },
      });
      if (!owner) {
        throw new NotFoundException(
          `Owner with ID ${createAlbumDto.ownerUserId} not found`,
        );
      }
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

    // Create OneDrive folder for the album - ID will be the folder ID
    let albumId: string;

    try {
      // Sanitize album title for folder name (remove special characters)
      const folderName = createAlbumDto.title
        .replace(/[^a-zA-Z0-9\s-_]/g, '')
        .trim()
        .replace(/\s+/g, '_');

      const timestamp = Date.now();
      const uniqueFolderName = `${folderName}_${timestamp}`;

      // Create folder in OneDrive under Albums directory
      const folderResult = await this.oneDriveService.createFolder(
        uniqueFolderName,
        'Albums',
      );

      albumId = folderResult.id;
    } catch (error) {
      throw new BadRequestException(
        `Failed to create OneDrive folder for album: ${(error as Error).message}`,
      );
    }

    const data: Prisma.AlbumCreateInput = {
      id: albumId, // Use OneDrive folder ID as album ID
      title: createAlbumDto.title,
      description: createAlbumDto.description,
      isPublic: createAlbumDto.isPublic ?? false,
      share_token: createAlbumDto.share_token,
      expiresAt: createAlbumDto.expiresAt
        ? new Date(createAlbumDto.expiresAt)
        : null,
    };

    if (createAlbumDto.ownerUserId) {
      data.owner = { connect: { id: createAlbumDto.ownerUserId } };
    }

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

  async findAll(params?: QueryAlbumDto) {
    const { page, limit, search, sortBy, sortOrder } =
      PaginationHelper.mergeWithDefaults(params || {});

    const where: Prisma.AlbumWhereInput = { deletedAt: null };

    // Search by title or description
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by owner
    if (params?.ownerId) {
      where.ownerUserId = params.ownerId;
    }

    // Filter by booking
    if (params?.bookingId) {
      where.bookingId = params.bookingId;
    }

    // Filter by public/private
    if (params?.isPublic !== undefined) {
      where.isPublic = params.isPublic === 'true';
    }

    // Build orderBy clause
    const orderBy: Prisma.AlbumOrderByWithRelationInput = {
      [sortBy || 'createdAt']: sortOrder,
    };

    // Get total count
    const total = await this.databaseService.album.count({ where });

    // Get paginated data
    const skip = (page - 1) * limit;
    const data = await this.databaseService.album.findMany({
      where,
      include: {
        owner: true,
        booking: true,
        coverFile: true,
        _count: { select: { files: true } },
      },
      orderBy,
      skip,
      take: limit,
    });

    return PaginationHelper.createPaginatedResponse(data, page, limit, total);
  }

  async findPublic() {
    return this.databaseService.album.findMany({
      where: { isPublic: true, deletedAt: null },
      include: { owner: true, coverFile: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByShareToken(token: string) {
    const album = await this.databaseService.album.findFirst({
      where: {
        share_token: token,
        deletedAt: null,
      },
      include: {
        owner: true,
        booking: true,
        coverFile: true,
        files: { include: { file: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!album) {
      throw new NotFoundException('Album not found or link expired');
    }

    // Check if share token is expired
    if (album.expiresAt && new Date(album.expiresAt) < new Date()) {
      throw new BadRequestException('Share link has expired');
    }

    return album;
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

    // Get OneDrive folder URL dynamically
    let oneDriveFolderUrl: string | null = null;
    try {
      oneDriveFolderUrl = await this.oneDriveService.getFolderUrl(id);
    } catch (error) {
      console.warn(
        `Failed to fetch OneDrive folder URL for album ${id}:`,
        (error as Error).message,
      );
    }

    return {
      ...album,
      oneDriveFolderUrl,
    };
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
    // Delete OneDrive folder (album ID is the folder ID)
    try {
      await this.oneDriveService.deleteFile(id);
    } catch (error) {
      console.warn(
        `Failed to delete OneDrive folder for album ${id}:`,
        (error as Error).message,
      );
      // Continue with soft delete even if OneDrive deletion fails
    }

    return this.databaseService.album.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addFiles(id: string, addFilesDto: AddFilesToAlbumDto) {
    await this.findOne(id);

    // Validate all files exist
    for (const fileData of addFilesDto.files) {
      const file = await this.databaseService.file.findFirst({
        where: { id: fileData.fileId, deletedAt: null },
      });
      if (!file) {
        throw new NotFoundException(
          `File with ID ${fileData.fileId} not found`,
        );
      }
    }

    // Add files to album
    const albumFiles = await Promise.all(
      addFilesDto.files.map((fileData) =>
        this.databaseService.albumFile.upsert({
          where: {
            albumId_fileId: {
              albumId: id,
              fileId: fileData.fileId,
            },
          },
          create: {
            albumId: id,
            fileId: fileData.fileId,
            sortOrder: fileData.sortOrder ?? 0,
            caption: fileData.caption,
          },
          update: {
            sortOrder: fileData.sortOrder ?? 0,
            caption: fileData.caption,
          },
        }),
      ),
    );

    return {
      message: `${albumFiles.length} file(s) added to album`,
      albumFiles,
    };
  }

  async removeFiles(id: string, removeFilesDto: RemoveFilesFromAlbumDto) {
    await this.findOne(id);

    const deleted = await this.databaseService.albumFile.deleteMany({
      where: {
        albumId: id,
        fileId: { in: removeFilesDto.fileIds },
      },
    });

    return {
      message: `${deleted.count} file(s) removed from album`,
      count: deleted.count,
    };
  }

  async generateShareToken(
    id: string,
    generateShareTokenDto: GenerateShareTokenDto,
  ) {
    await this.findOne(id);

    // Generate random share token
    const token = crypto.randomBytes(16).toString('hex');

    const album = await this.databaseService.album.update({
      where: { id },
      data: {
        share_token: token,
        expiresAt: generateShareTokenDto.expiresAt
          ? new Date(generateShareTokenDto.expiresAt)
          : null,
      },
      include: { owner: true, booking: true, coverFile: true },
    });

    return {
      message: 'Share token generated successfully',
      shareToken: token,
      shareUrl: `${process.env.APP_URL || 'http://localhost:3000'}/albums/share/${token}`,
      expiresAt: album.expiresAt,
    };
  }

  async revokeShareToken(id: string) {
    await this.findOne(id);

    await this.databaseService.album.update({
      where: { id },
      data: {
        share_token: null,
        expiresAt: null,
      },
    });

    return {
      message: 'Share token revoked successfully',
    };
  }
}
