import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiPaginatedResponse,
  ApiStandardResponse,
  ApiUnauthorizedResponse,
  PaginationQueryDto,
  ResponseBuilder,
} from '../common';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ViewPermissionDto } from './dto/view-permission.dto';
import { PermissionsService } from './permissions.service';

@ApiTags('Permissions')
@ApiExtraModels(ViewPermissionDto, PaginationQueryDto)
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('permissions:read')
  @ApiOperation({ summary: 'Get all permissions with pagination' })
  @ApiPaginatedResponse(ViewPermissionDto, {
    description: 'Paginated list of permissions',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findAll(@Query() paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10, search, sortBy, sortOrder } = paginationQuery;
    const result = await this.permissionsService.findAll({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });

    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Permissions retrieved successfully',
    );
  }

  @Get(':id')
  @RequirePermissions('permissions:read')
  @ApiOperation({ summary: 'Get a permission by ID' })
  @ApiStandardResponse(ViewPermissionDto, {
    description: 'Permission found successfully with assigned roles',
  })
  @ApiNotFoundResponse({ description: 'Permission not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findOne(@Param('id') id: string) {
    const permission = await this.permissionsService.findOne(id);
    return ResponseBuilder.success(
      permission,
      'Permission retrieved successfully',
    );
  }

  @Get('key/:key')
  @RequirePermissions('permissions:read')
  @ApiOperation({ summary: 'Get a permission by key' })
  @ApiResponse({ status: 200, description: 'Permission found successfully' })
  @ApiNotFoundResponse({ description: 'Permission not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findByKey(@Param('key') key: string) {
    const permission = await this.permissionsService.findByKey(key);
    return ResponseBuilder.success(
      permission,
      'Permission retrieved successfully',
    );
  }
}
