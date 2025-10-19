import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { ViewServiceDto } from './dto/view-service.dto';
import {
  ApiStandardResponse,
  ApiPaginatedResponse,
  ApiCreatedSuccessResponse,
  ApiUpdatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiErrorResponse,
} from '../common/decorators/api-response.decorator';
import { ResponseBuilder } from '../common/utils/response-builder.util';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new service' })
  @ApiCreatedSuccessResponse({
    description: 'Service created successfully',
  })
  @ApiErrorResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createServiceDto: CreateServiceDto) {
    const service = await this.servicesService.create(createServiceDto);
    return ResponseBuilder.created(service, 'Service created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all services with optional filters' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    description: 'Minimum price filter',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    description: 'Maximum price filter',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field',
    enum: ['name', 'price', 'createdAt', 'updatedAt'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    enum: ['asc', 'desc'],
  })
  @ApiPaginatedResponse(ViewServiceDto, {
    description: 'Services retrieved successfully',
  })
  async findAll(
    @Query('q') q?: string,
    @Query('isActive') isActive?: boolean,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    // Manually convert query parameters
    const queryDto: QueryServiceDto = {
      q,
      isActive: isActive,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy: ['name', 'price', 'createdAt', 'updatedAt'].includes(sortBy || '')
        ? (sortBy as 'name' | 'price' | 'createdAt' | 'updatedAt')
        : undefined,
      sortOrder: ['asc', 'desc'].includes(sortOrder || '')
        ? (sortOrder as 'asc' | 'desc')
        : undefined,
    };
    const result = await this.servicesService.findAll(queryDto);

    // Check if result has pagination data
    if (
      typeof result === 'object' &&
      'data' in result &&
      'pagination' in result
    ) {
      return ResponseBuilder.paginated(
        result.data,
        result.pagination,
        'Services retrieved successfully',
      );
    }

    // Return simple array without pagination
    return ResponseBuilder.success(result, 'Services retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by ID' })
  @ApiStandardResponse(ViewServiceDto, {
    description: 'Service retrieved successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Service not found' })
  async findOne(@Param('id') id: string) {
    const service = await this.servicesService.findOne(id);
    return ResponseBuilder.success(service, 'Service retrieved successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service by ID' })
  @ApiUpdatedSuccessResponse({
    description: 'Service updated successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Service not found' })
  @ApiErrorResponse({ status: 400, description: 'Bad request' })
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    const service = await this.servicesService.update(id, updateServiceDto);
    return ResponseBuilder.updated(service, 'Service updated successfully');
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle service active status' })
  @ApiUpdatedSuccessResponse({
    description: 'Service status toggled successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Service not found' })
  async toggleActiveStatus(@Param('id') id: string) {
    const service = await this.servicesService.toggleActiveStatus(id);
    return ResponseBuilder.updated(
      service,
      'Service status toggled successfully',
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a service by ID' })
  @ApiDeletedSuccessResponse({
    description: 'Service deleted successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Service not found' })
  async remove(@Param('id') id: string) {
    await this.servicesService.remove(id);
    return ResponseBuilder.deleted('Service deleted successfully');
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted service' })
  @ApiUpdatedSuccessResponse({
    description: 'Service restored successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Service not found' })
  async restore(@Param('id') id: string) {
    const service = await this.servicesService.restore(id);
    return ResponseBuilder.updated(service, 'Service restored successfully');
  }
}
