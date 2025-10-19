import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser, type AuthenticatedUser } from '../auth/get-user.decorator';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard) // Protect all routes in this controller
@ApiBearerAuth('JWT-auth')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized access' })
  create(
    @Body() createRoleDto: CreateRoleDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    // Now you have access to the authenticated user
    console.log('User creating role:', user.userId);
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, description: 'List of all roles' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized access' })
  findAll(@GetUser() user: AuthenticatedUser) {
    console.log('User accessing roles:', user.userId);
    return this.rolesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiResponse({ status: 200, description: 'Role found successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized access' })
  findOne(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    console.log('User accessing role:', user.userId);
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a role by ID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized access' })
  update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    console.log('User updating role:', user.userId);
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a role by ID' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized access' })
  remove(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    console.log('User deleting role:', user.userId);
    return this.rolesService.remove(id);
  }
}
