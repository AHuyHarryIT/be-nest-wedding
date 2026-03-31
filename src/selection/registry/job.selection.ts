import { DatabaseService } from '@/database/database.service';
import type { SelectionRegistry } from '../types/selection-config.types';

export const JobSelection: SelectionRegistry = {
  jobs: {
    model: (prisma: DatabaseService) => prisma.job,
    searchable: ['name', 'id'],
    select: ['id', 'name', 'description'],
    where: { isActive: true, deletedAt: null },
  },
};
