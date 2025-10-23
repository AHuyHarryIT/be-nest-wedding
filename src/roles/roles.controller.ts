import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiResponse,
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
  ApiSuccessResponse,
  ApiUnauthorizedResponse,
  ApiUpdatedSuccessResponse,
  ResponseBuilder,
} from '../common';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { QueryRoleDto } from './dto';
import {
  AssignPermissionsDto,
  RevokePermissionsDto,
} from './dto/assign-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ViewRoleDto, ViewRolePermissionDto } from './dto/view-role.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiExtraModels(
  ViewRoleDto,
  ViewRolePermissionDto,
  CreateRoleDto,
  UpdateRoleDto,
  QueryRoleDto,
  AssignPermissionsDto,
  RevokePermissionsDto,
)
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('roles:create')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiCreatedSuccessResponse({ description: 'Role created successfully' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiErrorResponse({ description: 'Error occurred while creating role' })
  create(@Body() createRoleDto: CreateRoleDto) {
    const role = this.rolesService.create(createRoleDto);
    return ResponseBuilder.created(role, 'Role created successfully');
  }

  @Get()
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'Get all roles with pagination' })
  @ApiPaginatedResponse(ViewRoleDto, {
    description: 'Paginated list of roles with their permissions',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findAll(@Query() query: QueryRoleDto) {
    const { page = 1, limit = 10, search, sortBy, sortOrder } = query;
    const result = await this.rolesService.findAll({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });

    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Roles retrieved successfully',
    );
  }

  @Get(':id')
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiStandardResponse(ViewRoleDto, {
    description: 'Role found successfully with permissions',
  })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findOne(@Param('id') id: string) {
    const role = await this.rolesService.findOne(id);
    return ResponseBuilder.success(role, 'Role retrieved successfully');
  }

  @Patch(':id')
  @RequirePermissions('roles:update')
  @ApiOperation({ summary: 'Update a role by ID' })
  @ApiUpdatedSuccessResponse({ description: 'Role updated successfully' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    const role = await this.rolesService.update(id, updateRoleDto);
    return ResponseBuilder.success(role, 'Role updated successfully');
  }

  @Delete(':id')
  @RequirePermissions('roles:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role by ID' })
  @ApiDeletedSuccessResponse({ description: 'Role deleted successfully' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async remove(@Param('id') id: string) {
    await this.rolesService.remove(id);
    return ResponseBuilder.deleted('Role deleted successfully');
  }

  @Post(':id/permissions/assign')
  @RequirePermissions('roles:update')
  @ApiOperation({ summary: 'Assign permissions to a role' })
  @ApiResponse({
    status: 200,
    description: 'Permissions assigned successfully',
  })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse({ description: 'Invalid permission IDs' })
  @ApiConflictResponse({
    description: 'All permissions already assigned to this role',
  })
  async assignPermissions(
    @Param('id') id: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ) {
    const role = await this.rolesService.assignPermissions(
      id,
      assignPermissionsDto.permissionIds,
    );
    return ResponseBuilder.success(role, 'Permissions assigned successfully');
  }

  @Post(':id/permissions/revoke')
  @RequirePermissions('roles:update')
  @ApiOperation({ summary: 'Revoke permissions from a role' })
  @ApiSuccessResponse({
    description: 'Permissions revoked successfully',
  })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse({
    description: 'None of the specified permissions are assigned to this role',
  })
  async revokePermissions(
    @Param('id') id: string,
    @Body() revokePermissionsDto: RevokePermissionsDto,
  ) {
    const role = await this.rolesService.revokePermissions(
      id,
      revokePermissionsDto.permissionIds,
    );
    return ResponseBuilder.success(role, 'Permissions revoked successfully');
  }

  @Get(':id/permissions')
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'Get all permissions for a role' })
  @ApiSuccessResponse({
    description: 'List of permissions for the role',
  })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async getRolePermissions(@Param('id') id: string) {
    const permissions = await this.rolesService.getRolePermissions(id);
    return ResponseBuilder.success(
      permissions,
      'Role permissions retrieved successfully',
    );
  }
}
