import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma, VisibilityLevel } from 'generated/prisma';
import sharp from 'sharp';
import { DatabaseService } from '../database/database.service';
import { OneDriveService } from '../storage/onedrive.service';
import { CreateFileDto, UpdateFileDto, UploadImageDto } from './dto';

@Injectable()
export class FilesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly oneDriveService: OneDriveService,
  ) {}

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

  async uploadImage(file: Express.Multer.File, uploadImageDto: UploadImageDto) {
    // Validate uploader exists
    const uploader = await this.databaseService.user.findUnique({
      where: { id: uploadImageDto.uploaderId },
    });
    if (!uploader) {
      throw new NotFoundException(
        `Uploader with ID ${uploadImageDto.uploaderId} not found`,
      );
    }

    // Get image metadata using sharp
    const metadata = await sharp(file.buffer).metadata();

    // Generate checksum

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const fileExtension =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (file as any).originalname?.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;

    // Upload to OneDrive
    try {
      const oneDriveData = await this.oneDriveService.uploadFile(
        file.buffer,
        fileName,
        'images',
      );

      const checksum = oneDriveData.file.hashes.quickXorHash;

      const storageKey =
        oneDriveData.eTag.match(/\{(.*)\}/)?.[1] || oneDriveData.eTag;
      console.log('OneDrive storageKey:', storageKey);
      const storageUrl = oneDriveData.webUrl;

      const data: Prisma.FileCreateInput = {
        id: oneDriveData?.id,
        uploader: { connect: { id: uploadImageDto.uploaderId } },
        storageKey,
        storageUrl,
        mimeType: file.mimetype,
        byteSize: file.size,
        width: metadata.width,
        height: metadata.height,
        checksum,
        usageType: uploadImageDto.usageType || 'image',
        visibility: uploadImageDto.visibility ?? VisibilityLevel.PRIVATE,
      };
      return this.databaseService.file.create({
        data,
        include: { uploader: true },
      });
    } catch (error) {
      console.error('OneDrive upload failed:', error);
      throw new Error('Failed to upload image to storage service');
    }
  }
}
