import { Module, Global } from '@nestjs/common';
import { PermissionsGuard } from './guards/permissions.guard';
import { DatabaseModule } from '../database/database.module';
import {
  BaseRepository,
  BookingRepository,
  PaymentRepository,
  UserRepository,
} from './repositories';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    PermissionsGuard,
    BaseRepository,
    UserRepository,
    BookingRepository,
    PaymentRepository,
  ],
  exports: [
    PermissionsGuard,
    UserRepository,
    BookingRepository,
    PaymentRepository,
  ],
})
export class CommonModule {}
