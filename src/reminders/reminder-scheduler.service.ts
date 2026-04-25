import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { RemindersService } from './reminders.service';
import { ReminderStatus, NotificationChannel } from 'generated/prisma';

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly reminderService: RemindersService,
  ) {}

  // Run every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    this.logger.debug('Running reminder scheduler...');
    try {
      await this.triggerDueReminders();
      this.logger.debug('Reminder scheduler completed');
    } catch (error) {
      this.logger.error('Reminder scheduler failed:', error);
    }
  }

  private async triggerDueReminders() {
    const now = new Date();

    // Find pending reminders that are due
    const dueReminders = await this.db.reminder.findMany({
      where: {
        status: ReminderStatus.PENDING,
        scheduledAt: { lte: now },
      },
      include: {
        booking: true,
        customer: true,
        inventoryItem: true,
      },
    });

    if (dueReminders.length === 0) return;

    this.logger.log(`Found ${dueReminders.length} due reminder(s)`);

    for (const reminder of dueReminders as any[]) {
      try {
        // Determine target recipients based on reminder type
        const targets: Array<{
          channel: NotificationChannel;
          staffId?: string;
          customerId?: string;
        }> = [];

        if (reminder.bookingId) {
          // Staff should handle booking reminders
          targets.push({ channel: NotificationChannel.IN_APP });
        }
        if (reminder.customerId) {
          targets.push({
            channel: NotificationChannel.IN_APP,
            customerId: reminder.customerId,
          });
        }

        await this.reminderService.createNotification(
          reminder.id,
          targets[0]?.channel || NotificationChannel.IN_APP,
          reminder.title,
          reminder.message,
          undefined,
        );

        // Mark as triggered
        await this.db.reminder.update({
          where: { id: reminder.id },
          data: { status: ReminderStatus.TRIGGERED, triggeredAt: now },
        });

        this.logger.log(`Triggered reminder: ${reminder.title}`);
      } catch (error) {
        this.logger.error(`Failed to trigger reminder ${reminder.id}:`, error);
      }
    }
  }
}
