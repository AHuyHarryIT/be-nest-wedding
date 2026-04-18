import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import archiver from 'archiver';
import * as crypto from 'crypto';
import { Prisma, VisibilityLevel } from 'generated/prisma';
import sharp, { Metadata } from 'sharp';
import { PassThrough, Readable } from 'stream';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { DatabaseService } from '../database/database.service';
import { OneDriveService } from '../storage/onedrive.service';
import { GenericRecord } from '../common/types';
import {
  AddFilesToAlbumDto,
  CreateAlbumDto,
  GenerateShareTokenDto,
  QueryAlbumDto,
  RemoveFilesFromAlbumDto,
  UpdateAlbumDto,
  CustomerAlbumSortBy,
  QueryCustomerAlbumsDto,
  UploadImageToAlbumDto,
} from './dto';

const DENIAL_MESSAGE = 'Album not found or you do not have access.';

const albumOwnerSelect = {
  id: true,
  phoneNumber: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StaffSelect;

@Injectable()
export class AlbumsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly oneDriveService: OneDriveService,
  ) {}

  async create(createAlbumDto: CreateAlbumDto) {
    // Validate owner exists if provided
    if (createAlbumDto.ownerUserId) {
      const owner = await this.databaseService.staff.findUnique({
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
      share_token: createAlbumDto.shareToken,
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
      include: {
        owner: { select: albumOwnerSelect },
        booking: true,
        coverFile: true,
      },
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
      where.ownerStaffId = params.ownerId;
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
        owner: { select: albumOwnerSelect },
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
      include: {
        owner: { select: albumOwnerSelect },
        coverFile: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCustomerPrivateAlbums(
    customerId: string,
    params?: QueryCustomerAlbumsDto,
  ) {
    const { page, limit, search, sortBy, sortOrder } =
      PaginationHelper.mergeWithDefaults(params || {});

    const where: Prisma.AlbumWhereInput = {
      deletedAt: null,
      isPublic: false,
      booking: {
        customerId,
        deletedAt: null,
      },
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (params?.bookingId) {
      where.bookingId = params.bookingId;
    }

    const allowedSortBy = new Set<string>(Object.values(CustomerAlbumSortBy));
    const normalizedSortBy =
      sortBy && allowedSortBy.has(sortBy)
        ? (sortBy as CustomerAlbumSortBy)
        : CustomerAlbumSortBy.CREATED_AT;

    const orderBy: Prisma.AlbumOrderByWithRelationInput =
      normalizedSortBy === CustomerAlbumSortBy.EVENT_DATE
        ? { booking: { eventDate: sortOrder } }
        : { [normalizedSortBy]: sortOrder };

    const total = await this.databaseService.album.count({ where });
    const skip = (page - 1) * limit;

    const albums = await this.databaseService.album.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            eventDate: true,
          },
        },
        coverFile: {
          select: {
            id: true,
            name: true,
            mimeType: true,
            byteSize: true,
          },
        },
        _count: {
          select: { files: true },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    const data = albums.map((album) => ({
      id: album.id,
      title: album.title,
      bookingId: album.booking?.id ?? null,
      eventDate: album.booking?.eventDate?.toISOString() ?? null,
      deliveredAssetCount: album._count.files,
      coverFile: album.coverFile,
    }));

    return PaginationHelper.createPaginatedResponse(data, page, limit, total);
  }

  private async assertCustomerAlbumAccess(
    customerId: string,
    albumId: string,
  ): Promise<{ id: string; title: string; bookingId: string | null }> {
    const album = await this.databaseService.album.findFirst({
      where: {
        id: albumId,
        deletedAt: null,
        isPublic: false,
        booking: {
          is: {
            customerId,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        title: true,
        bookingId: true,
      },
    });

    if (!album) {
      throw new ForbiddenException(DENIAL_MESSAGE);
    }

    return album;
  }

  async findCustomerPrivateAlbumAssets(customerId: string, albumId: string) {
    await this.assertCustomerAlbumAccess(customerId, albumId);

    const albumFiles = await this.databaseService.albumFile.findMany({
      where: {
        albumId,
        file: {
          deletedAt: null,
        },
      },
      select: {
        file: {
          select: {
            id: true,
            name: true,
            mimeType: true,
            byteSize: true,
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return albumFiles.map((entry) => entry.file);
  }

  private sanitizeZipName(value: string): string {
    const sanitized = value
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return sanitized || 'private-album';
  }

  async getCustomerAlbumZipStream(
    customerId: string,
    albumId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; fileName: string }> {
    const album = await this.assertCustomerAlbumAccess(customerId, albumId);

    const albumFiles = await this.databaseService.albumFile.findMany({
      where: {
        albumId,
        file: {
          deletedAt: null,
        },
      },
      select: {
        file: {
          select: {
            id: true,
            name: true,
            storageKey: true,
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    const output = new PassThrough();
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.on('warning', (error: Error & { code?: string }) => {
      if (error.code !== 'ENOENT') {
        output.destroy(error);
      }
    });

    archive.on('error', (error: Error) => {
      output.destroy(error);
    });

    archive.pipe(output);

    const usedNames = new Set<string>();

    for (const albumFile of albumFiles) {
      const oneDriveStream = await this.oneDriveService.getFileStream(
        albumFile.file.storageKey,
      );

      const baseName = this.sanitizeZipName(
        albumFile.file.name || `asset-${albumFile.file.id}`,
      );

      let entryName = baseName;
      let duplicateCounter = 1;
      while (usedNames.has(entryName)) {
        entryName = `${baseName}-${duplicateCounter}`;
        duplicateCounter += 1;
      }
      usedNames.add(entryName);

      archive.append(oneDriveStream as Readable, {
        name: entryName,
      });
    }

    void archive.finalize();

    return {
      stream: output,
      fileName: `${this.sanitizeZipName(album.title)}.zip`,
    };
  }

  async findByShareToken(token: string) {
    const album = await this.databaseService.album.findFirst({
      where: {
        share_token: token,
        deletedAt: null,
      },
      include: {
        owner: { select: albumOwnerSelect },
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
        owner: { select: albumOwnerSelect },
        booking: true,
        coverFile: true,
        files: {
          include: { file: true },
          where: { file: { deletedAt: null } },
        },
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

    // Transform files to have 'image' property instead of 'file'
    const transformedFiles = album.files.map((albumFile) => ({
      albumId: albumFile.albumId,
      fileId: albumFile.fileId,
      sortOrder: albumFile.sortOrder,
      caption: albumFile.caption,
      image: albumFile.file,
    }));

    return {
      ...album,
      files: transformedFiles,
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
    if (updateAlbumDto.shareToken !== undefined)
      data.share_token = updateAlbumDto.shareToken;
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
      include: {
        owner: { select: albumOwnerSelect },
        booking: true,
        coverFile: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.databaseService.album.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findDeleted(params?: QueryAlbumDto) {
    const { page, limit, search, sortBy, sortOrder } =
      PaginationHelper.mergeWithDefaults(params || {});

    const where: Prisma.AlbumWhereInput = { deletedAt: { not: null } };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (params?.ownerId) {
      where.ownerStaffId = params.ownerId;
    }

    if (params?.bookingId) {
      where.bookingId = params.bookingId;
    }

    const orderBy: Prisma.AlbumOrderByWithRelationInput = {
      [sortBy || 'deletedAt']: sortOrder,
    };

    const total = await this.databaseService.album.count({ where });
    const skip = (page - 1) * limit;
    const data = await this.databaseService.album.findMany({
      where,
      include: {
        owner: { select: albumOwnerSelect },
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

  async restore(id: string) {
    const album = await this.databaseService.album.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!album) {
      throw new NotFoundException(`Deleted album with ID ${id} not found`);
    }

    return this.databaseService.album.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        owner: { select: albumOwnerSelect },
        booking: true,
        coverFile: true,
      },
    });
  }

  async forceDelete(id: string) {
    const album = await this.databaseService.album.findFirst({
      where: { id, deletedAt: { not: null } },
      include: {
        files: { include: { file: true } },
      },
    });

    if (!album) {
      throw new NotFoundException(`Deleted album with ID ${id} not found`);
    }

    // Delete OneDrive folder by path (album ID is the folder name under Albums/)
    // Deleting the folder removes all files inside it
    try {
      await this.oneDriveService.deleteFolderByPath(id);
    } catch (error) {
      console.warn(
        `Failed to delete OneDrive folder for album ${id}:`,
        (error as Error).message,
      );
    }

    // Delete AlbumFile junction records
    await this.databaseService.albumFile.deleteMany({
      where: { albumId: id },
    });

    // Hard delete File records
    const fileIds = album.files.map((af) => af.fileId);
    if (fileIds.length > 0) {
      await this.databaseService.file.deleteMany({
        where: { id: { in: fileIds } },
      });
    }

    // Hard delete Album record
    await this.databaseService.album.delete({
      where: { id },
    });

    return {
      message: `Album permanently deleted (${album.files.length} file(s) removed)`,
    };
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

    // Soft-delete File records (set deletedAt) — AlbumFile links are kept for restore
    const softDeleted = await this.databaseService.file.updateMany({
      where: {
        id: { in: removeFilesDto.fileIds },
        albums: { some: { albumId: id } },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    return {
      message: `${softDeleted.count} file(s) moved to trash`,
      count: softDeleted.count,
    };
  }

  async getDeletedFiles(albumId: string) {
    await this.findOne(albumId);

    const albumFiles = await this.databaseService.albumFile.findMany({
      where: {
        albumId,
        file: { deletedAt: { not: null } },
      },
      include: { file: true },
      orderBy: { file: { deletedAt: 'desc' } },
    });

    return albumFiles.map((af) => ({
      albumId: af.albumId,
      fileId: af.fileId,
      sortOrder: af.sortOrder,
      caption: af.caption,
      image: af.file,
    }));
  }

  async restoreFiles(id: string, removeFilesDto: RemoveFilesFromAlbumDto) {
    await this.findOne(id);

    const restored = await this.databaseService.file.updateMany({
      where: {
        id: { in: removeFilesDto.fileIds },
        albums: { some: { albumId: id } },
        deletedAt: { not: null },
      },
      data: { deletedAt: null },
    });

    return {
      message: `${restored.count} file(s) restored`,
      count: restored.count,
    };
  }

  async forceDeleteFiles(id: string, removeFilesDto: RemoveFilesFromAlbumDto) {
    await this.findOne(id);

    // Get files with their storageKeys for OneDrive deletion
    const files = await this.databaseService.file.findMany({
      where: {
        id: { in: removeFilesDto.fileIds },
        albums: { some: { albumId: id } },
      },
    });

    // Delete from OneDrive
    let oneDriveDeleted = 0;
    for (const file of files) {
      try {
        await this.oneDriveService.deleteFile(file.storageKey);
        oneDriveDeleted++;
      } catch (error) {
        console.warn(
          `Failed to delete file ${file.id} from OneDrive:`,
          (error as Error).message,
        );
      }
    }

    // Delete AlbumFile junction records
    await this.databaseService.albumFile.deleteMany({
      where: {
        albumId: id,
        fileId: { in: removeFilesDto.fileIds },
      },
    });

    // Hard delete File records
    const hardDeleted = await this.databaseService.file.deleteMany({
      where: {
        id: { in: removeFilesDto.fileIds },
      },
    });

    return {
      message: `${hardDeleted.count} file(s) permanently deleted (${oneDriveDeleted} from OneDrive)`,
      count: hardDeleted.count,
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

  async uploadImageToAlbum(
    albumId: string,
    file: Express.Multer.File,
    uploadImageDto: UploadImageToAlbumDto,
    userId: string,
  ) {
    return this.uploadImagesToAlbum(albumId, [file], uploadImageDto, userId);
  }

  async uploadImagesToAlbum(
    albumId: string,
    files: Express.Multer.File[],
    uploadImageDto: UploadImageToAlbumDto,
    userId: string,
  ) {
    // Verify album exists
    try {
      await this.findOne(albumId);
    } catch (error) {
      console.error(`[uploadImagesToAlbum] Album not found: ${albumId}`, error);
      throw error;
    }

    // Upload all files

    const uploadedFiles: GenericRecord[] = [];
    for (const file of files) {
      try {
        // Get image metadata using sharp
        let metadata: Metadata;
        try {
          metadata = await sharp(file.buffer).metadata();
        } catch (error) {
          console.error(
            `[uploadImagesToAlbum] Sharp metadata extraction failed:`,
            error,
          );
          throw new BadRequestException(
            `Failed to read image metadata for ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }

        //
        const fileName = file.originalname.substring(
          0,
          file.originalname.lastIndexOf('.'),
        );
        const fileExt = file.originalname.substring(
          file.originalname.lastIndexOf('.'),
        );
        const timestamp = Date.now();
        const finalFileName = `${fileName}_${timestamp}${fileExt}`;

        // Upload to OneDrive in the album's folder
        try {
          const oneDriveData = await this.oneDriveService.uploadFile(
            file.buffer,
            finalFileName,
            albumId,
          );

          const storageUrl = oneDriveData.webUrl;

          const fileData: Prisma.FileCreateInput = {
            name: finalFileName,
            uploader: { connect: { id: userId } },
            storageKey: oneDriveData?.id,
            storageUrl,
            mimeType: file.mimetype,
            byteSize: file.size,
            width: metadata.width,
            height: metadata.height,
            usageType: uploadImageDto.usageType || 'album',
            visibility: uploadImageDto.visibility ?? VisibilityLevel.PRIVATE,
          };

          const createdFile = await this.databaseService.file.create({
            data: fileData,
            include: { uploader: true },
          });

          // Add file to album
          await this.databaseService.albumFile.create({
            data: {
              albumId: albumId,
              fileId: createdFile.id,
              sortOrder: (uploadImageDto.sortOrder ?? 0) + uploadedFiles.length,
              caption: uploadImageDto.caption,
            },
          });

          uploadedFiles.push(createdFile);
        } catch (error) {
          console.error(
            `[uploadImagesToAlbum] Error uploading file ${file.originalname}:`,
            error,
          );
          throw error;
        }
      } catch (error) {
        console.error(
          `[uploadImagesToAlbum] Error caught for file ${file.originalname}:`,
          error,
        );

        if (error instanceof BadRequestException) {
          console.error(`[uploadImagesToAlbum] Rethrowing BadRequestException`);
          throw error;
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(
          `[uploadImagesToAlbum] Throwing new Error: ${errorMessage}`,
        );
        throw new Error(
          `Failed to upload image ${file.originalname} to storage service: ${errorMessage}`,
        );
      }
    }

    // Return updated album with files
    const result = await this.findOne(albumId);
    return result;
  }

  async getFileStream(fileId: string) {
    // Allow deleted files so trash view content preview works
    const file = await this.databaseService.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      console.error(`[getFileStream] File not found in database: ${fileId}`);
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Get file stream from OneDrive using storageKey (which is the OneDrive file ID)
    try {
      const stream = await this.oneDriveService.getFileStream(file.storageKey);

      return {
        stream,
        mimeType: file.mimeType,
        byteSize: file.byteSize,
        name: file.name,
      };
    } catch (error) {
      console.error(
        `[getFileStream] Error getting file stream from OneDrive:`,
        error,
      );
      throw error;
    }
  }

  async getThumbnailStream(
    fileId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; contentType: string }> {
    // Allow deleted files so trash view thumbnails work
    const file = await this.databaseService.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    return this.oneDriveService.getThumbnailStream(file.storageKey);
  }

  private async assertCustomerAlbumFileAccess(
    customerId: string,
    fileId: string,
  ): Promise<{ storageKey: string }> {
    const file = await this.databaseService.file.findFirst({
      where: {
        id: fileId,
        deletedAt: null,
        albums: {
          some: {
            album: {
              deletedAt: null,
              isPublic: false,
              booking: {
                is: {
                  customerId,
                  deletedAt: null,
                },
              },
            },
          },
        },
      },
      select: {
        storageKey: true,
      },
    });

    if (!file) {
      throw new ForbiddenException(DENIAL_MESSAGE);
    }

    return file;
  }

  async getCustomerThumbnailStream(
    customerId: string,
    fileId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; contentType: string }> {
    const { storageKey } = await this.assertCustomerAlbumFileAccess(
      customerId,
      fileId,
    );

    return this.oneDriveService.getThumbnailStream(storageKey);
  }

  async getCustomerFileStream(customerId: string, fileId: string) {
    const { storageKey } = await this.assertCustomerAlbumFileAccess(
      customerId,
      fileId,
    );

    const file = await this.databaseService.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new ForbiddenException('Album not found or you do not have access.');
    }

    const stream = await this.oneDriveService.getFileStream(storageKey);

    return {
      stream,
      mimeType: file.mimeType,
      byteSize: file.byteSize,
      name: file.name,
    };
  }

  async getThumbnailUrl(fileId: string): Promise<string> {
    // Get file info from database
    const file = await this.databaseService.file.findUnique({
      where: { id: fileId, deletedAt: null },
    });

    if (!file) {
      console.error(`[getThumbnailUrl] File not found in database: ${fileId}`);
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // console.log(
    //   `[getThumbnailUrl] File found: ${file.name}, storageKey: ${file.storageKey}`,
    // );

    // Get thumbnail URL from OneDrive using storageKey (which is the OneDrive file ID)
    try {
      // console.log(
      //   `[getThumbnailUrl] Requesting thumbnail from OneDrive: ${file.storageKey}`,
      // );
      const thumbnailUrl = await this.oneDriveService.getThumbnailUrl(
        file.storageKey,
      );
      // console.log(`[getThumbnailUrl] Got thumbnail URL successfully`);
      return thumbnailUrl;
    } catch (error) {
      console.error(
        `[getThumbnailUrl] Error getting thumbnail URL from OneDrive:`,
        error,
      );
      // Return empty string so frontend can fallback to original image
      return '';
    }
  }
}
