import { Module } from '@nestjs/common';
import { OneDriveService } from './onedrive.service';
import { AuthService } from './auth.service';
import { UploadService } from './upload.service';

@Module({
  providers: [AuthService, UploadService, OneDriveService],
  exports: [OneDriveService, AuthService, UploadService],
})
export class StorageModule {}
