import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser, type AuthenticatedUser } from '../auth/get-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiCreatedSuccessResponse,
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '../common/decorators/api-response.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import { AlbumsService } from './albums.service';
import {
  AddFilesToAlbumDto,
  CreateAlbumDto,
  GenerateShareTokenDto,
  QueryAlbumDto,
  RemoveFilesFromAlbumDto,
  UpdateAlbumDto,
  UploadImageToAlbumDto,
  ViewAlbumDto,
} from './dto';

@ApiTags('Albums')
@ApiExtraModels(
  CreateAlbumDto,
  UpdateAlbumDto,
  AddFilesToAlbumDto,
  RemoveFilesFromAlbumDto,
  GenerateShareTokenDto,
  QueryAlbumDto,
  ViewAlbumDto,
  UploadImageToAlbumDto,
)
@ApiBearerAuth()
@Controller('albums')
export class AlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:create')
  @ApiOperation({ summary: 'Create a new album' })
  @ApiCreatedSuccessResponse({ description: 'Album created successfully' })
  async create(@Body() createAlbumDto: CreateAlbumDto) {
    const album = await this.albumsService.create(createAlbumDto);
    return ResponseBuilder.created(album, 'Album created successfully');
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:read')
  @ApiOperation({ summary: 'Get all albums with pagination and filters' })
  @ApiPaginatedResponse(ViewAlbumDto)
  async findAll(@Query() query: QueryAlbumDto) {
    const result = await this.albumsService.findAll(query);
    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Albums retrieved successfully',
    );
  }

  @Get('public')
  @ApiOperation({
    summary: 'Get all public albums (no authentication required)',
  })
  @ApiSuccessResponse({ description: 'Public albums retrieved successfully' })
  async findPublic() {
    const albums = await this.albumsService.findPublic();
    return ResponseBuilder.success(
      albums,
      'Public albums retrieved successfully',
    );
  }

  @Get('deleted')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:read')
  @ApiOperation({ summary: 'Get all deleted albums (trash)' })
  @ApiPaginatedResponse(ViewAlbumDto)
  async findDeleted(@Query() query: QueryAlbumDto) {
    const result = await this.albumsService.findDeleted(query);
    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Deleted albums retrieved successfully',
    );
  }

  @Get('share/:token')
  @ApiOperation({
    summary: 'Get album by share token (no authentication required)',
  })
  @ApiSuccessResponse({ description: 'Album retrieved successfully' })
  async findByShareToken(@Param('token') token: string) {
    const album = await this.albumsService.findByShareToken(token);
    return ResponseBuilder.success(album, 'Album retrieved successfully');
  }

  @Get('file/:fileId/thumbnail')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get proxied thumbnail image' })
  @ApiSuccessResponse({ description: 'Thumbnail image proxied successfully' })
  async getThumbnail(@Param('fileId') fileId: string, @Res() res: Response) {
    try {
      const result = await this.albumsService.getThumbnailStream(fileId);

      res.set({
        'Content-Type': result.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      });

      result.stream.pipe(res);
    } catch (error: unknown) {
      console.error(`[getThumbnail] Error getting thumbnail ${fileId}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get thumbnail';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  @Get('file/:fileId/content')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get original file content (streamed)' })
  @ApiSuccessResponse({ description: 'File content streamed successfully' })
  async getFileContent(@Param('fileId') fileId: string, @Res() res: Response) {
    try {
      const { stream, mimeType, name } =
        await this.albumsService.getFileStream(fileId);

      res.set({
        'Content-Type': mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(name)}"`,
        'Cache-Control': 'public, max-age=3600',
      });

      stream.pipe(res);
    } catch (error: unknown) {
      console.error(`[getFileContent] Error streaming file ${fileId}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get file';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:read')
  @ApiOperation({ summary: 'Get album by ID' })
  @ApiSuccessResponse({ description: 'Album retrieved successfully' })
  async findOne(@Param('id') id: string) {
    const album = await this.albumsService.findOne(id);
    return ResponseBuilder.success(album, 'Album retrieved successfully');
  }

  @Post(':id/files')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:update')
  @ApiOperation({ summary: 'Add files to album' })
  @ApiSuccessResponse({ description: 'Files added to album successfully' })
  async addFiles(
    @Param('id') id: string,
    @Body() addFilesDto: AddFilesToAlbumDto,
  ) {
    const album = await this.albumsService.addFiles(id, addFilesDto);
    return ResponseBuilder.success(album, 'Files added to album successfully');
  }

  @Delete(':id/files')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:update')
  @ApiOperation({ summary: 'Soft delete files from album (move to trash)' })
  @ApiSuccessResponse({ description: 'Files moved to trash successfully' })
  async removeFiles(
    @Param('id') id: string,
    @Body() removeFilesDto: RemoveFilesFromAlbumDto,
  ) {
    const result = await this.albumsService.removeFiles(id, removeFilesDto);
    return ResponseBuilder.success(result, result.message);
  }

  @Get(':id/deleted-files')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:read')
  @ApiOperation({ summary: 'Get deleted files in album (trash)' })
  @ApiSuccessResponse({ description: 'Deleted files retrieved successfully' })
  async getDeletedFiles(@Param('id') id: string) {
    const files = await this.albumsService.getDeletedFiles(id);
    return ResponseBuilder.success(
      files,
      'Deleted files retrieved successfully',
    );
  }

  @Patch(':id/files/restore')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:update')
  @ApiOperation({ summary: 'Restore soft-deleted files in album' })
  @ApiSuccessResponse({ description: 'Files restored successfully' })
  async restoreFiles(
    @Param('id') id: string,
    @Body() removeFilesDto: RemoveFilesFromAlbumDto,
  ) {
    const result = await this.albumsService.restoreFiles(id, removeFilesDto);
    return ResponseBuilder.success(result, result.message);
  }

  @Delete(':id/files/force')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:delete')
  @ApiOperation({ summary: 'Permanently delete files (OneDrive + DB)' })
  @ApiSuccessResponse({ description: 'Files permanently deleted' })
  async forceDeleteFiles(
    @Param('id') id: string,
    @Body() removeFilesDto: RemoveFilesFromAlbumDto,
  ) {
    const result = await this.albumsService.forceDeleteFiles(
      id,
      removeFilesDto,
    );
    return ResponseBuilder.success(result, result.message);
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:update')
  @ApiOperation({ summary: 'Generate share token for album' })
  @ApiSuccessResponse({ description: 'Share token generated successfully' })
  async generateShareToken(
    @Param('id') id: string,
    @Body() generateShareTokenDto: GenerateShareTokenDto,
  ) {
    const album = await this.albumsService.generateShareToken(
      id,
      generateShareTokenDto,
    );
    return ResponseBuilder.success(album, 'Share token generated successfully');
  }

  @Delete(':id/share')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:update')
  @ApiOperation({ summary: 'Revoke share token' })
  @ApiSuccessResponse({ description: 'Share token revoked successfully' })
  async revokeShareToken(@Param('id') id: string) {
    const album = await this.albumsService.revokeShareToken(id);
    return ResponseBuilder.success(album, 'Share token revoked successfully');
  }

  @Post(':id/upload-image')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:update')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple images to album' })
  @ApiSuccessResponse({ description: 'Images uploaded to album successfully' })
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadImageDto: UploadImageToAlbumDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    for (const file of files) {
      if (!file.mimetype || !file.mimetype.startsWith('image/')) {
        throw new BadRequestException(
          `File ${file.originalname} must be an image`,
        );
      }
    }

    try {
      const album = await this.albumsService.uploadImagesToAlbum(
        id,
        files,
        uploadImageDto,
        user.userId,
      );
      return ResponseBuilder.success(
        album,
        'Image uploaded to album successfully',
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to upload images';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:update')
  @ApiOperation({ summary: 'Update album' })
  @ApiSuccessResponse({ description: 'Album updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateAlbumDto: UpdateAlbumDto,
  ) {
    const album = await this.albumsService.update(id, updateAlbumDto);
    return ResponseBuilder.success(album, 'Album updated successfully');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:delete')
  @ApiOperation({ summary: 'Delete album (soft delete)' })
  @ApiSuccessResponse({ description: 'Album deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.albumsService.remove(id);
    return ResponseBuilder.deleted('Album deleted successfully');
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:update')
  @ApiOperation({ summary: 'Restore a soft-deleted album' })
  @ApiSuccessResponse({ description: 'Album restored successfully' })
  async restore(@Param('id') id: string) {
    const album = await this.albumsService.restore(id);
    return ResponseBuilder.success(album, 'Album restored successfully');
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('albums:delete')
  @ApiOperation({ summary: 'Permanently delete album (OneDrive + DB)' })
  @ApiSuccessResponse({ description: 'Album permanently deleted' })
  async hardDelete(@Param('id') id: string) {
    const result = await this.albumsService.forceDelete(id);
    return ResponseBuilder.deleted(result.message);
  }
}
