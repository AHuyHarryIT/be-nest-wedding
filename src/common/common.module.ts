import { Module, Global } from '@nestjs/common';
import { PermissionsGuard } from './guards/permissions.guard';
import { DatabaseModule } from '../database/database.module';
import {
  BaseRepository,
  PaymentRepository,
  OrderRepository,
  UserRepository,
  BookingRepository,
  RefundRepository,
  PaymentAttemptRepository,
} from './repositories';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    PermissionsGuard,
    BaseRepository,
    PaymentRepository,
    OrderRepository,
    UserRepository,
    BookingRepository,
    RefundRepository,
    PaymentAttemptRepository,
  ],
  exports: [
    PermissionsGuard,
    PaymentRepository,
    OrderRepository,
    UserRepository,
    BookingRepository,
    RefundRepository,
    PaymentAttemptRepository,
  ],
})
export class CommonModule {}
