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
  ApiUnauthorizedResponse,
  ApiUpdatedSuccessResponse,
  ResponseBuilder,
} from '../common';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import {
  AssignRolesToUserDto,
  CreateUserDto,
  QueryUserDto,
  UpdateUserDto,
} from './dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiExtraModels(
  CreateUserDto,
  UpdateUserDto,
  QueryUserDto,
  AssignRolesToUserDto,
)
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('users:create')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiCreatedSuccessResponse({ description: 'User created successfully' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  @ApiErrorResponse({ description: 'Error occurred while creating user' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return ResponseBuilder.created(user, 'User created successfully');
  }

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiPaginatedResponse(CreateUserDto, {
    description: 'Paginated list of users with their roles',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findAll(@Query() query: QueryUserDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { search, sortBy, sortOrder } = query;
    const result = await this.usersService.findAll({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });

    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Users retrieved successfully',
    );
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiStandardResponse(CreateUserDto, {
    description: 'User found successfully with roles',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return ResponseBuilder.success(user, 'User retrieved successfully');
  }

  @Patch(':id')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiUpdatedSuccessResponse({ description: 'User updated successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return ResponseBuilder.success(user, 'User updated successfully');
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiDeletedSuccessResponse({ description: 'User deleted successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async remove(@Param('id') id: string) {
    const result = await this.usersService.delete(id);
    return ResponseBuilder.deleted(result.message);
  }

  @Post(':userId/roles')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Assign roles to a user' })
  @ApiResponse({
    status: 200,
    description: 'Roles assigned to user successfully',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Invalid role IDs' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async assignRoles(
    @Param('userId') userId: string,
    @Body() assignRolesDto: AssignRolesToUserDto,
  ) {
    const user = await this.usersService.assignRoles(userId, assignRolesDto);
    return ResponseBuilder.success(user, 'Roles assigned to user successfully');
  }

  @Post(':userId/roles/remove')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Remove roles from a user' })
  @ApiResponse({
    status: 200,
    description: 'Roles removed from user successfully',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Invalid role IDs' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async removeRoles(
    @Param('userId') userId: string,
    @Body() removeRolesDto: AssignRolesToUserDto,
  ) {
    const user = await this.usersService.removeRoles(
      userId,
      removeRolesDto.roleIds,
    );
    return ResponseBuilder.success(
      user,
      'Roles removed from user successfully',
    );
  }
}
