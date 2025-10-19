import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiQuery,
  ApiExtraModels,
} from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { UpdatePackageServicesDto } from './dto/update-package-services.dto';
import { QueryPackageDto } from './dto/query-package.dto';
import { ViewPackageDto } from './dto/view-package.dto';
import {
  ApiStandardResponse,
  ApiPaginatedResponse,
  ApiCreatedSuccessResponse,
  ApiUpdatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiErrorResponse,
} from '../common/decorators/api-response.decorator';
import { ResponseBuilder } from '../common/utils/response-builder.util';

@ApiTags('Packages')
@ApiExtraModels(
  ViewPackageDto,
  CreatePackageDto,
  UpdatePackageDto,
  QueryPackageDto,
  UpdatePackageServicesDto,
)
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new package' })
  @ApiCreatedSuccessResponse({
    description: 'Package created successfully',
  })
  @ApiErrorResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createPackageDto: CreatePackageDto) {
    const package_ = await this.packagesService.create(createPackageDto);
    return ResponseBuilder.created(package_, 'Package created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all packages with optional filters' })
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
  @ApiPaginatedResponse(ViewPackageDto, {
    description: 'Packages retrieved successfully',
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
    const queryDto: QueryPackageDto = {
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
    const result = await this.packagesService.findAll(queryDto);

    // Check if result has pagination data
    if (
      typeof result === 'object' &&
      'data' in result &&
      'pagination' in result
    ) {
      return ResponseBuilder.paginated(
        result.data,
        result.pagination,
        'Packages retrieved successfully',
      );
    }

    // Return simple array without pagination
    return ResponseBuilder.success(result, 'Packages retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a package by ID' })
  @ApiStandardResponse(ViewPackageDto, {
    description: 'Package retrieved successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Package not found' })
  async findOne(@Param('id') id: string) {
    const package_ = await this.packagesService.findOne(id);
    return ResponseBuilder.success(package_, 'Package retrieved successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a package by ID' })
  @ApiUpdatedSuccessResponse({
    description: 'Package updated successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Package not found' })
  @ApiErrorResponse({ status: 400, description: 'Bad request' })
  async update(
    @Param('id') id: string,
    @Body() updatePackageDto: UpdatePackageDto,
  ) {
    const package_ = await this.packagesService.update(id, updatePackageDto);
    return ResponseBuilder.updated(package_, 'Package updated successfully');
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle package active status' })
  @ApiUpdatedSuccessResponse({
    description: 'Package status toggled successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Package not found' })
  async toggleActiveStatus(@Param('id') id: string) {
    const package_ = await this.packagesService.toggleActiveStatus(id);
    return ResponseBuilder.updated(
      package_,
      'Package status toggled successfully',
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a package by ID' })
  @ApiDeletedSuccessResponse({
    description: 'Package deleted successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Package not found' })
  async remove(@Param('id') id: string) {
    await this.packagesService.remove(id);
    return ResponseBuilder.deleted('Package deleted successfully');
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted package' })
  @ApiUpdatedSuccessResponse({
    description: 'Package restored successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Package not found' })
  async restore(@Param('id') id: string) {
    const package_ = await this.packagesService.restore(id);
    return ResponseBuilder.updated(package_, 'Package restored successfully');
  }

  @Get(':id/services')
  @ApiOperation({ summary: 'Get all services in a package' })
  @ApiStandardResponse(Array<any>, {
    description: 'Package services retrieved successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Package not found' })
  async getPackageServices(@Param('id') id: string) {
    const services = await this.packagesService.getPackageServices(id);
    return ResponseBuilder.success(
      services,
      'Package services retrieved successfully',
    );
  }

  @Put(':id/services')
  @ApiOperation({ summary: 'Update services in a package' })
  @ApiUpdatedSuccessResponse({
    description: 'Package services updated successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Package not found' })
  @ApiErrorResponse({ status: 400, description: 'Bad request' })
  async updatePackageServices(
    @Param('id') id: string,
    @Body() updatePackageServicesDto: UpdatePackageServicesDto,
  ) {
    const result = await this.packagesService.updatePackageServices(
      id,
      updatePackageServicesDto,
    );
    return ResponseBuilder.updated(
      result,
      'Package services updated successfully',
    );
  }
}
