import { Injectable } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly databaseService: DatabaseService) {}
  create(createPermissionDto: CreatePermissionDto) {
    return this.databaseService.permission.create({
      data: createPermissionDto,
    });
  }

  findAll() {
    return this.databaseService.permission.findMany();
  }

  findOne(id: string) {
    return this.databaseService.permission.findUnique({
      where: { id: id },
    });
  }

  update(id: string, updatePermissionDto: UpdatePermissionDto) {
    return this.databaseService.permission.update({
      where: { id: id },
      data: updatePermissionDto,
    });
  }

  remove(id: string) {
    return this.databaseService.permission.delete({
      where: { id: id },
    });
  }
}
