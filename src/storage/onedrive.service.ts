import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GenericRecord } from '../common/types';
import { AuthService } from './auth.service';
import { UploadService, ProgressCallback } from './upload.service';

// OneDrive API Response Types
interface OneDriveFileResponse {
  id: string;
  name: string;
  eTag: string;
  webUrl: string;
  size: number;
  cTag: string;
  parentReference: {
    id: string;
    name: string;
    path: string;
    siteId: string;
  };
  file: {
    mimeType: string;
    hashes: {
      quickXorHash: string;
    };
  };
  '@odata.context': string;
  '@microsoft.graph.downloadUrl': string;
  createdDateTime: string;
  lastModifiedDateTime: string;
}

interface OneDriveFolderListResponse {
  value: Array<{
    id: string;
    name: string;
    folder?: Record<string, unknown>;
  }>;
}

interface OneDriveThumbnailResponse {
  value: Array<{
    small?: { url: string };
    medium?: { url: string };
    large?: { url: string };
  }>;
}

interface OneDriveShareLinkResponse {
  link: {
    webUrl: string;
  };
}

@Injectable()
export class OneDriveService {
  private folderCache = new Map<string, string>(); // Cache folder IDs
  private noThumbSet = new Set<string>(); // Cache missing thumbnails

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private uploadService: UploadService,
  ) {}

  /**
   * Upload a file to OneDrive.
   * Delegates to UploadService which handles both small and large files.
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    folderPath: string = '',
    onProgress?: ProgressCallback,
    abortSignal?: AbortSignal,
  ): Promise<OneDriveFileResponse> {
    const result = await this.uploadService.uploadFile(
      fileBuffer,
      fileName,
      folderPath,
      onProgress,
      abortSignal,
    );

    if (!result.success) {
      throw new BadRequestException(
        `Failed to upload file to OneDrive: ${result.error}`,
      );
    }

    return {
      id: result.driveItemId || '',
      name: result.fileName,
      webUrl: result.webUrl || '',
      eTag: '',
      size: fileBuffer.length,
      cTag: '',
      parentReference: {
        id: '',
        name: '',
        path: '',
        siteId: '',
      },
      file: {
        mimeType: 'application/octet-stream',
        hashes: {
          quickXorHash: '',
        },
      },
      '@odata.context': '',
      '@microsoft.graph.downloadUrl': '',
      createdDateTime: new Date().toISOString(),
      lastModifiedDateTime: new Date().toISOString(),
    };
  }

  /**
   * Create or get a product folder in OneDrive
   * Creates a "Products" root folder and then a subfolder for the specific product
   */
  async getOrCreateProductFolder(folderName: string): Promise<string> {
    const token = await this.authService.getAccessToken();
    const userId = this.configService.get<string>('AZURE_USER_ID');

    if (!userId) {
      throw new BadRequestException('Azure user ID not configured');
    }

    const cacheKey = `${userId}:Products:${folderName}`;

    // Return cached folder ID if available
    if (this.folderCache.has(cacheKey)) {
      return this.folderCache.get(cacheKey)!;
    }

    try {
      // Get or create base "Products" folder
      const baseFolderId = await this.ensureFolderExists(
        token,
        userId,
        'Products',
      );
      // Get or create subfolder within Products
      const subFolderId = await this.ensureFolderExists(
        token,
        userId,
        folderName,
        baseFolderId,
      );

      // Cache the result
      this.folderCache.set(cacheKey, subFolderId);

      return subFolderId;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const errorMessage = error.response?.data?.error?.message;
      throw new BadRequestException(
        `Failed to get/create product folder "${folderName}": ${errorMessage || 'Unknown error'}`,
      );
    }
  }

  private async getOrCreateFolder(folderName: string): Promise<string> {
    const token = await this.authService.getAccessToken();
    const userId = this.configService.get<string>('AZURE_USER_ID');

    if (!userId) {
      throw new BadRequestException('Azure user ID not configured');
    }

    const cacheKey = `${userId}:Albums:${folderName}`;

    // Return cached folder ID if available
    if (this.folderCache.has(cacheKey)) {
      return this.folderCache.get(cacheKey)!;
    }

    try {
      // Get or create base "Albums" folder
      const baseFolderId = await this.ensureFolderExists(
        token,
        userId,
        'Albums',
      );
      // Get or create subfolder within Albums
      const subFolderId = await this.ensureFolderExists(
        token,
        userId,
        folderName,
        baseFolderId,
      );

      // Cache the result
      this.folderCache.set(cacheKey, subFolderId);

      return subFolderId;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const errorMessage = error.response?.data?.error?.message;
      throw new BadRequestException(
        `Failed to get/create folder "${folderName}": ${errorMessage || 'Unknown error'}`,
      );
    }
  }

  /**
   * Ensures a folder exists in OneDrive, creates it if not
   * @param token Access token
   * @param userId User ID
   * @param folderName Name of folder to ensure exists
   * @param parentFolderId Optional parent folder ID (if not provided, uses root)
   * @returns Folder ID
   */
  private async ensureFolderExists(
    token: string,
    userId: string,
    folderName: string,
    parentFolderId?: string,
  ): Promise<string> {
    const listUrl = parentFolderId
      ? `https://graph.microsoft.com/v1.0/users/${userId}/drive/items/${parentFolderId}/children`
      : `https://graph.microsoft.com/v1.0/users/${userId}/drive/root/children`;

    // Check if folder already exists
    const listResponse = await axios.get<OneDriveFolderListResponse>(listUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const existingFolder = listResponse.data.value.find(
      (item) => item.name === folderName && item.folder,
    );

    if (existingFolder) {
      return existingFolder.id;
    }

    // Create folder if it doesn't exist
    const createResponse = await axios.post<OneDriveFileResponse>(
      listUrl,
      {
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return createResponse.data.id;
  }

  /**
   * Create a folder in OneDrive
   * @param folderName Name of the folder to create
   * @param parentFolderName Optional parent folder (defaults to root)
   * @returns Folder details with ID and webUrl
   */
  async createFolder(
    folderName: string,
    parentFolderName?: string,
  ): Promise<{ id: string; webUrl: string }> {
    const token = await this.authService.getAccessToken();
    const userId = this.configService.get<string>('AZURE_USER_ID');

    if (!userId) {
      throw new BadRequestException('Azure user ID not configured');
    }

    try {
      // Get parent folder ID if specified
      let parentFolderId: string | undefined;
      if (parentFolderName) {
        parentFolderId = await this.ensureFolderExists(
          token,
          userId,
          parentFolderName,
        );
      }

      // Create the folder
      const folderId = await this.ensureFolderExists(
        token,
        userId,
        folderName,
        parentFolderId,
      );

      // Get folder details including webUrl
      const folderUrl = parentFolderId
        ? `https://graph.microsoft.com/v1.0/users/${userId}/drive/items/${parentFolderId}/children`
        : `https://graph.microsoft.com/v1.0/users/${userId}/drive/root/children`;

      const response = await axios.get<OneDriveFolderListResponse>(folderUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const folder = response.data.value.find((item) => item.id === folderId);

      if (!folder) {
        throw new BadRequestException('Failed to retrieve folder details');
      }

      // Get full folder details with webUrl
      const detailsUrl = `https://graph.microsoft.com/v1.0/users/${userId}/drive/items/${folderId}`;
      const detailsResponse = await axios.get<OneDriveFileResponse>(
        detailsUrl,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return {
        id: folderId,
        webUrl: detailsResponse.data.webUrl,
      };
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const errorMessage = error.response?.data?.error?.message;
      throw new BadRequestException(
        `Failed to create folder "${folderName}": ${errorMessage || 'Unknown error'}`,
      );
    }
  }

  /**
   * Get OneDrive folder/file URL
   * @param itemId Folder or file ID
   * @returns Web URL of the item
   */
  async getFolderUrl(itemId: string): Promise<string> {
    try {
      const token = await this.authService.getAccessToken();
      const userId = this.configService.get<string>('AZURE_USER_ID');

      if (!userId) {
        throw new BadRequestException('Azure user ID not configured');
      }

      const itemUrl = `https://graph.microsoft.com/v1.0/users/${userId}/drive/items/${itemId}`;

      const response = await axios.get<OneDriveFileResponse>(itemUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data.webUrl;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const errorMessage = error.response?.data?.error?.message;
      throw new BadRequestException(
        `Failed to get folder URL: ${errorMessage || 'Unknown error'}`,
      );
    }
  }

  async getThumbnail(
    fileId: string,
    size: 'small' | 'medium' | 'large' = 'medium',
  ): Promise<string | null> {
    try {
      // Check if thumbnail is permanently missing
      if (this.noThumbSet.has(fileId)) {
        return null;
      }

      const token = await this.authService.getAccessToken();
      const userId = this.configService.get<string>('AZURE_USER_ID');

      if (!userId) {
        return null;
      }

      const thumbUrl = `https://graph.microsoft.com/v1.0/users/${userId}/drive/items/${fileId}/thumbnails`;

      const response = await axios.get<OneDriveThumbnailResponse>(thumbUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const thumbData = response.data;
      const thumbnailSet = thumbData.value?.[0];

      if (!thumbnailSet) {
        this.noThumbSet.add(fileId);
        return null;
      }

      // Get thumbnail by size preference
      return (
        thumbnailSet?.[size]?.url ||
        thumbnailSet?.medium?.url ||
        thumbnailSet?.large?.url ||
        thumbnailSet?.small?.url ||
        null
      );
    } catch (error) {
      console.error('Failed to fetch thumbnail:', error);
      return null;
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const token = await this.authService.getAccessToken();
      const userId = this.configService.get<string>('AZURE_USER_ID');

      if (!userId) {
        return false;
      }

      const deleteUrl = `https://graph.microsoft.com/v1.0/users/${userId}/drive/items/${fileId}`;

      await axios.delete(deleteUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  /**
   * Delete a folder and all its contents from OneDrive.
   * Also cleans up the internal folder cache.
   * @param folderId The OneDrive folder (drive item) ID
   * @returns true if deleted successfully
   */
  async deleteFolder(folderId: string): Promise<boolean> {
    try {
      const token = await this.authService.getAccessToken();
      const userId = this.configService.get<string>('AZURE_USER_ID');

      if (!userId) {
        return false;
      }

      const deleteUrl = `https://graph.microsoft.com/v1.0/users/${userId}/drive/items/${folderId}`;

      await axios.delete(deleteUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Clean up folder cache entries that reference this folder
      for (const [key, cachedId] of this.folderCache.entries()) {
        if (cachedId === folderId) {
          this.folderCache.delete(key);
        }
      }

      return true;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const status = error.response?.status;
      // 404 means folder already deleted — treat as success
      if (status === 404) {
        console.warn(
          `[OneDrive.deleteFolder] Folder ${folderId} not found (already deleted)`,
        );
        return true;
      }
      console.error(
        `[OneDrive.deleteFolder] Failed to delete folder ${folderId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Delete a folder by its path under a parent folder in OneDrive.
   * Uses the path-based Graph API: DELETE /drive/root:/ParentFolder/FolderName
   * @param folderName The folder name (e.g. album title-based name)
   * @param parentFolder The parent folder path (default: 'Albums')
   * @returns true if deleted successfully
   */
  async deleteFolderByPath(
    folderName: string,
    parentFolder: string = '',
  ): Promise<boolean> {
    try {
      const token = await this.authService.getAccessToken();
      const userId = this.configService.get<string>('AZURE_USER_ID');

      if (!userId) {
        return false;
      }

      const encodedPath = encodeURIComponent(`${parentFolder}/${folderName}`);
      const deleteUrl = `https://graph.microsoft.com/v1.0/users/${userId}/drive/root:/${encodedPath}`;

      await axios.delete(deleteUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Clean up folder cache entries matching this folder name
      for (const [key] of this.folderCache.entries()) {
        if (key.includes(folderName)) {
          this.folderCache.delete(key);
        }
      }

      console.log(
        `[OneDrive.deleteFolderByPath] Deleted folder: ${parentFolder}/${folderName}`,
      );
      return true;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const status = error.response?.status;
      if (status === 404) {
        console.warn(
          `[OneDrive.deleteFolderByPath] Folder ${parentFolder}/${folderName} not found (already deleted)`,
        );
        return true;
      }
      console.error(
        `[OneDrive.deleteFolderByPath] Failed to delete folder ${parentFolder}/${folderName}:`,
        error,
      );
      return false;
    }
  }

  async createShareLink(fileId: string, password?: string): Promise<string> {
    const token = await this.authService.getAccessToken();
    const userId = this.configService.get<string>('AZURE_USER_ID');

    if (!userId) {
      throw new BadRequestException('Azure user ID not configured');
    }

    const shareUrl = `https://graph.microsoft.com/v1.0/users/${userId}/drive/items/${fileId}/createLink`;

    try {
      const response = await axios.post<OneDriveShareLinkResponse>(
        shareUrl,
        {
          type: 'view',
          scope: 'anonymous',
          ...(password && { password }),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const linkData = response.data;
      return linkData.link.webUrl;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const errorMessage = error.response?.data?.error?.message;
      const message = (errorMessage as string) || 'Unknown error';
      throw new BadRequestException(`Failed to create share link: ${message}`);
    }
  }

  async getFileStream(fileId: string) {
    const token = await this.authService.getAccessToken();
    const userId = this.configService.get<string>('AZURE_USER_ID');

    if (!userId) {
      const error = 'Azure user ID not configured';
      console.error(`[OneDrive.getFileStream] ${error}`);
      throw new BadRequestException(error);
    }

    // Get file content stream from OneDrive
    const downloadUrl = `https://graph.microsoft.com/v1.0/users/${userId}/drive/items/${fileId}/content`;

    try {
      const response = await axios.get(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'stream',
      });

      return response.data as NodeJS.ReadableStream;
    } catch (error: unknown) {
      console.error(
        `[OneDrive.getFileStream] Error getting file stream:`,
        error,
      );
      const errorData = error as GenericRecord<unknown>;
      const errorMessage = (errorData?.response as GenericRecord<unknown>)
        ?.data as GenericRecord<unknown>;
      const message =
        ((errorMessage?.error as GenericRecord<unknown>)?.message as string) ||
        (error instanceof Error ? error.message : 'Unknown error');
      const statusValue = (errorData?.response as GenericRecord<unknown>)
        ?.status;
      const status = typeof statusValue === 'number' ? statusValue : 'Unknown';
      console.error(
        `[OneDrive.getFileStream] Status: ${status}, Message: ${message}`,
      );
      throw new BadRequestException(`Failed to download file: ${message}`);
    }
  }

  async getThumbnailStream(
    fileId: string,
    size: 'small' | 'medium' | 'large' = 'medium',
  ): Promise<{ stream: NodeJS.ReadableStream; contentType: string }> {
    // First get the CDN URL
    const url = await this.getThumbnailUrl(fileId, size);
    if (!url) {
      throw new BadRequestException('No thumbnail available for this file');
    }

    // Then fetch the actual image bytes as a stream
    const response = await axios.get(url, {
      responseType: 'stream',
    });

    const contentType =
      (response.headers['content-type'] as string) || 'image/jpeg';
    return { stream: response.data as NodeJS.ReadableStream, contentType };
  }

  async getThumbnailUrl(
    fileId: string,
    size: 'small' | 'medium' | 'large' = 'medium',
  ): Promise<string> {
    // Check if thumbnail is permanently missing
    if (this.noThumbSet.has(fileId)) {
      return '';
    }

    const token = await this.authService.getAccessToken();
    const userId = this.configService.get<string>('AZURE_USER_ID');

    if (!userId) {
      const error = 'Azure user ID not configured';
      throw new BadRequestException(error);
    }

    // Direct thumbnail URL using the specific size endpoint
    // Format: GET /users/{user-id}/drive/items/{item-id}/thumbnails/{thumb-id}/{size}
    const thumbnailUrl = `https://graph.microsoft.com/v1.0/users/${userId}/drive/items/${fileId}/thumbnails/0/${size}`;

    try {
      const response = await axios.get<{ url: string }>(thumbnailUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const url = response.data.url;

      if (!url) {
        console.warn(
          `[OneDrive.getThumbnailUrl] No thumbnail URL found for file: ${fileId}`,
        );
        return '';
      }

      return url;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const status = error.response?.status;

      // 406 means no thumbnail available for this file (permanent)
      if (status === 406) {
        this.noThumbSet.add(fileId);
        return '';
      }

      console.error(
        `[OneDrive.getThumbnailUrl] Error getting ${size} thumbnail:`,
        error,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const errorMessage = error.response?.data?.error?.message;
      const message =
        (errorMessage as string) ||
        (error instanceof Error ? error.message : 'Unknown error');
      console.error(
        `[OneDrive.getThumbnailUrl] Status: ${status}, Message: ${message}`,
      );
      // Return empty string instead of throwing, so grid can still load without thumbnails
      return '';
    }
  }
}
