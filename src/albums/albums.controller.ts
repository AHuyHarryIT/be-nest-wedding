import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiExtraModels,
} from '@nestjs/swagger';
import { AlbumsService } from './albums.service';
import {
  CreateAlbumDto,
  UpdateAlbumDto,
  AddFilesToAlbumDto,
  RemoveFilesFromAlbumDto,
  GenerateShareTokenDto,
  QueryAlbumDto,
  ViewAlbumDto,
} from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import {
  ApiCreatedSuccessResponse,
  ApiSuccessResponse,
  ApiPaginatedResponse,
} from '../common/decorators/api-response.decorator';

@ApiTags('Albums')
@ApiExtraModels(
  CreateAlbumDto,
  UpdateAlbumDto,
  AddFilesToAlbumDto,
  RemoveFilesFromAlbumDto,
  GenerateShareTokenDto,
  QueryAlbumDto,
  ViewAlbumDto,
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
