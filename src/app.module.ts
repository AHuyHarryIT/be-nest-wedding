import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProductsModule } from './products/products.module';
import { ServicesModule } from './services/services.module';
import { PackagesModule } from './packages/packages.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { BookingSessionsModule } from './booking-sessions/booking-sessions.module';
import { PaymentsModule } from './payments/payments.module';
import { FilesModule } from './files/files.module';
import { AlbumsModule } from './albums/albums.module';
import { InventoryReservationsModule } from './inventory-reservations/inventory-reservations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    CommonModule,
    AuthModule,
    RolesModule,
    PermissionsModule,
    ProductsModule,
    ServicesModule,
    PackagesModule,
    BookingsModule,
    BookingSessionsModule,
    PaymentsModule,
    FilesModule,
    AlbumsModule,
    InventoryReservationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService],
})
export class AppModule {}
