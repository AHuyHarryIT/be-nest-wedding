import { Module } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { DatabaseModule } from '../database/database.module';
import { CloudinaryService } from '../common/services/cloudinary.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PackagesController],
  providers: [PackagesService, CloudinaryService],
  exports: [PackagesService],
})
export class PackagesModule {}
