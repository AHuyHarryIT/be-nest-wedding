import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { PublicInquiriesController } from './public-inquiries.controller';
import { PublicInquiriesService } from './public-inquiries.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PublicInquiriesController],
  providers: [PublicInquiriesService],
  exports: [PublicInquiriesService],
})
export class PublicInquiriesModule {}
