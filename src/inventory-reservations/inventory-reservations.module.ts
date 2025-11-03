import { Module } from '@nestjs/common';
import { InventoryReservationsService } from './inventory-reservations.service';
import { InventoryReservationsController } from './inventory-reservations.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [InventoryReservationsController],
  providers: [InventoryReservationsService],
})
export class InventoryReservationsModule {}
