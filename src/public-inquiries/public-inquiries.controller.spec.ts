import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { PublicInquiriesController } from './public-inquiries.controller';
import { PublicInquiriesService } from './public-inquiries.service';
import { CreatePublicInquiryDto } from './dto/create-public-inquiry.dto';

describe('PublicInquiriesController', () => {
  let controller: PublicInquiriesController;

  const createMock = jest.fn();
  const service = {
    create: createMock,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicInquiriesController],
      providers: [{ provide: PublicInquiriesService, useValue: service }],
    }).compile();

    controller = module.get<PublicInquiriesController>(
      PublicInquiriesController,
    );
    createMock.mockReset();
  });

  it('accepts a valid payload and delegates to service create', async () => {
    const payload = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      message: 'Need details for our wedding package',
      phone: '0903111222',
      packageInterest: 'Premium',
    };

    const persisted = {
      id: 'inquiry-1',
      ...payload,
      createdAt: new Date('2026-04-15T10:00:00.000Z'),
      updatedAt: new Date('2026-04-15T10:00:00.000Z'),
    };

    createMock.mockResolvedValue(persisted);

    const result = await controller.create(payload);

    expect(createMock).toHaveBeenCalledWith(payload);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(persisted);
    expect(result.message).toBe('Public inquiry submitted successfully');
  });

  it('returns ResponseBuilder.created envelope for successful persistence', async () => {
    const payload = {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Please contact me tomorrow',
    };

    const persisted = {
      id: 'inquiry-2',
      ...payload,
      phone: null,
      packageInterest: null,
      createdAt: new Date('2026-04-15T11:00:00.000Z'),
      updatedAt: new Date('2026-04-15T11:00:00.000Z'),
    };

    createMock.mockResolvedValue(persisted);

    const result = await controller.create(payload);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(persisted);
    expect(result.meta).toBeDefined();
    expect(result.meta.timestamp).toBeDefined();
    expect(result.meta.version).toBeDefined();
    expect(result.meta.requestId).toMatch(/^req_/);
  });

  it('rejects missing required fields and invalid email in DTO validation', async () => {
    const validationPipe = new ValidationPipe({ transform: true });

    await expect(
      validationPipe.transform(
        {
          name: '',
          email: 'invalid-email',
          message: '',
        },
        {
          type: 'body',
          metatype: CreatePublicInquiryDto,
        },
      ),
    ).rejects.toBeDefined();
  });
});
