import { DatabaseService } from '@/database/database.service';
import type { SelectionRegistry } from '../types/selection-config.types';

export const PackageSelection: SelectionRegistry = {
  packages: {
    model: (prisma: DatabaseService) => prisma.package,
    searchable: ['name', 'id'],
    select: ['id', 'name', 'price'],
    where: { isActive: true, deletedAt: null },
  },
};
