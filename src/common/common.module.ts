import { Module, Global } from '@nestjs/common';
import { PermissionsGuard } from './guards/permissions.guard';
import { DatabaseModule } from '../database/database.module';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [PermissionsGuard],
  exports: [PermissionsGuard],
})
export class CommonModule {}
