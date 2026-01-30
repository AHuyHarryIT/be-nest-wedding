import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PaymentsModule } from '../payments/payments.module';
import { OrdersService } from './orders.service';
import { OrderManagementService } from './order-management.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [DatabaseModule, PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderManagementService],
  exports: [OrdersService, OrderManagementService],
})
export class OrdersModule {}
