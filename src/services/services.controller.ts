import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiConflictResponse,
  ApiCreatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiErrorResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiPaginatedResponse,
  ApiStandardResponse,
  ApiUnauthorizedResponse,
  ApiUpdatedSuccessResponse,
  ResponseBuilder,
} from '../common';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import {
  CreateServiceDto,
  QueryServiceDto,
  UpdateServiceDto,
  ViewServiceDto,
} from './dto';
import { ServicesService } from './services.service';

@ApiTags('Services')
@ApiExtraModels(
  ViewServiceDto,
  CreateServiceDto,
  UpdateServiceDto,
  QueryServiceDto,
)
@Controller('services')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @RequirePermissions('services:create')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new service with optional image' })
  @ApiCreatedSuccessResponse({ description: 'Service created successfully' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiErrorResponse({ description: 'Error occurred while creating service' })
  async create(
    @Body() createServiceDto: CreateServiceDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(jpg|jpeg|png|gif|webp)$' }),
        ],
        fileIsRequired: false,
      }),
    )
    image?: Express.Multer.File,
  ) {
    const service = await this.servicesService.createWithImage(
      createServiceDto,
      image?.buffer,
      image?.originalname,
    );
    return ResponseBuilder.created(service, 'Service created successfully');
  }

  @Get()
  @RequirePermissions('services:read')
  @ApiOperation({ summary: 'Get all services with pagination' })
  @ApiPaginatedResponse(ViewServiceDto, {
    description: 'Services retrieved successfully',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findAll(
    @Query() query: QueryServiceDto,
    @Query('isActive') isActive?: boolean,
  ) {
    const {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      minPrice,
      maxPrice,
    }: QueryServiceDto = query;

    const result = await this.servicesService.findAll({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      isActive,
      minPrice,
      maxPrice,
    });

    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Services retrieved successfully',
    );
  }

  @Get('deleted')
  @RequirePermissions('services:read:deleted')
  @ApiOperation({ summary: 'Get all deleted services' })
  @ApiPaginatedResponse(ViewServiceDto, {
    description: 'Paginated list of deleted services',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findDeleted(@Query() query: QueryServiceDto) {
    const {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      isActive,
      minPrice,
      maxPrice,
    }: QueryServiceDto = query;

    const result = await this.servicesService.findDeleted({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      isActive,
      minPrice,
      maxPrice,
    });

    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Deleted services retrieved successfully',
    );
  }

  @Get(':id')
  @RequirePermissions('services:read')
  @ApiOperation({ summary: 'Get a service by ID' })
  @ApiStandardResponse(ViewServiceDto, {
    description: 'Service retrieved successfully',
  })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findOne(@Param('id') id: string) {
    const service = await this.servicesService.findOne(id);
    return ResponseBuilder.success(service, 'Service retrieved successfully');
  }

  @Patch(':id')
  @RequirePermissions('services:update')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a service by ID with optional image' })
  @ApiUpdatedSuccessResponse({ description: 'Service updated successfully' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(jpg|jpeg|png|gif|webp)$' }),
        ],
        fileIsRequired: false,
      }),
    )
    image?: Express.Multer.File,
  ) {
    const service = await this.servicesService.updateWithImage(
      id,
      updateServiceDto,
      image?.buffer,
      image?.originalname,
    );
    return ResponseBuilder.updated(service, 'Service updated successfully');
  }

  @Patch(':id/deactivate')
  @RequirePermissions('services:update')
  @ApiOperation({ summary: 'Deactivate a service by ID' })
  @ApiUpdatedSuccessResponse({ description: 'Service deactivated successfully' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async deactivate(@Param('id') id: string) {
    const service = await this.servicesService.deactivate(id);
    return ResponseBuilder.updated(service, 'Service deactivated successfully');
  }

  @Delete(':id')
  @RequirePermissions('services:delete')
  @ApiOperation({ summary: 'Soft delete a service by ID' })
  @ApiDeletedSuccessResponse({ description: 'Service deleted successfully' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async remove(@Param('id') id: string) {
    await this.servicesService.remove(id);
    return ResponseBuilder.deleted('Service deleted successfully');
  }

  @Patch(':id/restore')
  @RequirePermissions('services:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted service' })
  @ApiUpdatedSuccessResponse({
    description: 'Service restored successfully',
  })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async restore(@Param('id') id: string) {
    const service = await this.servicesService.restore(id);
    return ResponseBuilder.updated(service, 'Service restored successfully');
  }

  @Delete(':id/hard')
  @RequirePermissions('services:hard-delete')
  @ApiOperation({ summary: 'Permanently delete a service by ID' })
  @ApiDeletedSuccessResponse({ description: 'Service permanently deleted' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async hardDelete(@Param('id') id: string) {
    await this.servicesService.hardDelete(id);
    return ResponseBuilder.deleted('Service permanently deleted');
  }

  @Post(':id/image')
  @RequirePermissions('services:update')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload or replace service image' })
  @ApiUpdatedSuccessResponse({
    description: 'Service image uploaded successfully',
  })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(jpg|jpeg|png|gif|webp)$' }),
        ],
        fileIsRequired: true,
      }),
    )
    image: Express.Multer.File,
  ) {
    const service = await this.servicesService.uploadServiceImage(
      id,
      image.buffer,
      image.originalname,
    );
    return ResponseBuilder.updated(
      service,
      'Service image uploaded successfully',
    );
  }

  @Delete(':id/image')
  @RequirePermissions('services:update')
  @ApiOperation({ summary: 'Delete service image' })
  @ApiDeletedSuccessResponse({
    description: 'Service image deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  async deleteImage(@Param('id') id: string) {
    const service = await this.servicesService.deleteServiceImage(id);
    return ResponseBuilder.updated(
      service,
      'Service image deleted successfully',
    );
  }
}
