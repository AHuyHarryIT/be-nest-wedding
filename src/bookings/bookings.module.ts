import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { CustomerBookingsController } from './customer-bookings.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BookingsController, CustomerBookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
