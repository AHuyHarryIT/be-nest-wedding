import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthService } from './auth.service';

// 4 MB threshold – files larger than this use an upload session (resumable upload)
const LARGE_FILE_THRESHOLD = 4 * 1024 * 1024;
// Upload chunk size for large files (must be a multiple of 320 KiB)
const UPLOAD_CHUNK_SIZE = 5 * 320 * 1024; // ~1.6 MB per chunk

export interface UploadResult {
  success: boolean;
  fileName: string;
  webUrl?: string;
  driveItemId?: string;
  error?: string;
}

export type ProgressCallback = (percent: number, message: string) => void;

/**
 * Upload service for OneDrive files.
 * Handles both small files (simple PUT) and large files (resumable upload sessions).
 */
@Injectable()
export class UploadService {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  /**
   * Upload a file to OneDrive.
   * Small files (≤4 MB) → simple PUT
   * Large files (>4 MB) → resumable upload session with 1.6 MB chunks
   *
   * @param fileBuffer Raw file contents
   * @param fileName Target file name on OneDrive
   * @param folderPath Optional folder path (e.g. "Documents/uploads")
   * @param onProgress Optional callback for progress updates
   * @param abortSignal Optional AbortSignal to cancel mid-upload
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    folderPath: string = '',
    onProgress?: ProgressCallback,
    abortSignal?: AbortSignal,
  ): Promise<UploadResult> {
    try {
      if (abortSignal?.aborted) {
        return { success: false, fileName, error: 'Upload cancelled' };
      }

      const accessToken = await this.authService.getAccessToken();
      const userId = this.configService.get<string>('AZURE_USER_ID');

      if (!userId) {
        return {
          success: false,
          fileName,
          error: 'Azure user ID not configured',
        };
      }

      const drivePath = folderPath
        ? `/users/${userId}/drive/root:/${folderPath}/${fileName}`
        : `/users/${userId}/drive/root:/${fileName}`;

      if (fileBuffer.length <= LARGE_FILE_THRESHOLD) {
        return this.uploadSmallFile(
          accessToken,
          drivePath,
          fileName,
          fileBuffer,
          onProgress,
          abortSignal,
        );
      } else {
        return this.uploadLargeFile(
          accessToken,
          drivePath,
          fileName,
          fileBuffer,
          onProgress,
          abortSignal,
        );
      }
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string } | null;
      if (error?.name === 'AbortError' || abortSignal?.aborted) {
        return { success: false, fileName, error: 'Upload cancelled' };
      }
      return {
        success: false,
        fileName,
        error:
          (error && typeof error === 'object' && 'message' in error
            ? (error as { message: string }).message
            : 'Unknown upload error') || 'Unknown upload error',
      };
    }
  }

  /**
   * Upload a small file (≤4 MB) using simple PUT request.
   */
  private async uploadSmallFile(
    accessToken: string,
    drivePath: string,
    fileName: string,
    fileBuffer: Buffer,
    onProgress?: ProgressCallback,
    abortSignal?: AbortSignal,
  ): Promise<UploadResult> {
    onProgress?.(0, 'Uploading to OneDrive…');

    const putUrl = `https://graph.microsoft.com/v1.0${drivePath}:/content`;
    const response = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer as BodyInit,
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Upload failed (${response.status}): ${errorBody}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await response.json();
    onProgress?.(100, 'Complete');

    const fileName_ =
      ((result as Record<string, unknown>).name as string) || fileName;
    const webUrl_ = (result as Record<string, unknown>).webUrl as
      | string
      | undefined;
    const driveItemId_ = (result as Record<string, unknown>).id as
      | string
      | undefined;

    return {
      success: true,
      fileName: fileName_,
      webUrl: webUrl_,
      driveItemId: driveItemId_,
    };
  }

  /**
   * Upload a large file (>4 MB) using resumable upload session.
   */
  private async uploadLargeFile(
    accessToken: string,
    drivePath: string,
    fileName: string,
    fileBuffer: Buffer,
    onProgress?: ProgressCallback,
    abortSignal?: AbortSignal,
  ): Promise<UploadResult> {
    const graphClient = Client.init({
      authProvider: (done) => done(null, accessToken),
    });

    // Create upload session
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const uploadSession = await graphClient
      .api(`${drivePath}:/createUploadSession`)
      .post({
        item: {
          '@microsoft.graph.conflictBehavior': 'rename',
          name: fileName,
        },
      });

    const uploadUrl: string = (uploadSession as Record<string, unknown>)
      .uploadUrl as string;
    const fileSize = fileBuffer.length;
    const totalChunks = Math.ceil(fileSize / UPLOAD_CHUNK_SIZE);
    let offset = 0;
    let chunkIndex = 0;
    let response: Response | null = null;

    onProgress?.(0, `Chunk 0/${totalChunks}`);

    while (offset < fileSize) {
      if (abortSignal?.aborted) {
        try {
          await fetch(uploadUrl, { method: 'DELETE' });
        } catch {
          // Ignore cleanup errors
        }
        return { success: false, fileName, error: 'Upload cancelled' };
      }

      const chunkEnd = Math.min(offset + UPLOAD_CHUNK_SIZE, fileSize);
      const chunk = fileBuffer.subarray(offset, chunkEnd);
      const contentRange = `bytes ${offset}-${chunkEnd - 1}/${fileSize}`;

      response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': chunk.length.toString(),
          'Content-Range': contentRange,
        },
        body: chunk as BodyInit,
        signal: abortSignal,
      });

      if (!response.ok && response.status !== 202) {
        const errorBody = await response.text();
        throw new Error(
          `Chunk upload failed (${response.status}): ${errorBody}`,
        );
      }

      offset = chunkEnd;
      chunkIndex++;
      const percent = Math.round((offset / fileSize) * 100);
      onProgress?.(percent, `Chunk ${chunkIndex}/${totalChunks}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = response ? await response.json().catch(() => ({})) : {};
    const fileName_ =
      ((result as Record<string, unknown>).name as string) || fileName;
    const webUrl_ = (result as Record<string, unknown>).webUrl as
      | string
      | undefined;
    const driveItemId_ = (result as Record<string, unknown>).id as
      | string
      | undefined;

    return {
      success: true,
      fileName: fileName_,
      webUrl: webUrl_,
      driveItemId: driveItemId_,
    };
  }
}
