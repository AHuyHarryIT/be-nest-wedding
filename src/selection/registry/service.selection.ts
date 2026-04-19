import { DatabaseService } from '@/database/database.service';
import { SelectionRegistry } from '../types/selection-config.types';

export const ServiceSelection: SelectionRegistry = {
  services: {
    model: (prisma: DatabaseService) => prisma.service,
    searchable: ['name', 'id'],
    select: {
      id: true,
      name: true,
      price: true,
      isLocation: true,
      isTime: true,
      jobId: true,
      job: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    where: (query) => ({
      deletedAt: null,
      ...(query?.includeInactive ? {} : { isActive: true }),
    }),
  },
};
