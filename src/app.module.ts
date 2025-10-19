import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { DatabaseModule } from './database/database.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProductsModule } from './products/products.module';
import { ServicesModule } from './services/services.module';
import { PackagesModule } from './packages/packages.module';

@Module({
  imports: [
    DatabaseModule,
    RolesModule,
    PermissionsModule,
    ProductsModule,
    ServicesModule,
    PackagesModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService],
})
export class AppModule {}
