import { Module } from '@nestjs/common';
import { OneDriveService } from './onedrive.service';

@Module({
  providers: [OneDriveService],
  exports: [OneDriveService],
})
export class StorageModule {}
