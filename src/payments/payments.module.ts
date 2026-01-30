import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MomoPaymentService } from './momo.service';
import { PaymentEventsService } from './events/payment-events.service';
import { DatabaseModule } from '../database/database.module';
import { PaymentService } from './payment-core.service';
import { PaymentAttemptService } from './payment-attempt.service';
import { PaymentGatewayTransactionService } from './payment-gateway-transaction.service';
import { RefundService } from './refund.service';
import { OrderPaymentService } from './order-payment.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    MomoPaymentService,
    PaymentEventsService,
    PaymentService,
    PaymentAttemptService,
    PaymentGatewayTransactionService,
    RefundService,
    OrderPaymentService,
  ],
  exports: [
    PaymentsService,
    MomoPaymentService,
    PaymentEventsService,
    PaymentService,
    PaymentAttemptService,
    PaymentGatewayTransactionService,
    RefundService,
    OrderPaymentService,
  ],
})
export class PaymentsModule {}
