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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser, type AuthenticatedUser } from '../auth/get-user.decorator';
import { ProductImageService } from './product-image.service';
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
  CreateProductDto,
  QueryProductDto,
  UpdateProductDto,
  ViewProductDto,
} from './dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@ApiExtraModels(
  ViewProductDto,
  CreateProductDto,
  UpdateProductDto,
  QueryProductDto,
)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productImageService: ProductImageService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @RequirePermissions('products:create')
  @ApiOperation({ summary: 'Create a new product' })
  @ApiCreatedSuccessResponse({ description: 'Product created successfully' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiErrorResponse({ description: 'Error occurred while creating product' })
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() file?: Express.Multer.File,
    @GetUser() user?: AuthenticatedUser,
  ) {
    // Create product first
    const product = await this.productsService.create(createProductDto);

    let imageFileId: string | undefined;
    // Upload image if provided
    if (file && product.oneDriveFolderId && user) {
      try {
        const uploadResult = await this.productImageService.uploadProductImage(
          file,
          product.id,
          product.oneDriveFolderId,
          user.userId,
        );
        imageFileId = uploadResult.id;

        // Update product with image file ID
        await this.productsService.update(product.id, {
          imageFileId,
        });
      } catch (error) {
        console.error('Failed to upload product image:', error);
        // Don't fail the entire request if image upload fails
      }
    }

    return ResponseBuilder.created(product, 'Product created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with pagination' })
  @ApiPaginatedResponse(ViewProductDto, {
    description: 'Paginated list of products',
  })
  @ApiErrorResponse({ description: 'Error occurred while retrieving products' })
  async findAll(
    @Query() query: QueryProductDto,
    @Query('isActive') isActive?: boolean,
  ) {
    const {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      minStock,
      maxStock,
    }: QueryProductDto = query;

    const result = await this.productsService.findAll({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      isActive,
      minStock,
      maxStock,
    });

    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Products retrieved successfully',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiStandardResponse(ViewProductDto, {
    description: 'Product found successfully',
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return ResponseBuilder.success(product, 'Product retrieved successfully');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @RequirePermissions('products:update')
  @ApiOperation({ summary: 'Update a product by ID' })
  @ApiUpdatedSuccessResponse({ description: 'Product updated successfully' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
    @GetUser() user?: AuthenticatedUser,
  ) {
    // Get existing product to access OneDrive folder
    const existingProduct = await this.productsService.findOne(id);
    if (!existingProduct) {
      throw new Error('Product not found');
    }

    let imageFileId: string | undefined;
    let oneDriveFolderId = existingProduct.oneDriveFolderId;

    // Upload image if provided
    if (file && user) {
      try {
        // Create OneDrive folder if it doesn't exist
        if (!oneDriveFolderId) {
          const folderName = `${existingProduct.name}_${id}`;
          oneDriveFolderId = await this.productImageService.createProductFolder(
            id,
            folderName,
          );

          // Update product with OneDrive folder ID
          await this.productsService.update(id, {
            oneDriveFolderId,
          });
        }

        // Upload the image
        const uploadResult = await this.productImageService.uploadProductImage(
          file,
          id,
          oneDriveFolderId,
          user.userId,
        );
        imageFileId = uploadResult.id;
      } catch (error) {
        console.error('Failed to upload product image:', error);
        // Don't fail the entire request if image upload fails
      }
    }

    const product = await this.productsService.update(id, {
      ...updateProductDto,
      ...(imageFileId && { imageFileId }),
    });
    return ResponseBuilder.updated(product, 'Product updated successfully');
  }

  @Get('deleted')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('products:read')
  @ApiOperation({ summary: 'Get all deleted products' })
  @ApiPaginatedResponse(ViewProductDto, {
    description: 'Paginated list of deleted products',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findDeleted(@Query() query: QueryProductDto) {
    const {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      isActive,
      minStock,
      maxStock,
    }: QueryProductDto = query;

    const result = await this.productsService.findDeleted({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      isActive,
      minStock,
      maxStock,
    });

    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Deleted products retrieved successfully',
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('products:delete')
  @ApiOperation({ summary: 'Soft delete a product by ID' })
  @ApiDeletedSuccessResponse({ description: 'Product deleted successfully' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async remove(@Param('id') id: string) {
    await this.productsService.remove(id);
    return ResponseBuilder.deleted('Product deleted successfully');
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('products:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted product' })
  @ApiUpdatedSuccessResponse({
    description: 'Product restored successfully',
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async restore(@Param('id') id: string) {
    const product = await this.productsService.restore(id);
    return ResponseBuilder.updated(product, 'Product restored successfully');
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('products:hard-delete')
  @ApiOperation({ summary: 'Permanently delete a product by ID' })
  @ApiDeletedSuccessResponse({ description: 'Product permanently deleted' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async hardDelete(@Param('id') id: string) {
    await this.productsService.hardDelete(id);
    return ResponseBuilder.deleted('Product permanently deleted');
  }
}
