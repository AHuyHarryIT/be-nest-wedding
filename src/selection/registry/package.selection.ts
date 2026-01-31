import { DatabaseService } from '@/database/database.service';

export const PackageSelection = {
  packages: {
    model: (prisma: DatabaseService) => prisma.package,
    value: 'id',
    label: 'name',
    searchable: ['name', 'id'],
    extra: ['price'],
    where: { isActive: true },
  },
};
