import { DatabaseService } from '@/database/database.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { SelectionQueryDto } from './dto/selection-query.dto';
import { SelectionRegistry } from './selection.registry';

@Injectable()
export class SelectionService {
  constructor(private prisma: DatabaseService) {}

  async getSelections(query: SelectionQueryDto) {
    const { entity, search, page, limit } = query;

    const config = SelectionRegistry[entity];
    if (!config) throw new BadRequestException('Invalid entity');

    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const baseWhere = config.where ?? {};

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
      select: {
        [config.value]: true,
        [config.label]: true,
        ...(config.extra
          ? Object.fromEntries(config.extra.map((f) => [f, true]))
          : {}),
      },
    });

    return {
      items: rows.map((r) => ({
        value: r[config.value],
        label: r[config.label],
        extra: config.extra
          ? Object.fromEntries(config.extra.map((f) => [f, r[f]]))
          : undefined,
      })),
      pagination: {
        page,
        limit: take,
        hasNext: rows.length === take,
      },
    };
  }
}
