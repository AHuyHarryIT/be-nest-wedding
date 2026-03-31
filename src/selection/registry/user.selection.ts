import { DatabaseService } from '@/database/database.service';
import type { SelectionRegistry } from '../types/selection-config.types';

export const UserSelection: SelectionRegistry = {
  users: {
    model: (prisma: DatabaseService) => prisma.staff,
    searchable: ['firstName', 'id', 'lastName'],
    select: ['id', 'email', 'lastName', 'firstName', 'phoneNumber'],
    where: { deletedAt: null },
  },
  customers: {
    model: (prisma: DatabaseService) => prisma.customer,
    searchable: ['firstName', 'id', 'lastName'],
    select: ['id', 'email', 'lastName', 'firstName', 'phoneNumber'],
    where: { deletedAt: null },
  },
};
