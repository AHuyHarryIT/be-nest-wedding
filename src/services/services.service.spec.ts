import { ServicesService } from './services.service';

describe('ServicesService', () => {
  let service: ServicesService;
  let databaseService: {
    service: {
      findFirst: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
    };
    job: {
      findFirst: jest.Mock;
    };
  };

  beforeEach(() => {
    databaseService = {
      service: {
        findFirst: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      job: {
        findFirst: jest.fn(),
      },
    };

    service = new ServicesService(databaseService as never, {} as never);
  });

  it('deactivates a service through explicit lifecycle operation', async () => {
    databaseService.service.findFirst.mockResolvedValue({
      id: 'svc-1',
      isActive: true,
      deletedAt: null,
    });
    databaseService.service.update.mockResolvedValue({
      id: 'svc-1',
      isActive: false,
      deletedAt: null,
    });

    const result = await service.deactivate('svc-1');

    expect(databaseService.service.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'svc-1', deletedAt: null },
      }),
    );
    expect(databaseService.service.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'svc-1' },
        data: { isActive: false },
      }),
    );
    expect(result).toEqual(expect.objectContaining({ isActive: false }));
  });

  it('keeps a deactivated service inactive when deactivation is requested again', async () => {
    databaseService.service.findFirst.mockResolvedValue({
      id: 'svc-2',
      isActive: false,
      deletedAt: null,
    });
    databaseService.service.update.mockResolvedValue({
      id: 'svc-2',
      isActive: false,
      deletedAt: null,
    });

    await service.deactivate('svc-2');

    expect(databaseService.service.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'svc-2' },
        data: { isActive: false },
      }),
    );
  });
});
