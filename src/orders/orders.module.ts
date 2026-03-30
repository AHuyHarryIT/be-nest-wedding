import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PaymentsModule } from '../payments/payments.module';
import { CustomerOrdersController } from './customer-orders.controller';
import { OrdersService } from './orders.service';
import { OrderManagementService } from './order-management.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [DatabaseModule, PaymentsModule],
  controllers: [OrdersController, CustomerOrdersController],
  providers: [OrdersService, OrderManagementService],
  exports: [OrdersService, OrderManagementService],
})
export class OrdersModule {}
