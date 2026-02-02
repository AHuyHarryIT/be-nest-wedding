import { DatabaseService } from '@/database/database.service';
import { ServiceSelection } from './registry/service.selection';
import { PackageSelection } from './registry/package.selection';
import { UserSelection } from './registry/user.selection';

export const SelectionRegistry = {
  ...ServiceSelection,
  ...PackageSelection,
  ...UserSelection,
  roles: {
    model: (prisma: DatabaseService) => prisma.role,
    searchable: ['name', 'id'],
    extra: ['name', 'id'],
  },
} as const;
