import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
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
  CreatePackageDto,
  QueryPackageDto,
  UpdatePackageDto,
  ViewPackageDto,
} from './dto';
import { UpdatePackageServicesDto } from './dto/update-package-services.dto';
import { PackagesService } from './packages.service';

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

  private validateImageFiles(
    coverImage?: Express.Multer.File,
    galleryImages: Express.Multer.File[] = [],
  ) {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    const maxFileSize = 5 * 1024 * 1024;

    const allImages = [coverImage, ...galleryImages].filter(
      (file): file is Express.Multer.File => Boolean(file),
    );

    for (const file of allImages) {
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid image format for ${file.originalname}. Only JPG, JPEG, PNG, GIF, and WEBP are allowed.`,
        );
      }

      if (file.size > maxFileSize) {
        throw new BadRequestException(
          `Image ${file.originalname} exceeds 5MB size limit.`,
        );
      }
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('packages:create')
  @ApiOperation({ summary: 'Create a new package' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'coverImage', maxCount: 1 },
      { name: 'galleryImages', maxCount: 20 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiCreatedSuccessResponse({ description: 'Package created successfully' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiErrorResponse({ description: 'Error occurred while creating package' })
  async create(
    @Body() createPackageDto: CreatePackageDto,
    @UploadedFiles()
    files?: {
      coverImage?: Express.Multer.File[];
      galleryImages?: Express.Multer.File[];
    },
  ) {
    const coverImage = files?.coverImage?.[0];
    const galleryImages = files?.galleryImages ?? [];

    this.validateImageFiles(coverImage, galleryImages);

    const package_ = await this.packagesService.createWithImages(
      createPackageDto,
      coverImage,
      galleryImages,
    );
    return ResponseBuilder.created(package_, 'Package created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all packages with pagination' })
  @ApiPaginatedResponse(ViewPackageDto, {
    description: 'Paginated list of packages',
  })
  @ApiErrorResponse({ description: 'Error occurred while retrieving packages' })
  async findAll(
    @Query() query: QueryPackageDto,
    @Query('includeServices') includeServices: boolean,
    @Query('isActive') isActive: boolean,
  ) {
    const queryParams = { ...query, includeServices, isActive };
    const result = await this.packagesService.findAll(queryParams);

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
    description: 'Package found successfully',
  })
  @ApiNotFoundResponse({ description: 'Package not found' })
  async findOne(@Param('id') id: string) {
    const package_ = await this.packagesService.findOne(id);
    return ResponseBuilder.success(package_, 'Package retrieved successfully');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('packages:update')
  @ApiOperation({ summary: 'Update a package by ID' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'coverImage', maxCount: 1 },
      { name: 'galleryImages', maxCount: 20 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiUpdatedSuccessResponse({ description: 'Package updated successfully' })
  @ApiNotFoundResponse({ description: 'Package not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  async update(
    @Param('id') id: string,
    @Body() updatePackageDto: UpdatePackageDto,
    @UploadedFiles()
    files?: {
      coverImage?: Express.Multer.File[];
      galleryImages?: Express.Multer.File[];
    },
  ) {
    const coverImage = files?.coverImage?.[0];
    const galleryImages = files?.galleryImages ?? [];

    this.validateImageFiles(coverImage, galleryImages);

    const package_ = await this.packagesService.updateWithImages(
      id,
      updatePackageDto,
      coverImage,
      galleryImages,
    );
    return ResponseBuilder.updated(package_, 'Package updated successfully');
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('packages:update')
  @ApiOperation({ summary: 'Toggle package active status' })
  @ApiUpdatedSuccessResponse({
    description: 'Package status toggled successfully',
  })
  @ApiNotFoundResponse({ description: 'Package not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async toggleActiveStatus(@Param('id') id: string) {
    const package_ = await this.packagesService.toggleActiveStatus(id);
    return ResponseBuilder.updated(
      package_,
      'Package status toggled successfully',
    );
  }

  @Get('deleted')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('packages:read')
  @ApiOperation({ summary: 'Get all deleted packages' })
  @ApiPaginatedResponse(ViewPackageDto, {
    description: 'Paginated list of deleted packages',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findDeleted(
    @Query() query: QueryPackageDto,
    @Query('includeServices') includeServices: boolean,
    @Query('isActive') isActive: boolean,
  ) {
    const queryParams = { ...query, includeServices, isActive };
    const result = await this.packagesService.findDeleted(queryParams);

    // Check if result has pagination data
    if (
      typeof result === 'object' &&
      'data' in result &&
      'pagination' in result
    ) {
      return ResponseBuilder.paginated(
        result.data,
        result.pagination,
        'Deleted packages retrieved successfully',
      );
    }

    // Return simple array without pagination
    return ResponseBuilder.success(
      result,
      'Deleted packages retrieved successfully',
    );
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('packages:update')
  @ApiOperation({ summary: 'Deactivate a package by ID' })
  @ApiUpdatedSuccessResponse({
    description: 'Package deactivated successfully',
  })
  @ApiNotFoundResponse({ description: 'Package not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async deactivate(@Param('id') id: string) {
    const package_ = await this.packagesService.deactivate(id);
    return ResponseBuilder.updated(package_, 'Package deactivated successfully');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('packages:delete')
  @ApiOperation({ summary: 'Soft delete a package by ID' })
  @ApiDeletedSuccessResponse({ description: 'Package deleted successfully' })
  @ApiNotFoundResponse({ description: 'Package not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async remove(@Param('id') id: string) {
    await this.packagesService.remove(id);
    return ResponseBuilder.deleted('Package deleted successfully');
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('packages:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted package' })
  @ApiUpdatedSuccessResponse({
    description: 'Package restored successfully',
  })
  @ApiNotFoundResponse({ description: 'Package not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async restore(@Param('id') id: string) {
    const package_ = await this.packagesService.restore(id);
    return ResponseBuilder.updated(package_, 'Package restored successfully');
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('packages:hard-delete')
  @ApiOperation({ summary: 'Permanently delete a package by ID' })
  @ApiDeletedSuccessResponse({ description: 'Package permanently deleted' })
  @ApiNotFoundResponse({ description: 'Package not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async hardDelete(@Param('id') id: string) {
    await this.packagesService.hardDelete(id);
    return ResponseBuilder.deleted('Package permanently deleted');
  }

  @Get(':id/services')
  @ApiOperation({ summary: 'Get all services in a package' })
  @ApiStandardResponse(Array<any>, {
    description: 'Package services retrieved successfully',
  })
  @ApiNotFoundResponse({ description: 'Package not found' })
  async getPackageServices(@Param('id') id: string) {
    const services = await this.packagesService.getPackageServices(id);
    return ResponseBuilder.success(
      services,
      'Package services retrieved successfully',
    );
  }

  @Put(':id/services')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('packages:update')
  @ApiOperation({ summary: 'Update services in a package' })
  @ApiUpdatedSuccessResponse({
    description: 'Package services updated successfully',
  })
  @ApiNotFoundResponse({ description: 'Package not found' })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
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
