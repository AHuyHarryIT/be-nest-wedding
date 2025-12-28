import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfidentialClientApplication } from '@azure/msal-node';
import axios from 'axios';

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
  private msalClient: ConfidentialClientApplication;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private folderCache = new Map<string, string>(); // Cache folder IDs

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get<string>('AZURE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('AZURE_CLIENT_SECRET');
    const tenantId = this.configService.get<string>('AZURE_TENANT_ID');

    if (!clientId || !clientSecret || !tenantId) {
      console.warn(
        'OneDrive configuration incomplete. Some functionality may not work.',
      );
    }

    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: clientId || '',
        clientSecret: clientSecret || '',
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    });
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const tokenRes = await this.msalClient.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    });

    if (!tokenRes?.accessToken) {
      throw new Error('Failed to acquire access token');
    }

    this.accessToken = tokenRes.accessToken;
    // Token expires in ~3600 seconds, refresh after 3500
    this.tokenExpiry = Date.now() + 3500 * 1000;

    return this.accessToken;
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    folderId: string,
  ): Promise<OneDriveFileResponse> {
    const token = await this.getAccessToken();
    const userId = this.configService.get<string>('AZURE_USER_ID');

    if (!userId) {
      throw new BadRequestException('Azure user ID not configured');
    }

    // Upload file to album
    const uploadUrl = `https://graph.microsoft.com/v1.0/users/${userId}/drive/items/${folderId}:/${fileName}:/content`;

    try {
      const response = await axios.put<OneDriveFileResponse>(
        uploadUrl,
        fileBuffer,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
          },
        },
      );

      const uploadedFile = response.data;

      return uploadedFile;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message;
      const message = (errorMessage as string) || 'Unknown error';
      throw new BadRequestException(
        `Failed to upload file to OneDrive: ${message}`,
      );
    }
  }

  private async getOrCreateFolder(
    token: string,
    userId: string,
    folderName: string,
  ): Promise<string> {
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
    const token = await this.getAccessToken();
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
      const token = await this.getAccessToken();
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
      const token = await this.getAccessToken();
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
      const token = await this.getAccessToken();
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

  async createShareLink(fileId: string, password?: string): Promise<string> {
    const token = await this.getAccessToken();
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
    const token = await this.getAccessToken();
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

      return response.data;
    } catch (error) {
      console.error(
        `[OneDrive.getFileStream] Error getting file stream:`,
        error,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const errorMessage = error.response?.data?.error?.message;
      const status = error.response?.status;
      const message =
        (errorMessage as string) ||
        (error instanceof Error ? error.message : 'Unknown error');
      console.error(
        `[OneDrive.getFileStream] Status: ${status}, Message: ${message}`,
      );
      throw new BadRequestException(`Failed to download file: ${message}`);
    }
  }

  async getThumbnailUrl(
    fileId: string,
    size: 'small' | 'medium' | 'large' = 'medium',
  ): Promise<string> {
    const token = await this.getAccessToken();
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
      console.error(
        `[OneDrive.getThumbnailUrl] Error getting ${size} thumbnail:`,
        error,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const errorMessage = error.response?.data?.error?.message;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const status = error.response?.status;
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
