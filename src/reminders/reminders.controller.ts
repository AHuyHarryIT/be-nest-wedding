import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import {
  ApiCreatedSuccessResponse,
  ApiStandardResponse,
  ApiPaginatedResponse,
  ApiUpdatedSuccessResponse,
  ApiDeletedSuccessResponse,
} from '../common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { GetUser } from '../auth/get-user.decorator';
import type { AuthenticatedUser } from '../auth/get-user.decorator';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { ReminderQueryDto } from './dto/reminder-query.dto';

@ApiTags('Reminders & Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  // ========================
  // Reminders CRUD
  // ========================

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('reminders:create')
  @ApiOperation({ summary: 'Create a manual reminder' })
  @ApiCreatedSuccessResponse({ description: 'Reminder created successfully' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async createReminder(@Body() dto: CreateReminderDto) {
    const reminder = await this.remindersService.create(dto);
    return ResponseBuilder.created(reminder, 'Reminder created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List reminders with pagination and filtering' })
  @ApiPaginatedResponse(Object, { description: 'Paginated list of reminders' })
  @ApiUnauthorizedResponse()
  async listReminders(@Query() query: ReminderQueryDto) {
    const result = await this.remindersService.findAll(query);
    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Reminders retrieved successfully',
    );
  }

  // ========================
  // Notifications (must be before :id route!)
  // ========================

  @Get('notifications')
  @ApiOperation({ summary: 'List notifications for current user' })
  @ApiPaginatedResponse(Object, {
    description: 'Paginated list of notifications',
  })
  @ApiUnauthorizedResponse()
  async listNotifications(
    @GetUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    const { page, limit } = PaginationHelper.mergeWithDefaults(query);

    if (!user || !user.userId || !user.userType) {
      throw new BadRequestException('Unable to determine current user');
    }

    if (user.userType === 'staff') {
      const result = await this.remindersService.getNotificationsForStaff(
        user.userId,
        { page, limit },
      );
      return ResponseBuilder.paginated(
        result.data,
        result.pagination,
        'Notifications retrieved successfully',
      );
    } else {
      const result = await this.remindersService.getNotificationsForCustomer(
        user.userId,
        { page, limit },
      );
      return ResponseBuilder.paginated(
        result.data,
        result.pagination,
        'Notifications retrieved successfully',
      );
    }
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiStandardResponse(Number, {
    description: 'Notification retrieved successfully',
  })
  @ApiUnauthorizedResponse()
  async getUnreadCount(@GetUser() user: AuthenticatedUser) {
    if (!user || !user.userId || !user.userType) {
      throw new BadRequestException('Unable to determine current user');
    }

    const count = await this.remindersService.getUnreadCount(
      user.userId,
      user.userType as 'staff' | 'customer',
    );
    return ResponseBuilder.success(
      { count },
      'Unread count retrieved successfully',
    );
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiUpdatedSuccessResponse({
    description: 'All notifications marked as read',
  })
  @ApiUnauthorizedResponse()
  async markAllAsRead(@GetUser() user: AuthenticatedUser) {
    if (!user || !user.userId || !user.userType) {
      throw new BadRequestException('Unable to determine current user');
    }

    const result = await this.remindersService.markAllAsRead(
      user.userId,
      user.userType as 'staff' | 'customer',
    );
    return ResponseBuilder.updated(
      { count: result.count },
      'All notifications marked as read',
    );
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiUpdatedSuccessResponse({ description: 'Notification marked as read' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  @ApiUnauthorizedResponse()
  async markAsRead(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    if (!user || !user.userId || !user.userType) {
      throw new BadRequestException('Unable to determine current user');
    }

    const notification = await this.remindersService.markAsRead(
      id,
      user.userId,
      user.userType as 'staff' | 'customer',
    );
    return ResponseBuilder.updated(
      notification,
      'Notification marked as read',
    );
  }

  // ========================
  // Reminder detail routes (MUST come after all specific sub-routes!)
  // ========================

  @Get(':id')
  @ApiOperation({ summary: 'Get reminder detail' })
  @ApiStandardResponse(Object, { description: 'Reminder retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Reminder not found' })
  async getReminder(@Param('id') id: string) {
    const reminder = await this.remindersService.findOne(id);
    return ResponseBuilder.success(reminder, 'Reminder retrieved successfully');
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('reminders:update')
  @ApiOperation({ summary: 'Update reminder' })
  @ApiUpdatedSuccessResponse({ description: 'Reminder updated successfully' })
  @ApiNotFoundResponse({ description: 'Reminder not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async updateReminder(
    @Param('id') id: string,
    @Body() dto: UpdateReminderDto,
  ) {
    const reminder = await this.remindersService.update(id, dto);
    return ResponseBuilder.updated(reminder, 'Reminder updated successfully');
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('reminders:delete')
  @ApiOperation({ summary: 'Delete reminder' })
  @ApiDeletedSuccessResponse({ description: 'Reminder deleted successfully' })
  @ApiNotFoundResponse({ description: 'Reminder not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async deleteReminder(@Param('id') id: string) {
    await this.remindersService.remove(id);
    return ResponseBuilder.deleted('Reminder deleted successfully');
  }
}
