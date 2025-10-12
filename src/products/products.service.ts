import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ProductsService {
  constructor(private readonly databaseService: DatabaseService) {}
  create(createProductDto: CreateProductDto) {
    return this.databaseService.product.create({ data: createProductDto });
  }

  findAll() {
    return this.databaseService.product.findMany();
  }

  findOne(id: string) {
    return this.databaseService.product.findUnique({ where: { id } });
  }

  update(id: string, updateProductDto: UpdateProductDto) {
    return this.databaseService.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  remove(id: string) {
    return this.databaseService.product.delete({ where: { id } });
  }
}
