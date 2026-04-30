import { DatabaseService } from '@/database/database.service';
import type { SelectionRegistry } from '../types/selection-config.types';

export const UserSelection: SelectionRegistry = {
  users: {
    model: (prisma: DatabaseService) => prisma.staff,
    searchable: ['firstName', 'id', 'lastName'],
    select: {
      id: true,
      email: true,
      lastName: true,
      firstName: true,
      phoneNumber: true,
      staffJobs: {
        select: {
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
    where: {
      deletedAt: null,
      isActive: true,
      roles: {
        some: {},
      },
    },
  },
  customers: {
    model: (prisma: DatabaseService) => prisma.customer,
    searchable: ['firstName', 'id', 'lastName'],
    select: ['id', 'email', 'lastName', 'firstName', 'phoneNumber'],
    where: { deletedAt: null },
  },
};
