import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class RolesService {
  constructor(private readonly databaseService: DatabaseService) {}
  create(createRoleDto: CreateRoleDto) {
    return this.databaseService.role.create({
      data: createRoleDto,
    });
  }

  async findAll() {
    return await this.databaseService.role.findMany();
  }

  findOne(id: string) {
    return this.databaseService.role.findUnique({
      where: { id: id },
    });
  }

  update(id: string, updateRoleDto: UpdateRoleDto) {
    return this.databaseService.role.update({
      where: { id: id },
      data: updateRoleDto,
    });
  }

  remove(id: string) {
    return this.databaseService.role.delete({
      where: { id: id },
    });
  }
}
