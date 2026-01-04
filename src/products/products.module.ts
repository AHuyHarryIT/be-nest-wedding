import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductImageService } from './product-image.service';
import { ProductsController } from './products.controller';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductImageService],
  exports: [ProductsService, ProductImageService],
})
export class ProductsModule {}
