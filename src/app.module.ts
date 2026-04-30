import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ServicesModule } from './services/services.module';
import { JobsModule } from './jobs/jobs.module';
import { PackagesModule } from './packages/packages.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { BookingSessionsModule } from './booking-sessions/booking-sessions.module';
import { PaymentsModule } from './payments/payments.module';
import { OrdersModule } from './orders/orders.module';
import { AlbumsModule } from './albums/albums.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { SelectionModule } from './selection/selection.module';
import { ChatModule } from './chat/chat.module';
import { StaffChatModule } from './staff-chat/staff-chat.module';
import { AiChatModule } from './ai-chat/ai-chat.module';
import { AutoRefreshMiddleware } from './auth/auto-refresh.middleware';
import { PublicInquiriesModule } from './public-inquiries/public-inquiries.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev',
        '.env',
      ],
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    CommonModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ServicesModule,
    JobsModule,
    PackagesModule,
    BookingsModule,
    BookingSessionsModule,
    PaymentsModule,
    OrdersModule,
    AlbumsModule,
    CustomersModule,
    SelectionModule,
    ChatModule,
    StaffChatModule,
    AiChatModule,
    PublicInquiriesModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AutoRefreshMiddleware).forRoutes('*');
  }
}
