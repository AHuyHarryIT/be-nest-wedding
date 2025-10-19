import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  ApiCreatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiErrorResponse,
  ApiPaginatedResponse,
  ApiStandardResponse,
  ApiUpdatedSuccessResponse,
} from '../common/decorators/api-response.decorator';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ViewProductDto } from './dto/view-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiCreatedSuccessResponse({
    description: 'Product created successfully',
  })
  @ApiErrorResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(createProductDto);
    return ResponseBuilder.created(product, 'Product created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with optional filters' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'minStock',
    required: false,
    description: 'Minimum stock quantity',
  })
  @ApiQuery({
    name: 'maxStock',
    required: false,
    description: 'Maximum stock quantity',
  })
  @ApiPaginatedResponse(ViewProductDto, {
    description: 'Products retrieved successfully',
  })
  async findAll(
    @Query('q') q?: string,
    @Query('isActive') isActive?: string,
    @Query('minStock') minStock?: string,
    @Query('maxStock') maxStock?: string,
  ) {
    const products = await this.productsService.findAll(
      q,
      isActive ? isActive === 'true' : undefined,
      minStock ? parseInt(minStock) : undefined,
      maxStock ? parseInt(maxStock) : undefined,
    );
    return ResponseBuilder.success(products, 'Products retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiStandardResponse(Object, {
    description: 'Product retrieved successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    // The service will throw an error if not found, which will be caught by our filters
    const product = await this.productsService.findOne(id);
    return ResponseBuilder.success(product, 'Product retrieved successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiUpdatedSuccessResponse({
    description: 'Product updated successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    // Prisma will throw P2025 error if record not found, handled by PrismaExceptionFilter
    const product = await this.productsService.update(id, updateProductDto);
    return ResponseBuilder.updated(product, 'Product updated successfully');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiDeletedSuccessResponse({
    description: 'Product deleted successfully',
  })
  @ApiErrorResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id') id: string) {
    // Prisma will throw P2025 error if record not found, handled by PrismaExceptionFilter
    await this.productsService.remove(id);
    return ResponseBuilder.deleted('Product deleted successfully');
  }
}
