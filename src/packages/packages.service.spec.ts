import { PackagesService } from './packages.service';

describe('PackagesService', () => {
  let service: PackagesService;
  let databaseService: {
    package: {
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    packageService: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    packageImage: {
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    databaseService = {
      package: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      packageService: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      packageImage: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new PackagesService(databaseService as never, {} as never);
  });

  it('includes related service fields in search conditions', async () => {
    databaseService.package.count.mockResolvedValue(0);
    databaseService.package.findMany.mockResolvedValue([]);

    await service.findAll({ search: 'breakfast', includeServices: true });

    expect(databaseService.package.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: 'breakfast', mode: 'insensitive' } },
          { description: { contains: 'breakfast', mode: 'insensitive' } },
          {
            services: {
              some: {
                service: {
                  OR: [
                    { name: { contains: 'breakfast', mode: 'insensitive' } },
                    {
                      description: {
                        contains: 'breakfast',
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
        deletedAt: null,
      },
    });
  });

  it('deactivates a package through explicit lifecycle operation', async () => {
    databaseService.package.findFirst.mockResolvedValue({
      id: 'pkg-1',
      isActive: true,
      deletedAt: null,
      services: [],
      images: [],
    });
    databaseService.package.update.mockResolvedValue({
      id: 'pkg-1',
      isActive: false,
    });

    const result = await service.deactivate('pkg-1');

    expect(databaseService.package.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pkg-1' },
        data: { isActive: false },
      })
    );
    expect(result).toEqual(expect.objectContaining({ isActive: false }));
  });

  it('supports removing all package-service mappings via explicit mapping workflow', async () => {
    databaseService.package.findFirst.mockResolvedValue({
      id: 'pkg-2',
      deletedAt: null,
      services: [],
      images: [],
    });
    databaseService.service = {
      findMany: jest.fn().mockResolvedValue([]),
    } as never;

    databaseService.$transaction.mockImplementation(async (callback) => {
      const tx = {
        packageService: {
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
          createMany: jest.fn(),
        },
        package: {
          findUnique: jest.fn().mockResolvedValue({ id: 'pkg-2', services: [] }),
        },
      };

      const result = await callback(tx);
      expect(tx.packageService.deleteMany).toHaveBeenCalledWith({
        where: { packageId: 'pkg-2' },
      });
      expect(tx.packageService.createMany).not.toHaveBeenCalled();
      return result;
    });

    await service.updatePackageServices('pkg-2', { serviceIds: [] });
  });
});
