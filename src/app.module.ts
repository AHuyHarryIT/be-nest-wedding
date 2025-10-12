import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { DatabaseModule } from './database/database.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [DatabaseModule, RolesModule, PermissionsModule, ProductsModule],
  controllers: [AppController],
  providers: [AppService, DatabaseService],
})
export class AppModule {}
