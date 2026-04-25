import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { ReminderQueryDto } from './dto/reminder-query.dto';
import {
  PaginationHelper,
  PaginatedResult,
} from '../common/utils/pagination.helper';
import { NotFoundException } from '@nestjs/common';
import type { NotificationChannel } from 'generated/prisma';

@Injectable()
export class RemindersService {
  constructor(private readonly db: DatabaseService) {}

  async create(data: CreateReminderDto) {
    return this.db.reminder.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        scheduledAt: new Date(data.scheduledAt),
        booking: data.bookingId
          ? { connect: { id: data.bookingId } }
          : undefined,
        customer: data.customerId
          ? { connect: { id: data.customerId } }
          : undefined,
        inventoryItem: data.itemId
          ? { connect: { id: data.itemId } }
          : undefined,
      },
      include: {
        booking: true,
        customer: true,
        inventoryItem: true,
        notifications: true,
      },
    });
  }

  async findAll(params: ReminderQueryDto) {
    const { page, limit } = PaginationHelper.mergeWithDefaults(params);
    const { type, status, bookingId, customerId, itemId } = params;

    const where = {
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(bookingId ? { bookingId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(itemId ? { itemId } : {}),
    };

    const total = await this.db.reminder.count({ where });

    const rows = await this.db.reminder.findMany({
      where,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        booking: true,
        customer: true,
        inventoryItem: true,
        _count: {
          select: { notifications: true },
        },
      },
    });

    return PaginationHelper.createPaginatedResponse(rows, page, limit, total);
  }

  async findOne(id: string) {
    const reminder = await this.db.reminder.findUnique({
      where: { id },
      include: {
        booking: true,
        customer: true,
        inventoryItem: true,
        notifications: true,
      },
    });

    if (!reminder) {
      throw new NotFoundException(`Reminder with ID ${id} not found`);
    }

    return reminder;
  }

  async update(id: string, data: UpdateReminderDto) {
    await this.findOne(id);

    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.scheduledAt !== undefined) {
      updateData.scheduledAt = { set: new Date(data.scheduledAt) };
    }
    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.message !== undefined) {
      updateData.message = data.message;
    }

    return this.db.reminder.update({
      where: { id },
      data: updateData,
      include: {
        booking: true,
        customer: true,
        inventoryItem: true,
        notifications: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.reminder.delete({ where: { id } });
  }

  async findByBookingId(bookingId: string) {
    return this.db.reminder.findMany({
      where: { bookingId },
      include: { notifications: true },
    });
  }

  async findByCustomerId(customerId: string) {
    return this.db.reminder.findMany({
      where: { customerId },
      include: { notifications: true },
    });
  }

  // Notification methods

  async getNotificationsForStaff(
    staffId: string,
    params?: { page?: number; limit?: number; isRead?: boolean },
  ) {
    const { page, limit } = PaginationHelper.mergeWithDefaults(params || {});

    const where: Record<string, unknown> = {
      recipientStaffId: staffId,
    };

    if (params?.isRead !== undefined) {
      where.isRead = params.isRead;
    }

    const total = await this.db.notification.count({ where });

    const rows = await this.db.notification.findMany({
      where,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        reminder: true,
      },
    });

    return PaginationHelper.createPaginatedResponse(rows, page, limit, total);
  }

  async getNotificationsForCustomer(
    customerId: string,
    params?: { page?: number; limit?: number; isRead?: boolean },
  ) {
    const { page, limit } = PaginationHelper.mergeWithDefaults(params || {});

    const where: Record<string, unknown> = {
      recipientCustomerId: customerId,
    };

    if (params?.isRead !== undefined) {
      where.isRead = params.isRead;
    }

    const total = await this.db.notification.count({ where });

    const rows = await this.db.notification.findMany({
      where,
      skip: PaginationHelper.getSkip(page, limit),
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        reminder: true,
      },
    });

    return PaginationHelper.createPaginatedResponse(rows, page, limit, total);
  }

  async markAsRead(
    notificationId: string,
    userId: string,
    userType: 'staff' | 'customer',
  ) {
    const notification = await this.db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found`,
      );
    }

    // Verify ownership
    if (
      (userType === 'staff' && notification.recipientStaffId !== userId) ||
      (userType === 'customer' && notification.recipientCustomerId !== userId)
    ) {
      throw new NotFoundException(`Notification not found`);
    }

    return this.db.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
      include: { reminder: true },
    });
  }

  async markAllAsRead(userId: string, userType: 'staff' | 'customer') {
    const where =
      userType === 'staff'
        ? { recipientStaffId: userId, isRead: false }
        : { recipientCustomerId: userId, isRead: false };

    return this.db.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string, userType: 'staff' | 'customer') {
    const where =
      userType === 'staff'
        ? { recipientStaffId: userId, isRead: false }
        : { recipientCustomerId: userId, isRead: false };

    return this.db.notification.count({ where });
  }

  // Internal: Create notification when a reminder is triggered
  async createNotification(
    reminderId: string,
    channel: NotificationChannel,
    title: string,
    message: string,
    recipientStaffId?: string,
    recipientCustomerId?: string,
  ) {
    return this.db.notification.create({
      data: {
        reminderId,
        channel,
        title,
        message,
        recipientStaffId: recipientStaffId ?? null,
        recipientCustomerId: recipientCustomerId ?? null,
      },
    });
  }
}
