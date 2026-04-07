import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentCoreService } from './payment-core.service';
import { PaymentAttemptService } from './payment-attempt.service';
import { PaymentGatewayTransactionService } from './payment-gateway-transaction.service';
import { MomoPaymentService } from './momo.service';
import { PaymentEventsService } from './events/payment-events.service';
import { RefundService } from './refund.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentCoreService,
    PaymentAttemptService,
    PaymentGatewayTransactionService,
    MomoPaymentService,
    PaymentEventsService,
    RefundService,
  ],
  exports: [
    PaymentsService,
    PaymentCoreService,
    PaymentAttemptService,
    PaymentGatewayTransactionService,
    MomoPaymentService,
    PaymentEventsService,
    RefundService,
  ],
})
export class PaymentsModule {}
