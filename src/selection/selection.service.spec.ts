import type { DatabaseService } from '../database/database.service';
import { SelectionService } from './selection.service';

type SelectionModelMock = {
  findMany: jest.Mock;
  count: jest.Mock;
};

type MockPrisma = {
  service: SelectionModelMock;
  package: SelectionModelMock;
};

describe('SelectionService', () => {
  let service: SelectionService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = {
      service: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      package: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    service = new SelectionService(prisma as unknown as DatabaseService);
  });

  it.each([
    ['services', () => prisma.service],
    ['packages', () => prisma.package],
  ])(
    'returns active records only by default for %s selectors',
    async (entity, modelGetter) => {
      await service.getSelections({ entity, page: 1, limit: 20 } as never);

      const expectedWhere = {
        AND: [{ isActive: true, deletedAt: null }, {}],
      };

      expect(modelGetter().findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere, take: 20, skip: 0 }),
      );
      expect(modelGetter().count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
    },
  );

  it.each([
    ['services', () => prisma.service],
    ['packages', () => prisma.package],
  ])(
    'includes inactive records only when explicit includeInactive flag is enabled for %s selectors',
    async (entity, modelGetter) => {
      await service.getSelections({
        entity,
        page: 1,
        limit: 20,
        includeInactive: true,
      } as never);

      const expectedWhere = {
        AND: [{ deletedAt: null }, {}],
      };

      expect(modelGetter().findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere, take: 20, skip: 0 }),
      );
      expect(modelGetter().count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
    },
  );

  it('keeps pagination guard cap while applying includeInactive filter behavior', async () => {
    await service.getSelections({
      entity: 'services',
      page: 2,
      limit: 500,
      includeInactive: true,
    } as never);

    expect(prisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ deletedAt: null }, {}] },
        take: 50,
        skip: 50,
      }),
    );
  });
});
