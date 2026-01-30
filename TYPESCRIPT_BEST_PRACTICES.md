# TypeScript & Code Quality Best Practices

**Goal:** Maintain strict typing, avoid common pitfalls, ensure production-quality code.

---

## 1. Strict TypeScript Configuration

File: [tsconfig.json](tsconfig.json)

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    },
    
    // Strict type checking - CRITICAL
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

---

## 2. No "any" Types - Examples

### ❌ Bad: Using any

```typescript
// Services
async function processPayment(data: any) {
  // Cannot trust what fields exist
  return data.amount + data.tax;  // Runtime error possible
}

// Controllers
async create(@Body() body: any) {
  // No validation, no type hints
  return this.service.create(body);
}

// DTOs
export class PaymentDto {
  id: any;        // What type is this?
  amount: any;    // How should I validate?
  status: any;    // Where's the enum?
}
```

### ✅ Good: Strict Typing

```typescript
// Services with proper types
async function processPayment(data: PaymentInput): Promise<PaymentResult> {
  if (!isValidAmount(data.amount)) {
    throw new BadRequestException('Invalid amount');
  }
  return {
    total: data.amount + data.tax,
  };
}

// Controllers with validation
async create(@Body() body: CreatePaymentDto): Promise<PaymentDto> {
  // Body is automatically validated through pipe
  return this.service.create(body);
}

// DTOs with explicit types
export class PaymentDto {
  @ApiProperty()
  id: string;  // Clear type

  @ApiProperty()
  amount: number;  // Numeric type

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;  // Enumerated type
}
```

---

## 3. Interfaces vs Types

### Use Interfaces for:
```typescript
// ✅ Contracts and extension
interface IPaymentService {
  create(dto: CreatePaymentDto): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
}

// ✅ Class implementation
interface User {
  id: string;
  email: string;
  activate(): void;
}

class UserEntity implements User {
  id: string;
  email: string;
  activate() { }
}
```

### Use Types for:
```typescript
// ✅ Unions and complex types
type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

// ✅ Mapped types
type ReadOnly<T> = {
  readonly [K in keyof T]: T[K];
};

// ✅ Tuples
type ValidationResult = [boolean, string];

// ✅ Function signatures
type PaymentProcessor = (amount: number) => Promise<Receipt>;
```

---

## 4. Enum Usage

### ✅ Correct Enum Pattern

```typescript
// Define once, reuse everywhere
export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// In Prisma schema
enum PaymentStatus {
  PENDING
  SUCCESSFUL
  FAILED
  CANCELLED
}

// In DTO
export class PaymentDto {
  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;
}

// In service
async updateStatus(id: string, status: PaymentStatus): Promise<Payment> {
  if (status === PaymentStatus.SUCCESSFUL) {
    // Compile-time check: can't make typo
    // Runtime check: value must be from enum
  }
}

// In validation
@IsEnum(PaymentStatus, {
  message: `Status must be one of: ${Object.values(PaymentStatus).join(', ')}`
})
status: PaymentStatus;
```

### ❌ Wrong: String Literals Without Enum

```typescript
// BAD: No type safety
async updateStatus(id: string, status: string) {
  if (status === 'PENDING_') {  // Typo! No compile error
    // ...
  }
}

// Called with wrong value
await updateStatus(id, 'UNKNOWN_STATUS');  // Compiles! Runtime error
```

---

## 5. Strict Null Checking

### ❌ Bad: Unsafe null access

```typescript
async getUser(id: string) {
  const user = await database.user.findUnique({ where: { id } });
  return user.email;  // Error: user might be null!
}

async processPayment(order: Order) {
  const amount = order.totalPrice;  // What if null?
  return amount * 0.1;  // NaN possibility
}
```

### ✅ Good: Handle null explicitly

```typescript
async getUser(id: string): Promise<string> {
  const user = await database.user.findUnique({ where: { id } });
  
  if (!user) {
    throw new NotFoundException(`User ${id} not found`);
  }
  
  return user.email;  // Guaranteed to exist
}

async processPayment(order: Order): Promise<number> {
  if (order.totalPrice == null) {
    throw new BadRequestException('Order price is required');
  }
  
  return order.totalPrice * 0.1;  // Safe calculation
}
```

---

## 6. Generics for Reusable Code

### ✅ Good: Generic repository

```typescript
// Generic interface
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<T>;
}

// Generic implementation
class DatabaseRepository<T> implements Repository<T> {
  constructor(
    private db: DatabaseService,
    private model: string,
  ) {}

  async findById(id: string): Promise<T | null> {
    return this.db[this.model].findUnique({ where: { id } });
  }

  async create(data: Partial<T>): Promise<T> {
    return this.db[this.model].create({ data });
  }
}

// Typed usage
const userRepo = new DatabaseRepository<User>(db, 'user');
const user = await userRepo.findById(id);  // Type: User | null
```

---

## 7. Utility Types

```typescript
// Partial - all fields optional
type CreateUserInput = Partial<User>;

// Required - all fields required
type UserUpdate = Required<Pick<User, 'email' | 'firstName'>>;

// Record - object with specific keys
type PaymentMethodConfig = Record<PaymentMethod, GatewayConfig>;
// Usage: config['CASH'], config['E_WALLET']

// Pick - select specific fields
type UserProfile = Pick<User, 'id' | 'firstName' | 'email'>;

// Omit - exclude specific fields
type UserPublic = Omit<User, 'passwordHash' | 'refreshToken'>;

// ReturnType - extract function return type
type PaymentResult = ReturnType<typeof processPayment>;

// Parameters - extract function parameters
type ValidationFn = (input: Parameters<typeof validate>[0]) => void;
```

---

## 8. Readonly Properties

```typescript
// ✅ Prevent accidental mutations
interface ImmutablePayment {
  readonly id: string;
  readonly createdAt: Date;
  readonly amount: number;
}

class PaymentEntity implements ImmutablePayment {
  readonly id: string;
  readonly createdAt: Date;
  readonly amount: number;

  constructor(data: ImmutablePayment) {
    this.id = data.id;
    this.createdAt = data.createdAt;
    this.amount = data.amount;
  }
}

// Readonly arrays
const statuses: readonly PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.SUCCESSFUL,
];

// Readonly record
const config: Readonly<Record<string, any>> = {
  apiUrl: process.env.API_URL,
  timeout: 5000,
};
```

---

## 9. Exhaustiveness Checking

```typescript
enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST',
}

// ✅ Compile error if role not handled
function getPermissions(role: UserRole): string[] {
  switch (role) {
    case UserRole.ADMIN:
      return ['create', 'read', 'update', 'delete'];
    case UserRole.USER:
      return ['read', 'update'];
    case UserRole.GUEST:
      return ['read'];
    default:
      // Exhaustiveness check - error if role type changes
      const _exhaustive: never = role;
      return _exhaustive;
  }
}
```

---

## 10. Error Handling Types

```typescript
// ✅ Typed error responses
class HttpException extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errorCode?: string,
  ) {
    super(message);
  }
}

class NotFoundError extends HttpException {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

class ValidationError extends HttpException {
  constructor(
    message: string,
    public fields: Record<string, string[]>,
  ) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

// Usage
throw new NotFoundError('Payment');
throw new ValidationError('Invalid input', {
  email: ['Email is required'],
  password: ['Password must be at least 8 characters'],
});
```

---

## 11. Async/Await Best Practices

```typescript
// ✅ Good: Proper async handling
async function processPayments(ids: string[]): Promise<Payment[]> {
  // Parallel processing
  const payments = await Promise.all(
    ids.map(id => paymentRepo.findById(id)),
  );

  return payments.filter((p): p is Payment => p !== null);
}

// ✅ Good: Error handling
async function getPaymentWithFallback(id: string): Promise<Payment> {
  try {
    return await paymentRepo.findById(id);
  } catch (error) {
    logger.error('Failed to fetch payment', { id, error });
    return defaultPayment;
  }
}

// ❌ Bad: Fire and forget
async function sendNotifications() {
  // These promises are not awaited!
  sendEmail(user.email);
  sendSMS(user.phone);
}

// ✅ Good: Handle all promises
async function sendNotifications() {
  await Promise.all([
    sendEmail(user.email),
    sendSMS(user.phone),
  ]);
}
```

---

## 12. Const Assertions

```typescript
// ✅ Literal types
const roles = ['ADMIN', 'USER', 'GUEST'] as const;
type UserRole = typeof roles[number];  // 'ADMIN' | 'USER' | 'GUEST'

// ✅ Object literals
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  retries: 3,
} as const;

// ✅ Status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
```

---

## 13. Dependency Injection Typing

```typescript
// ✅ Strong interface for dependencies
export interface IPaymentService {
  create(dto: CreatePaymentDto): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
}

// ✅ Service implementation with explicit types
@Injectable()
export class PaymentService implements IPaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly gatewayService: PaymentGatewayService,
  ) {}

  async create(dto: CreatePaymentDto): Promise<Payment> {
    return this.paymentRepository.create(dto);
  }

  async findById(id: string): Promise<Payment | null> {
    return this.paymentRepository.findById(id);
  }
}

// ✅ Module provides concrete implementation
@Module({
  providers: [
    {
      provide: 'IPaymentService',
      useClass: PaymentService,
    },
  ],
})
export class PaymentsModule {}

// ✅ Controller uses interface
@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject('IPaymentService') private paymentService: IPaymentService,
  ) {}
}
```

---

## 14. ESLint Configuration

File: [eslint.config.mjs](eslint.config.mjs)

```javascript
import typescript from 'typescript-eslint';
import eslint from '@eslint/js';

export default [
  eslint.configs.recommended,
  ...typescript.configs.recommended,
  {
    rules: {
      // No 'any' types
      '@typescript-eslint/no-explicit-any': 'error',

      // Require explicit return types
      '@typescript-eslint/explicit-function-return-types': [
        'warn',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],

      // No unused variables
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],

      // Require null checks
      '@typescript-eslint/strict-boolean-expressions': 'warn',

      // Use const/let, not var
      'no-var': 'error',
      'prefer-const': 'error',

      // Consistent naming
      'naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_SNAKE_CASE'],
        },
      ],
    },
  },
];
```

---

## 15. TypeScript Best Practices Checklist

### Code Quality
- [ ] No `any` types (use proper types or generics)
- [ ] All functions have explicit return types
- [ ] All parameters have types (no implicit `any`)
- [ ] `strict: true` in tsconfig
- [ ] `noImplicitAny: true`
- [ ] `strictNullChecks: true`
- [ ] All error cases handled

### Architecture
- [ ] Interfaces for contracts
- [ ] Enums for constants (not string literals)
- [ ] Generics for reusable components
- [ ] Dependency injection with typed services
- [ ] Clear separation of concerns

### Validation
- [ ] Input validation in DTOs
- [ ] Null checks on external data
- [ ] Type guards for narrowing
- [ ] Exhaustiveness checks in switches

### Performance
- [ ] No unnecessary type casts
- [ ] Proper generics (avoid type erosion)
- [ ] Lazy evaluation where appropriate
- [ ] Tree-shaking friendly exports

### Testing
- [ ] Mock types match real implementation
- [ ] Test data properly typed
- [ ] Type-safe test assertions
- [ ] No `any` in tests

---

## 16. Common TypeScript Mistakes

### ❌ Type Assertion Abuse
```typescript
// Bad: Forcing types
const payment = response.data as Payment;  // Hope data is correct!

// Good: Type guards
function isPayment(obj: unknown): obj is Payment {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'amount' in obj
  );
}

if (isPayment(response.data)) {
  // Now safely use as Payment
}
```

### ❌ Function Overloads Misused
```typescript
// Bad: Multiple overloads
function create(data: CreatePaymentDto): Promise<Payment>;
function create(id: string): Promise<Payment>;
function create(input: CreatePaymentDto | string): Promise<Payment> {
  if (typeof input === 'string') {
    return findById(input);
  }
  return repository.create(input);
}

// Good: Two functions
async function create(data: CreatePaymentDto): Promise<Payment> {
  return repository.create(data);
}

async function getPayment(id: string): Promise<Payment> {
  return repository.findById(id);
}
```

### ❌ Index Signature Abuse
```typescript
// Bad: Too loose
type Config = {
  [key: string]: any;  // Defeats type checking
};

// Good: Specific keys
type Config = {
  readonly apiUrl: string;
  readonly timeout: number;
  readonly retries: number;
};
```

---

## 17. Production Checklist

Before deploying, verify:

- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` succeeds without warnings
- [ ] `npm run test` passes all tests
- [ ] No `any` types in production code
- [ ] All error paths typed correctly
- [ ] Null safety checks complete
- [ ] Enums used instead of string literals
- [ ] Proper async/await patterns
- [ ] All external data validated
- [ ] Type definitions included in build

---

## 📊 Type Coverage Tool

```bash
# Install
npm install -D type-coverage

# Check coverage
npx type-coverage

# Strict checking
npx type-coverage --strict --at-least 95
```

Target: **95%+ type coverage**

---

This ensures a robust, maintainable, and type-safe codebase! 🎯

