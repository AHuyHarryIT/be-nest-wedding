import { ConfigService } from '@nestjs/config';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  const authIdentityServiceMock = {
    assertPhoneNumberAvailable: jest.fn(),
    assertEmailAvailable: jest.fn(),
  };

  const databaseServiceMock = {
    customer: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const configServiceMock = {
    get: jest.fn().mockReturnValue(10),
  } as unknown as ConfigService;

  let service: CustomersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CustomersService(
      databaseServiceMock,
      configServiceMock,
      authIdentityServiceMock as any,
    );
  });

  it('creates a customer account and hashes the password', async () => {
    authIdentityServiceMock.assertPhoneNumberAvailable.mockResolvedValue(
      undefined,
    );
    authIdentityServiceMock.assertEmailAvailable.mockResolvedValue(undefined);
    databaseServiceMock.customer.create.mockResolvedValue({
      id: 'customer-1',
      phoneNumber: '0903311101',
      firstName: 'Nguyen',
      lastName: 'An',
      email: 'customer@example.com',
      avatarUrl: null,
      isActive: true,
      weddingDate: null,
      weddingVenue: null,
      emailNotifications: true,
      smsNotifications: true,
      marketingEmails: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    const result = await service.create({
      phoneNumber: '+84903311101',
      password: 'SecurePass123',
      firstName: 'Nguyen',
      lastName: 'An',
      email: 'customer@example.com',
    });

    expect(
      authIdentityServiceMock.assertPhoneNumberAvailable,
    ).toHaveBeenCalledWith('0903311101');
    expect(databaseServiceMock.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phoneNumber: '0903311101',
          passwordHash: expect.any(String),
          firstName: 'Nguyen',
          lastName: 'An',
        }),
      }),
    );
    expect(result.id).toBe('customer-1');
  });

  it('lists active customers with pagination', async () => {
    databaseServiceMock.customer.count.mockResolvedValue(1);
    databaseServiceMock.customer.findMany.mockResolvedValue([
      {
        id: 'customer-1',
        phoneNumber: '0903311101',
        firstName: 'Nguyen',
        lastName: 'An',
        email: 'customer@example.com',
        avatarUrl: null,
        isActive: true,
        weddingDate: null,
        weddingVenue: null,
        emailNotifications: true,
        smsNotifications: true,
        marketingEmails: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);

    const result = await service.findAll({ page: 1, limit: 10 } as any);

    expect(databaseServiceMock.customer.findMany).toHaveBeenCalled();
    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('rejects updates for missing customers', async () => {
    databaseServiceMock.customer.findFirst.mockResolvedValue(null);

    await expect(
      service.update('missing-id', { firstName: 'New' }),
    ).rejects.toThrow('Customer with ID "missing-id" not found');
  });

  it('soft deletes a customer account', async () => {
    databaseServiceMock.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      deletedAt: null,
    });
    databaseServiceMock.customer.update.mockResolvedValue(undefined);

    const result = await service.delete('customer-1');

    expect(databaseServiceMock.customer.update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: expect.objectContaining({
        isActive: false,
        refreshToken: null,
      }),
    });
    expect(result.message).toContain('deleted successfully');
  });
});
