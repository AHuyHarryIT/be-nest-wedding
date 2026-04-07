import { Module, Global } from '@nestjs/common';
import { PermissionsGuard } from './guards/permissions.guard';
import { DatabaseModule } from '../database/database.module';
import {
  BaseRepository,
  UserRepository,
  BookingRepository,
} from './repositories';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    PermissionsGuard,
    BaseRepository,
    UserRepository,
    BookingRepository,
  ],
  exports: [
    PermissionsGuard,
    UserRepository,
    BookingRepository,
  ],
})
export class CommonModule {}
