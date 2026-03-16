import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { ServicesModule } from './services/services.module';
import { PackagesModule } from './packages/packages.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { BookingSessionsModule } from './booking-sessions/booking-sessions.module';
import { PaymentsModule } from './payments/payments.module';
import { OrdersModule } from './orders/orders.module';
import { AlbumsModule } from './albums/albums.module';
import { InventoryReservationsModule } from './inventory-reservations/inventory-reservations.module';
import { UsersModule } from './users/users.module';
import { SelectionModule } from './selection/selection.module';
import { ChatModule } from './chat/chat.module';
import { AutoRefreshMiddleware } from './auth/auto-refresh.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    CommonModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    CategoriesModule,
    ProductsModule,
    ServicesModule,
    PackagesModule,
    BookingsModule,
    BookingSessionsModule,
    PaymentsModule,
    OrdersModule,
    AlbumsModule,
    InventoryReservationsModule,
    SelectionModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AutoRefreshMiddleware).forRoutes('*');
  }
}
