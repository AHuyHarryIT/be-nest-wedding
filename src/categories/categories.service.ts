import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private db: DatabaseService) {}

  create(createCategoryDto: CreateCategoryDto) {
    return this.db.category.create({
      data: createCategoryDto,
    });
  }

  findAll(skip: number = 0, take: number = 10) {
    return Promise.all([
      this.db.category.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.category.count({
        where: { deletedAt: null },
      }),
    ]).then(([data, total]) => ({
      data,
      total,
    }));
  }

  findOne(id: string) {
    return this.db.category.findUniqueOrThrow({
      where: { id },
    });
  }

  update(id: string, updateCategoryDto: UpdateCategoryDto) {
    return this.db.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  remove(id: string) {
    return this.db.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
