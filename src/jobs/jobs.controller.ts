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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { CreateJobDto, QueryJobDto, UpdateJobDto, ViewJobDto } from './dto';
import { JobsService } from './jobs.service';

@ApiTags('Jobs')
@ApiExtraModels(ViewJobDto, CreateJobDto, UpdateJobDto, QueryJobDto)
@Controller('jobs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @RequirePermissions('jobs:create')
  @ApiOperation({ summary: 'Create a new job' })
  @ApiCreatedSuccessResponse({ description: 'Job created successfully' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiErrorResponse({ description: 'Error occurred while creating job' })
  async create(@Body() createJobDto: CreateJobDto) {
    const job = await this.jobsService.create(createJobDto);
    return ResponseBuilder.created(job, 'Job created successfully');
  }

  @Get()
  @RequirePermissions('jobs:read')
  @ApiOperation({ summary: 'Get all jobs with pagination' })
  @ApiPaginatedResponse(ViewJobDto, {
    description: 'Jobs retrieved successfully',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findAll(@Query() query: QueryJobDto) {
    const result = await this.jobsService.findAll(query);
    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Jobs retrieved successfully',
    );
  }

  @Get('active')
  @RequirePermissions('jobs:read')
  @ApiOperation({ summary: 'Get all active jobs' })
  @ApiStandardResponse(ViewJobDto, {
    description: 'Active jobs retrieved successfully',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findActive() {
    const jobs = await this.jobsService.findActiveJobs();
    return ResponseBuilder.success(jobs, 'Active jobs retrieved successfully');
  }

  @Get('deleted')
  @RequirePermissions('jobs:read:deleted')
  @ApiOperation({ summary: 'Get all deleted jobs' })
  @ApiPaginatedResponse(ViewJobDto, {
    description: 'Deleted jobs retrieved successfully',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findDeleted(@Query() query: QueryJobDto) {
    const result = await this.jobsService.findDeleted(query);
    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Deleted jobs retrieved successfully',
    );
  }

  @Get(':id')
  @RequirePermissions('jobs:read')
  @ApiOperation({ summary: 'Get a job by ID' })
  @ApiStandardResponse(ViewJobDto, {
    description: 'Job retrieved successfully',
  })
  @ApiNotFoundResponse({ description: 'Job not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findOne(@Param('id') id: string) {
    const job = await this.jobsService.findOne(id);
    return ResponseBuilder.success(job, 'Job retrieved successfully');
  }

  @Patch(':id')
  @RequirePermissions('jobs:update')
  @ApiOperation({ summary: 'Update a job by ID' })
  @ApiUpdatedSuccessResponse({ description: 'Job updated successfully' })
  @ApiNotFoundResponse({ description: 'Job not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  async update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    const job = await this.jobsService.update(id, updateJobDto);
    return ResponseBuilder.updated(job, 'Job updated successfully');
  }

  @Delete(':id')
  @RequirePermissions('jobs:delete')
  @ApiOperation({ summary: 'Soft delete a job by ID' })
  @ApiDeletedSuccessResponse({ description: 'Job deleted successfully' })
  @ApiNotFoundResponse({ description: 'Job not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async remove(@Param('id') id: string) {
    await this.jobsService.remove(id);
    return ResponseBuilder.deleted('Job deleted successfully');
  }

  @Patch(':id/restore')
  @RequirePermissions('jobs:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted job' })
  @ApiUpdatedSuccessResponse({ description: 'Job restored successfully' })
  @ApiNotFoundResponse({ description: 'Job not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async restore(@Param('id') id: string) {
    const job = await this.jobsService.restore(id);
    return ResponseBuilder.updated(job, 'Job restored successfully');
  }

  @Delete(':id/hard')
  @RequirePermissions('jobs:hard-delete')
  @ApiOperation({ summary: 'Permanently delete a job by ID' })
  @ApiDeletedSuccessResponse({ description: 'Job permanently deleted' })
  @ApiNotFoundResponse({ description: 'Job not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async hardDelete(@Param('id') id: string) {
    await this.jobsService.hardDelete(id);
    return ResponseBuilder.deleted('Job permanently deleted');
  }

  @Patch(':id/toggle-status')
  @RequirePermissions('jobs:update')
  @ApiOperation({ summary: 'Toggle job active status' })
  @ApiUpdatedSuccessResponse({ description: 'Job status updated successfully' })
  @ApiNotFoundResponse({ description: 'Job not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async toggleStatus(@Param('id') id: string) {
    const job = await this.jobsService.toggleActiveStatus(id);
    return ResponseBuilder.updated(job, 'Job status updated successfully');
  }
}
