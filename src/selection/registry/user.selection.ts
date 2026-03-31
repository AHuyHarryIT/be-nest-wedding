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
    where: async (query, prisma) => {
      const bookingId =
        typeof query.bookingId === 'string' && query.bookingId.trim()
          ? query.bookingId.trim()
          : null;

      const baseWhere = {
        deletedAt: null,
        roles: {
          some: {},
        },
      };

      if (!bookingId) {
        return {
          ...baseWhere,
          staffJobs: {
            some: {},
          },
        };
      }

      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          deletedAt: null,
        },
        select: {
          services: {
            select: {
              service: {
                select: {
                  jobId: true,
                },
              },
            },
          },
          packages: {
            select: {
              package: {
                select: {
                  services: {
                    select: {
                      service: {
                        select: {
                          jobId: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const requiredJobIds = [
        ...(booking?.services ?? [])
          .map((item) => item.service?.jobId)
          .filter(Boolean),
        ...(booking?.packages ?? []).flatMap((item) =>
          (item.package?.services ?? [])
            .map((pkgService) => pkgService.service?.jobId)
            .filter(Boolean),
        ),
      ];

      const uniqueRequiredJobIds = [...new Set(requiredJobIds)] as string[];

      return {
        ...baseWhere,
        staffJobs:
          uniqueRequiredJobIds.length > 0
            ? {
                some: {
                  jobId: {
                    in: uniqueRequiredJobIds,
                  },
                },
              }
            : {
                some: {},
              },
      };
    },
  },
  customers: {
    model: (prisma: DatabaseService) => prisma.customer,
    searchable: ['firstName', 'id', 'lastName'],
    select: ['id', 'email', 'lastName', 'firstName', 'phoneNumber'],
    where: { deletedAt: null },
  },
};
