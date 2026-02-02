import { DatabaseService } from '@/database/database.service';
import { SelectionRegistry } from '../types/selection-config.types';

export const ServiceSelection: SelectionRegistry = {
  services: {
    model: (prisma: DatabaseService) => prisma.service,
    searchable: ['name', 'id'],
    select: ['id', 'name', 'price'],
    where: { isActive: true, deletedAt: null },
  },
};
