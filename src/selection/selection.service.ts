import { DatabaseService } from '@/database/database.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { SelectionQueryDto } from './dto/query-selection.dto';
import { SelectionRegistry } from './selection.registry';
import { PaginationHelper } from '@/common';

@Injectable()
export class SelectionService {
  constructor(private prisma: DatabaseService) {}

  async getSelections(query: SelectionQueryDto) {
    const { entity, search, page, limit } = query;

    const config = SelectionRegistry[entity];
    if (!config) throw new BadRequestException('Invalid entity');

    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const baseWhere =
      typeof config.where === 'function'
        ? await config.where(query, this.prisma)
        : (config.where ?? {});

    const searchWhere = search
      ? {
          OR: config.searchable.map((f) => ({
            [f]: { contains: search, mode: 'insensitive' },
          })),
        }
      : {};

    const where = { AND: [baseWhere, searchWhere] };

    const rows = await config.model(this.prisma).findMany({
      where,
      take,
      skip,
      select: Array.isArray(config.select)
        ? Object.fromEntries(config.select.map((f) => [f, true]))
        : (config.select ?? {}),
    });

    const total = await config.model(this.prisma).count({ where });
    return PaginationHelper.createPaginatedResponse(rows, page, limit, total);
  }
}
