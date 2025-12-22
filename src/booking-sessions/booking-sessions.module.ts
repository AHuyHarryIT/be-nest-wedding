import { Module } from '@nestjs/common';
import { BookingSessionsService } from './booking-sessions.service';
import { BookingSessionsController } from './booking-sessions.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BookingSessionsController],
  providers: [BookingSessionsService],
  exports: [BookingSessionsService],
})
export class BookingSessionsModule {}
