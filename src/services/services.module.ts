import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { DatabaseModule } from '../database/database.module';
import { CloudinaryService } from '../common/services/cloudinary.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ServicesController],
  providers: [ServicesService, CloudinaryService],
  exports: [ServicesService],
})
export class ServicesModule {}
