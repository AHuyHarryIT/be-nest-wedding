import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentCoreService } from './payment-core.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentCoreService],
  exports: [PaymentsService, PaymentCoreService],
})
export class PaymentsModule {}
