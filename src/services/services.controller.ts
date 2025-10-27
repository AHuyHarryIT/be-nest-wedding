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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('services:create')
  @ApiOperation({ summary: 'Create a new service' })
  @ApiCreatedSuccessResponse({ description: 'Service created successfully' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiErrorResponse({ description: 'Error occurred while creating service' })
  async create(@Body() createServiceDto: CreateServiceDto) {
    const service = await this.servicesService.create(createServiceDto);
    return ResponseBuilder.created(service, 'Service created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all services with pagination' })
  @ApiPaginatedResponse(ViewServiceDto, {
    description: 'Services retrieved successfully',
  })
  @ApiErrorResponse({ description: 'Error occurred while retrieving services' })
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by ID' })
  @ApiStandardResponse(ViewServiceDto, {
    description: 'Service retrieved successfully',
  })
  @ApiNotFoundResponse({ description: 'Service not found' })
  async findOne(@Param('id') id: string) {
    const service = await this.servicesService.findOne(id);
    return ResponseBuilder.success(service, 'Service retrieved successfully');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('services:update')
  @ApiOperation({ summary: 'Update a service by ID' })
  @ApiUpdatedSuccessResponse({ description: 'Service updated successfully' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    const service = await this.servicesService.update(id, updateServiceDto);
    return ResponseBuilder.updated(service, 'Service updated successfully');
  }

  @Get('deleted')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
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

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
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
}
