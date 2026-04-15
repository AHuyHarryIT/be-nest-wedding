import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '@/database/database.service';
import { PublicInquiriesService } from './public-inquiries.service';

describe('PublicInquiriesService', () => {
  let service: PublicInquiriesService;

  const createMock = jest.fn();
  const prisma = {
    publicInquiry: {
      create: createMock,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicInquiriesService,
        { provide: DatabaseService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PublicInquiriesService>(PublicInquiriesService);
    createMock.mockReset();
  });

  it('maps valid payload to prisma publicInquiry.create call', async () => {
    const payload = {
      name: 'Linh Tran',
      email: 'linh@example.com',
      message: 'Interested in package details',
      phone: '0903666888',
      packageInterest: 'Silver',
    };

    const persisted = {
      id: 'inquiry-1',
      ...payload,
      createdAt: new Date('2026-04-15T10:00:00.000Z'),
      updatedAt: new Date('2026-04-15T10:00:00.000Z'),
    };

    createMock.mockResolvedValue(persisted);

    const result = await service.create(payload);

    expect(createMock).toHaveBeenCalledWith({
      data: {
        name: payload.name,
        email: payload.email,
        message: payload.message,
        phone: payload.phone,
        packageInterest: payload.packageInterest,
      },
    });
    expect(result).toEqual(persisted);
  });

  it('persists optional fields as null when omitted', async () => {
    const payload = {
      name: 'An Nguyen',
      email: 'an@example.com',
      message: 'Need photography quote',
    };

    const persisted = {
      id: 'inquiry-2',
      ...payload,
      phone: null,
      packageInterest: null,
      createdAt: new Date('2026-04-15T12:00:00.000Z'),
      updatedAt: new Date('2026-04-15T12:00:00.000Z'),
    };

    createMock.mockResolvedValue(persisted);

    const result = await service.create(payload);

    expect(createMock).toHaveBeenCalledWith({
      data: {
        name: payload.name,
        email: payload.email,
        message: payload.message,
        phone: null,
        packageInterest: null,
      },
    });
    expect(result).toEqual(persisted);
  });
});
