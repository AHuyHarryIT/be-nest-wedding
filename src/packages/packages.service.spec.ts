import { PackagesService } from './packages.service';

describe('PackagesService', () => {
  let service: PackagesService;
  let databaseService: {
    package: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    databaseService = {
      package: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    service = new PackagesService(databaseService as never, {} as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
});
