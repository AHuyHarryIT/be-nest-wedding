import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AlbumsService } from './albums.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import {
  ApiCreatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiStandardResponse,
  ApiUpdatedSuccessResponse,
  ApiErrorResponse,
} from '../common/decorators/api-response.decorator';
import { ResponseBuilder } from '../common/utils/response-builder.util';

@ApiTags('Albums')
@Controller('albums')
export class AlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new album' })
  @ApiCreatedSuccessResponse({ description: 'Album created successfully' })
  @ApiErrorResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createAlbumDto: CreateAlbumDto) {
    const album = await this.albumsService.create(createAlbumDto);
    return ResponseBuilder.created(album, 'Album created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all albums' })
  @ApiStandardResponse(Object, { description: 'Albums retrieved successfully' })
  async findAll() {
    const albums = await this.albumsService.findAll();
    return ResponseBuilder.success(albums, 'Albums retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an album by ID' })
  @ApiStandardResponse(Object, { description: 'Album retrieved successfully' })
  @ApiErrorResponse({ status: 404, description: 'Album not found' })
  async findOne(@Param('id') id: string) {
    const album = await this.albumsService.findOne(id);
    return ResponseBuilder.success(album, 'Album retrieved successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an album' })
  @ApiUpdatedSuccessResponse({ description: 'Album updated successfully' })
  @ApiErrorResponse({ status: 404, description: 'Album not found' })
  async update(
    @Param('id') id: string,
    @Body() updateAlbumDto: UpdateAlbumDto,
  ) {
    const album = await this.albumsService.update(id, updateAlbumDto);
    return ResponseBuilder.updated(album, 'Album updated successfully');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an album' })
  @ApiDeletedSuccessResponse({ description: 'Album deleted successfully' })
  @ApiErrorResponse({ status: 404, description: 'Album not found' })
  async remove(@Param('id') id: string) {
    await this.albumsService.remove(id);
    return ResponseBuilder.deleted('Album deleted successfully');
  }
}
