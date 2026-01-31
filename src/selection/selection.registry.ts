import { DatabaseService } from '@/database/database.service';
import { ServiceSelection } from './registry/service.selection';
import { PackageSelection } from './registry/package.selection';

export const SelectionRegistry = {
  ...ServiceSelection,
  ...PackageSelection,
  users: {
    model: (prisma: DatabaseService) => prisma.user,
    value: 'id',
    label: 'name',
    searchable: ['name', 'email'],
    extra: ['email', 'code'],
  },

  roles: {
    model: (prisma: DatabaseService) => prisma.role,
    value: 'id',
    label: 'name',
    searchable: ['name'],
  },
} as const;
