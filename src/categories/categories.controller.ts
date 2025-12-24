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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import {
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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@ApiTags('Categories')
@ApiExtraModels(CreateCategoryDto, UpdateCategoryDto)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('categories:create')
  @ApiOperation({ summary: 'Create a new category' })
  @ApiCreatedSuccessResponse({ description: 'Category created successfully' })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiErrorResponse({ description: 'Error occurred while creating category' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    const category = await this.categoriesService.create(createCategoryDto);
    return ResponseBuilder.created(category, 'Category created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories with pagination' })
  @ApiPaginatedResponse(Category as any, {
    description: 'Paginated list of categories',
  })
  @ApiErrorResponse({
    description: 'Error occurred while retrieving categories',
  })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const { data, total } = await this.categoriesService.findAll(
      skip,
      parseInt(limit),
    );
    return ResponseBuilder.paginated(
      data,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      },
      'Categories retrieved successfully',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiStandardResponse(Category as any, {
    description: 'Category details',
  })
  @ApiNotFoundResponse()
  @ApiErrorResponse({ description: 'Category not found' })
  async findOne(@Param('id') id: string) {
    const category = await this.categoriesService.findOne(id);
    return ResponseBuilder.success(category);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('categories:update')
  @ApiOperation({ summary: 'Update a category' })
  @ApiUpdatedSuccessResponse({ description: 'Category updated successfully' })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiErrorResponse({ description: 'Error occurred while updating category' })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = await this.categoriesService.update(id, updateCategoryDto);
    return ResponseBuilder.success(category, 'Category updated successfully');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('categories:delete')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiDeletedSuccessResponse({ description: 'Category deleted successfully' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiErrorResponse({ description: 'Error occurred while deleting category' })
  async remove(@Param('id') id: string) {
    await this.categoriesService.remove(id);
    return ResponseBuilder.success(null, 'Category deleted successfully');
  }
}
