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
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
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

  @Get('share/:token')
  @ApiOperation({
    summary: 'Get album by share token (no authentication required)',
  })
  @ApiSuccessResponse({ description: 'Album retrieved successfully' })
  async findByShareToken(@Param('token') token: string) {
    const album = await this.albumsService.findByShareToken(token);
    return ResponseBuilder.success(album, 'Album retrieved successfully');
  }

  @Get('file/:fileId/download')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Download/stream file from OneDrive' })
  async downloadFile(@Param('fileId') fileId: string, @Res() res: Response) {
    try {
      const fileStream = await this.albumsService.getFileStream(fileId);
      res.set({
        'Content-Type': fileStream.mimeType,
        'Content-Length': fileStream.byteSize,
        'Content-Disposition': `attachment; filename="${fileStream.name}"`,
      });
      fileStream.stream.pipe(res);
    } catch (error: unknown) {
      console.error(`[downloadFile] Error downloading file ${fileId}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to download file';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  @Get('file/:fileId/thumbnail')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get thumbnail URL for a file' })
  @ApiSuccessResponse({ description: 'Thumbnail URL retrieved successfully' })
  async getThumbnail(@Param('fileId') fileId: string) {
    try {
      const thumbnailUrl = await this.albumsService.getThumbnailUrl(fileId);
      return ResponseBuilder.success(
        { url: thumbnailUrl },
        'Thumbnail URL retrieved successfully',
      );
    } catch (error: unknown) {
      console.error(`[getThumbnail] Error getting thumbnail ${fileId}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get thumbnail';
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
  @ApiOperation({ summary: 'Remove files from album' })
  @ApiSuccessResponse({ description: 'Files removed from album successfully' })
  async removeFiles(
    @Param('id') id: string,
    @Body() removeFilesDto: RemoveFilesFromAlbumDto,
  ) {
    const album = await this.albumsService.removeFiles(id, removeFilesDto);
    return ResponseBuilder.success(
      album,
      'Files removed from album successfully',
    );
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
        `${files.length} image(s) uploaded to album successfully`,
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
}
