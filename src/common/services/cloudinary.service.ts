import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export interface CloudinaryUploadResult {
  success: boolean;
  fileName?: string;
  webUrl?: string;
  publicId?: string;
  error?: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    // Configure Cloudinary with environment variables
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Upload a file buffer to Cloudinary
   * @param fileBuffer The file buffer to upload
   * @param fileName Original filename
   * @param folder Cloudinary folder path (e.g., 'wedding/services')
   * @returns Upload result with URL and public_id
   */
  async uploadImage(
    fileBuffer: Buffer,
    fileName: string,
    folder: string = 'wedding/services',
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve) => {
      try {
        if (!fileBuffer || fileBuffer.length === 0) {
          return resolve({
            success: false,
            error: 'File buffer is empty',
          });
        }

        // Strip extension for public_id
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        const publicId = `${folder}/${nameWithoutExt}_${Date.now()}`;

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: 'auto',
            overwrite: false,
            unique_filename: true,
            folder: folder,
            quality: 'auto',
            fetch_format: 'auto',
          },
          (error: any, result: any) => {
            if (error) {
              const errorMsg =
                (error && error.message) || 'Unknown upload error';
              this.logger.error(`Cloudinary upload error: ${errorMsg}`);
              return resolve({
                success: false,
                error: errorMsg,
              });
            }

            if (result) {
              resolve({
                success: true,
                fileName: result.display_name
                  ? `${result.display_name}.${result.format}`
                  : fileName,
                webUrl: result.secure_url || result.url,
                publicId: result.public_id,
              });
            }
          },
        );

        // Convert buffer to stream and pipe
        const readable = Readable.from(fileBuffer);
        readable.pipe(uploadStream);
      } catch (error: unknown) {
        const errorMsg =
          error instanceof Error ? error.message : 'Failed to upload image';
        this.logger.error(`Cloudinary service error: ${errorMsg}`);
        resolve({
          success: false,
          error: errorMsg,
        });
      }
    });
  }

  /**
   * Delete an image from Cloudinary by public_id
   * @param publicId Cloudinary public ID
   * @returns deletion result
   */
  async deleteImage(
    publicId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      try {
        cloudinary.uploader.destroy(publicId, (error: any, result: any) => {
          if (error) {
            const errorMsg = (error && error.message) || 'Unknown delete error';
            this.logger.error(`Cloudinary delete error: ${errorMsg}`);
            return resolve({
              success: false,
              error: errorMsg,
            });
          }

          resolve({
            success: result?.result === 'ok',
          });
        });
      } catch (error: unknown) {
        const errorMsg =
          error instanceof Error ? error.message : 'Failed to delete image';
        this.logger.error(`Cloudinary delete service error: ${errorMsg}`);
        resolve({
          success: false,
          error: errorMsg,
        });
      }
    });
  }

  /**
   * Get image URL with transformations
   * @param publicId Cloudinary public ID
   * @param options Transformation options
   * @returns URL with transformations
   */
  getImageUrl(
    publicId: string,
    options?: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
    },
  ): string {
    try {
      let url: string;

      if (options?.width || options?.height) {
        url = cloudinary.url(publicId, {
          width: options.width,
          height: options.height,
          crop: options.crop || 'fill',
          resource_type: 'image',
          secure: true,
        });
      } else {
        url = cloudinary.url(publicId, {
          resource_type: 'image',
          secure: true,
          quality: options?.quality || 'auto',
        });
      }

      return url;
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : 'Error generating image URL';
      this.logger.error(`${errorMsg}`);
      return '';
    }
  }
}
