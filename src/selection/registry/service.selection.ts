import { DatabaseService } from '@/database/database.service';

export const ServiceSelection = {
  services: {
    model: (prisma: DatabaseService) => prisma.service,
    value: 'id',
    label: 'name',
    searchable: ['name', 'id'],
    extra: ['price'],
    where: { isActive: true },
  },
};
