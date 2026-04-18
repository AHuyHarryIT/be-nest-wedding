import {
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import contentDisposition from 'content-disposition';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser, type AuthenticatedUser } from '../auth/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '../common/decorators/api-response.decorator';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import { AlbumsService } from './albums.service';
import { QueryCustomerAlbumsDto } from './dto/query-customer-albums.dto';

@ApiTags('Customer Albums')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('customer/albums')
export class CustomerAlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  @Get('private')
  @ApiOperation({
    summary: 'List private albums that belong to the authenticated customer',
  })
  @ApiPaginatedResponse(Object)
  async findPrivate(
    @GetUser() user: AuthenticatedUser,
    @Query() query: QueryCustomerAlbumsDto,
  ) {
    const result = await this.albumsService.findCustomerPrivateAlbums(
      user.userId,
      query,
    );

    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Customer private albums retrieved successfully',
    );
  }

  @Get(':albumId/assets')
  @ApiOperation({
    summary: 'List file metadata for a customer-owned private album',
  })
  @ApiSuccessResponse({ description: 'Album assets retrieved successfully' })
  async getPrivateAlbumAssets(
    @GetUser() user: AuthenticatedUser,
    @Param('albumId') albumId: string,
  ) {
    const assets = await this.albumsService.findCustomerPrivateAlbumAssets(
      user.userId,
      albumId,
    );

    return ResponseBuilder.success(
      assets,
      'Customer private album assets retrieved successfully',
    );
  }

  @Get(':albumId/download.zip')
  @ApiOperation({
    summary: 'Download customer-owned private album as zip attachment',
  })
  @ApiSuccessResponse({ description: 'Album zip streamed successfully' })
  async downloadAlbumZip(
    @GetUser() user: AuthenticatedUser,
    @Param('albumId') albumId: string,
    @Res() res: Response,
  ) {
    try {
      const { stream, fileName } = await this.albumsService.getCustomerAlbumZipStream(
        user.userId,
        albumId,
      );

      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': contentDisposition(fileName),
        'Cache-Control': 'private, no-store',
      });

      stream.pipe(res);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to download album zip';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  @Get('file/:fileId/thumbnail')
  @ApiOperation({
    summary: 'Get thumbnail for a customer-owned private album file',
  })
  @ApiSuccessResponse({ description: 'Thumbnail stream retrieved successfully' })
  async getThumbnail(
    @GetUser() user: AuthenticatedUser,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.albumsService.getCustomerThumbnailStream(
        user.userId,
        fileId,
      );

      res.set({
        'Content-Type': result.contentType || 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      });

      result.stream.pipe(res);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get thumbnail';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  @Get('file/:fileId/content')
  @ApiOperation({
    summary: 'Get full content stream for a customer-owned private album file',
  })
  @ApiSuccessResponse({ description: 'File content streamed successfully' })
  async getFileContent(
    @GetUser() user: AuthenticatedUser,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    try {
      const { stream, mimeType, name } =
        await this.albumsService.getCustomerFileStream(user.userId, fileId);

      res.set({
        'Content-Type': mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(name)}"`,
        'Cache-Control': 'private, max-age=3600',
      });

      stream.pipe(res);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get file';
      throw new InternalServerErrorException(errorMessage);
    }
  }
}
