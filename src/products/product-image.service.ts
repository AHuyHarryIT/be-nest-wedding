import { Injectable, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { OneDriveService } from '../storage/onedrive.service';
import { DatabaseService } from '../database/database.service';
import { Prisma, VisibilityLevel } from 'generated/prisma';
import { Metadata } from 'sharp';

interface UploadProductImageDto {
  usageType?: string;
  visibility?: VisibilityLevel;
}

@Injectable()
export class ProductImageService {
  constructor(
    private readonly oneDriveService: OneDriveService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Create a dedicated OneDrive folder for a product
   */
  async createProductFolder(
    productId: string,
    productName: string,
  ): Promise<string> {
    try {
      const folderName = `${productName}_${productId}`;
      // This will create a folder under "Products" in OneDrive
      const folderId =
        await this.oneDriveService.getOrCreateProductFolder(folderName);
      return folderId;
    } catch (error) {
      throw new BadRequestException(
        `Failed to create product folder: ${error.message}`,
      );
    }
  }

  /**
   * Upload an image to a product's OneDrive folder
   */
  async uploadProductImage(
    file: Express.Multer.File,
    productId: string,
    oneDriveFolderId: string,
    userId?: string,
    uploadImageDto?: UploadProductImageDto,
  ): Promise<{ id: string; storageUrl: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // userId is required for File creation
    if (!userId) {
      throw new BadRequestException('User ID is required for file upload');
    }

    try {
      // Get image metadata using sharp (like albums do)
      let metadata: Metadata;
      try {
        metadata = await sharp(file.buffer).metadata();
      } catch (error) {
        console.error(
          `[uploadProductImage] Sharp metadata extraction failed:`,
          error,
        );
        throw new BadRequestException(
          `Failed to read image metadata for ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // Generate unique filename
      const fileName = file.originalname.substring(
        0,
        file.originalname.lastIndexOf('.'),
      );
      const fileExt = file.originalname.substring(
        file.originalname.lastIndexOf('.'),
      );
      const timestamp = Date.now();
      const finalFileName = `${fileName}_${timestamp}${fileExt}`;

      // Upload to OneDrive in product's folder
      const oneDriveData = await this.oneDriveService.uploadFile(
        file.buffer,
        finalFileName,
        oneDriveFolderId,
      );

      const storageUrl = oneDriveData.webUrl;

      // Create file record in database (with image metadata like albums do)
      const fileData: Prisma.FileCreateInput = {
        name: finalFileName,
        uploader: { connect: { id: userId } },
        storageKey: oneDriveData?.id,
        storageUrl,
        mimeType: file.mimetype,
        byteSize: file.size,
        width: metadata.width,
        height: metadata.height,
        usageType: uploadImageDto?.usageType || 'product',
        visibility: uploadImageDto?.visibility ?? VisibilityLevel.PRIVATE,
      };

      const createdFile = await this.databaseService.file.create({
        data: fileData,
        include: { uploader: true },
      });

      return {
        id: createdFile.id,
        storageUrl: createdFile.storageUrl,
      };
    } catch (error) {
      console.error(`[uploadProductImage] Error uploading file:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to upload product image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get thumbnail URL for a product image
   */
  async getProductImageThumbnailUrl(fileId: string): Promise<string> {
    try {
      const file = await this.databaseService.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new BadRequestException('File not found');
      }

      // Use OneDrive thumbnail endpoint
      return await this.oneDriveService.getThumbnailUrl(file.storageKey);
    } catch (error) {
      throw new BadRequestException(
        `Failed to get thumbnail: ${error.message}`,
      );
    }
  }

  /**
   * Delete a product image
   */
  async deleteProductImage(fileId: string): Promise<void> {
    try {
      const file = await this.databaseService.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new BadRequestException('File not found');
      }

      // Delete from database (OneDrive deletion handled separately if needed)
      await this.databaseService.file.delete({
        where: { id: fileId },
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete product image: ${error.message}`,
      );
    }
  }
}
