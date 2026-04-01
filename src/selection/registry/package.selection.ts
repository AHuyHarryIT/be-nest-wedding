import { DatabaseService } from '@/database/database.service';
import type { SelectionRegistry } from '../types/selection-config.types';

export const PackageSelection: SelectionRegistry = {
  packages: {
    model: (prisma: DatabaseService) => prisma.package,
    searchable: ['name', 'id'],
    select: {
      id: true,
      name: true,
      price: true,
      services: {
        select: {
          serviceId: true,
          service: {
            select: {
              id: true,
              name: true,
              jobId: true,
              job: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    where: { isActive: true, deletedAt: null },
  },
};
