# Repository Pattern Implementation Guide

**Goal:** Add abstraction layer between services and Prisma for better testability and maintainability.

---

## 1. Base Repository (Generic)

Create [src/common/repositories/base.repository.ts](src/common/repositories/base.repository.ts):

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { Prisma } from '@prisma/client';

/**
 * Generic repository base class providing standard CRUD operations.
 * Extend this for specific models.
 */
@Injectable()
export class BaseRepository<T> {
  constructor(protected readonly database: DatabaseService) {}

  /**
   * Find unique record by filter
   */
  async findOne(where: Prisma.UserWhereUniqueInput): Promise<T | null> {
    throw new Error('Must be implemented in child class');
  }

  /**
   * Find multiple records with filters and pagination
   */
  async findMany(
    where?: Prisma.UserWhereInput,
    skip?: number,
    take?: number,
    orderBy?: Prisma.UserOrderByWithRelationInput,
  ): Promise<T[]> {
    throw new Error('Must be implemented in child class');
  }

  /**
   * Count records matching filter
   */
  async count(where?: Prisma.UserWhereInput): Promise<number> {
    throw new Error('Must be implemented in child class');
  }

  /**
   * Create new record
   */
  async create(data: any): Promise<T> {
    throw new Error('Must be implemented in child class');
  }

  /**
   * Update existing record
   */
  async update(where: any, data: any): Promise<T> {
    throw new Error('Must be implemented in child class');
  }

  /**
   * Delete record (hard delete)
   */
  async delete(where: any): Promise<T> {
    throw new Error('Must be implemented in child class');
  }

  /**
   * Soft delete record (set deletedAt)
   */
  async softDelete(where: any): Promise<T> {
    throw new Error('Must be implemented in child class');
  }
}
```

---

## 2. User Repository (Specific Implementation)

Create [src/modules/users/repositories/user.repository.ts](src/modules/users/repositories/user.repository.ts):

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { User, Prisma } from '@prisma/client';

/**
 * User repository handling all user-related database operations
 */
@Injectable()
export class UserRepository {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Find user by ID with related data
   */
  async findById(id: string, include?: Prisma.UserInclude): Promise<User | null> {
    return this.database.user.findUnique({
      where: { id },
      include,
    });
  }

  /**
   * Find user by phone number (unique login field)
   */
  async findByPhoneNumber(
    phoneNumber: string,
    include?: Prisma.UserInclude,
  ): Promise<User | null> {
    return this.database.user.findUnique({
      where: { phoneNumber },
      include,
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(
    email: string,
    include?: Prisma.UserInclude,
  ): Promise<User | null> {
    return this.database.user.findFirst({
      where: { email },
      include,
    });
  }

  /**
   * Find many users with pagination
   */
  async findMany(
    where?: Prisma.UserWhereInput,
    skip?: number,
    take?: number,
  ): Promise<User[]> {
    return this.database.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Count users matching criteria
   */
  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return this.database.user.count({ where });
  }

  /**
   * Create new user
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.database.user.create({ data });
  }

  /**
   * Update user
   */
  async update(
    id: string,
    data: Prisma.UserUpdateInput,
  ): Promise<User> {
    return this.database.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete user (set deletedAt, deactivate)
   */
  async softDelete(id: string): Promise<User> {
    return this.database.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  /**
   * Hard delete user
   */
  async delete(id: string): Promise<User> {
    return this.database.user.delete({
      where: { id },
    });
  }

  /**
   * Check if user exists
   */
  async exists(phoneNumber: string): Promise<boolean> {
    const count = await this.database.user.count({
      where: { phoneNumber },
    });
    return count > 0;
  }

  /**
   * Activate user account
   */
  async activate(id: string): Promise<User> {
    return this.database.user.update({
      where: { id },
      data: { isActive: true, deletedAt: null },
    });
  }

  /**
   * Get user with roles and permissions
   */
  async findWithRoles(id: string): Promise<User | null> {
    return this.database.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get user refresh token (for auth)
   */
  async getRefreshToken(id: string): Promise<string | null> {
    const user = await this.database.user.findUnique({
      where: { id },
      select: { refreshToken: true, refreshTokenExpiry: true },
    });

    if (!user?.refreshToken || (user.refreshTokenExpiry && user.refreshTokenExpiry < new Date())) {
      return null;
    }

    return user.refreshToken;
  }

  /**
   * Update refresh token
   */
  async updateRefreshToken(
    id: string,
    token: string,
    expiry: Date,
  ): Promise<void> {
    await this.database.user.update({
      where: { id },
      data: {
        refreshToken: token,
        refreshTokenExpiry: expiry,
      },
    });
  }
}
```

---

## 3. Payment Repository (Complex Example)

Create [src/modules/payments/repositories/payment.repository.ts](src/modules/payments/repositories/payment.repository.ts):

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { Payment, PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';

@Injectable()
export class PaymentRepository {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Find payment by ID
   */
  async findById(id: string): Promise<Payment | null> {
    return this.database.payment.findUnique({
      where: { id },
      include: {
        order: true,
        attempts: { orderBy: { createdAt: 'desc' } },
        gatewayTransactions: true,
      },
    });
  }

  /**
   * Find payment with details for display
   */
  async findWithDetails(id: string) {
    return this.database.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            booking: true,
          },
        },
        attempts: {
          include: {
            gatewayTransaction: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        gatewayTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Find payments by order with pagination
   */
  async findByOrder(
    orderId: string,
    skip?: number,
    take?: number,
  ): Promise<Payment[]> {
    return this.database.payment.findMany({
      where: { orderId },
      skip,
      take,
      orderBy: { paymentSequence: 'asc' },
      include: {
        attempts: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  /**
   * Find pending payments (for reminders, processing)
   */
  async findPending(daysOverdue?: number): Promise<Payment[]> {
    const filterDate = daysOverdue
      ? new Date(Date.now() - daysOverdue * 24 * 60 * 60 * 1000)
      : new Date();

    return this.database.payment.findMany({
      where: {
        status: {
          in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL_PAID],
        },
        dueDate: {
          lte: filterDate,
        },
      },
      include: {
        order: {
          include: { booking: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Find successful payments by date range
   */
  async findSuccessful(
    startDate: Date,
    endDate: Date,
  ): Promise<Payment[]> {
    return this.database.payment.findMany({
      where: {
        status: PaymentStatus.SUCCESSFUL,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create payment
   */
  async create(data: Prisma.PaymentCreateInput): Promise<Payment> {
    return this.database.payment.create({ data });
  }

  /**
   * Update payment status
   */
  async updateStatus(
    id: string,
    status: PaymentStatus,
  ): Promise<Payment> {
    return this.database.payment.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
  }

  /**
   * Update payment with full data
   */
  async update(
    id: string,
    data: Prisma.PaymentUpdateInput,
  ): Promise<Payment> {
    return this.database.payment.update({
      where: { id },
      data,
    });
  }

  /**
   * Cancel payment
   */
  async cancel(id: string, reason: string): Promise<Payment> {
    return this.database.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
  }

  /**
   * Get next payment sequence number for order
   */
  async getNextSequence(orderId: string): Promise<number> {
    const lastPayment = await this.database.payment.findFirst({
      where: { orderId },
      orderBy: { paymentSequence: 'desc' },
      select: { paymentSequence: true },
    });
    return (lastPayment?.paymentSequence ?? 0) + 1;
  }

  /**
   * Get total amount paid for order
   */
  async getTotalPaid(orderId: string): Promise<number> {
    const result = await this.database.payment.aggregate({
      where: {
        orderId,
        status: PaymentStatus.SUCCESSFUL,
      },
      _sum: {
        amount: true,
      },
    });
    return result._sum.amount ?? 0;
  }

  /**
   * Delete payment (hard delete)
   */
  async delete(id: string): Promise<Payment> {
    return this.database.payment.delete({
      where: { id },
    });
  }
}
```

---

## 4. Repository in Service

Update [src/modules/payments/payments.service.ts](src/modules/payments/payments.service.ts):

**Before (Without Repository):**
```typescript
@Injectable()
export class PaymentsService {
  constructor(private readonly database: DatabaseService) {}

  async getPayment(id: string) {
    return this.database.payment.findUnique({ where: { id } });
  }
}
```

**After (With Repository):**
```typescript
import { Injectable } from '@nestjs/common';
import { PaymentRepository } from './repositories/payment.repository';

@Injectable()
export class PaymentsService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async getPayment(id: string) {
    return this.paymentRepository.findById(id);
  }

  async getPendingPayments() {
    return this.paymentRepository.findPending();
  }
}
```

---

## 5. Module Configuration

Update [src/modules/payments/payments.module.ts](src/modules/payments/payments.module.ts):

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentAttemptRepository } from './repositories/payment-attempt.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentRepository,
    PaymentAttemptRepository,
    // ... other services
  ],
  exports: [
    PaymentsService,
    PaymentRepository,
    PaymentAttemptRepository,
  ],
})
export class PaymentsModule {}
```

---

## 6. Unit Testing with Repository

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PaymentRepository } from './repositories/payment.repository';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let repository: PaymentRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PaymentRepository,
          useValue: {
            findById: jest.fn(),
            create: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    repository = module.get<PaymentRepository>(PaymentRepository);
  });

  describe('getPayment', () => {
    it('should call repository.findById', async () => {
      const paymentId = 'test-id';
      const mockPayment = { id: paymentId, amount: 100 };

      jest.spyOn(repository, 'findById').mockResolvedValue(mockPayment as any);

      const result = await service.getPayment(paymentId);

      expect(repository.findById).toHaveBeenCalledWith(paymentId);
      expect(result).toEqual(mockPayment);
    });
  });
});
```

---

## 7. Benefits of Repository Pattern

| Benefit | Impact |
|---------|--------|
| **Testability** | Easy to mock repository in tests |
| **Maintainability** | Centralized query logic |
| **Reusability** | Shared queries across services |
| **Flexibility** | Switch database without changing services |
| **Clean Architecture** | Clear separation of concerns |
| **Query Optimization** | Easy to add caching/logging |

---

## 8. Common Repository Methods Checklist

```typescript
// Basic CRUD
- findById(id: string): T
- findMany(where?, skip?, take?): T[]
- create(data): T
- update(id, data): T
- delete(id): T
- softDelete(id): T

// Specific Queries
- findByUnique(field, value): T
- findAll(): T[]
- count(where?): number
- exists(where?): boolean

// Advanced
- findWithRelations(id, relations): T
- findMany(where, pagination, sort): T[]
- aggregate(): AggregateResult
- transaction(): void
```

---

## 9. Migration Timeline

1. **Phase 1:** Create base repositories for core models (User, Order, Payment)
2. **Phase 2:** Update core services to use repositories
3. **Phase 3:** Create repositories for remaining models
4. **Phase 4:** Update tests to mock repositories
5. **Phase 5:** Add advanced query methods as needed

---

