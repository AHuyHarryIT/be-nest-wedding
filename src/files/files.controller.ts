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
import { FilesService } from './files.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import {
  ApiCreatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiStandardResponse,
  ApiUpdatedSuccessResponse,
  ApiErrorResponse,
} from '../common/decorators/api-response.decorator';
import { ResponseBuilder } from '../common/utils/response-builder.util';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new file record' })
  @ApiCreatedSuccessResponse({ description: 'File created successfully' })
  @ApiErrorResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createFileDto: CreateFileDto) {
    const file = await this.filesService.create(createFileDto);
    return ResponseBuilder.created(file, 'File created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all files' })
  @ApiStandardResponse(Object, { description: 'Files retrieved successfully' })
  async findAll() {
    const files = await this.filesService.findAll();
    return ResponseBuilder.success(files, 'Files retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a file by ID' })
  @ApiStandardResponse(Object, { description: 'File retrieved successfully' })
  @ApiErrorResponse({ status: 404, description: 'File not found' })
  async findOne(@Param('id') id: string) {
    const file = await this.filesService.findOne(id);
    return ResponseBuilder.success(file, 'File retrieved successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a file' })
  @ApiUpdatedSuccessResponse({ description: 'File updated successfully' })
  @ApiErrorResponse({ status: 404, description: 'File not found' })
  async update(@Param('id') id: string, @Body() updateFileDto: UpdateFileDto) {
    const file = await this.filesService.update(id, updateFileDto);
    return ResponseBuilder.updated(file, 'File updated successfully');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiDeletedSuccessResponse({ description: 'File deleted successfully' })
  @ApiErrorResponse({ status: 404, description: 'File not found' })
  async remove(@Param('id') id: string) {
    await this.filesService.remove(id);
    return ResponseBuilder.deleted('File deleted successfully');
  }
}
