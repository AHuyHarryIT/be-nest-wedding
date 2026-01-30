# 🎨 Visual Architecture Reference Guide

**A Quick Visual Guide to All Best Practices**

---

## 1. Database Layer Architecture

```
┌─────────────────────────────────────────┐
│         PostgreSQL (Production)          │
│    All tables & columns: snake_case      │
├─────────────────────────────────────────┤
│ user                                     │
│  ├─ id (PK)                              │
│  ├─ phone_number (UNIQUE)                │
│  ├─ password_hash                        │
│  ├─ is_active                            │
│  ├─ created_at (DEFAULT now())           │
│  ├─ updated_at (ON UPDATE now())         │
│  └─ deleted_at (NULL for active)         │
├─────────────────────────────────────────┤
│ payment                                  │
│  ├─ id (PK)                              │
│  ├─ order_id (FK)                        │
│  ├─ payment_sequence                     │
│  ├─ amount                               │
│  ├─ method (ENUM)                        │
│  ├─ status (ENUM: PENDING, etc)          │
│  ├─ created_at                           │
│  └─ updated_at                           │
└─────────────────────────────────────────┘
```

---

## 2. Prisma Model Mapping

```typescript
// ✅ CORRECT PATTERN
model User {
  // PK with UUID
  id                String         @id @default(uuid())
  
  // Unique fields mapped to snake_case
  phoneNumber       String         @unique @map("phone_number")
  
  // Regular fields mapped
  passwordHash      String         @map("password_hash")
  firstName         String?        @map("first_name")
  isActive          Boolean        @default(true) @map("is_active")
  
  // Timestamps all mapped
  createdAt         DateTime       @default(now()) @map("created_at")
  updatedAt         DateTime       @updatedAt @map("updated_at")
  deletedAt         DateTime?      @map("deleted_at")
  
  // Relations
  roles             UserRole[]
  bookings          Booking[]
  
  // Table mapping
  @@map("user")
  @@index([email])
  @@index([isActive])
}
```

---

## 3. NestJS Layered Architecture

```
                    HTTP Request
                         ↓
        ┌────────────────────────────────┐
        │     PaymentsController         │
        │  • Decorators: @Post, @Get     │
        │  • Swagger: @ApiOperation      │
        │  • Validation: CreatePaymentDto│
        │  • Auth: @UseGuards            │
        └────────────┬───────────────────┘
                     ↓
        ┌────────────────────────────────┐
        │      PaymentsService           │
        │  • Business Logic              │
        │  • Validation & Errors         │
        │  • Orchestration               │
        │  • Dependency Injection        │
        └────────────┬───────────────────┘
                     ↓
        ┌────────────────────────────────┐
        │    PaymentRepository           │
        │  • findById(id)                │
        │  • findMany(filters)           │
        │  • create(data)                │
        │  • update(id, data)            │
        │  • Complex queries             │
        └────────────┬───────────────────┘
                     ↓
        ┌────────────────────────────────┐
        │     DatabaseService            │
        │  (Prisma Client Wrapper)       │
        └────────────┬───────────────────┘
                     ↓
        ┌────────────────────────────────┐
        │        PostgreSQL              │
        │   (Actual Data Storage)        │
        └────────────────────────────────┘
                     ↓
                  Response
```

---

## 4. DTO Structure Per Module

```
payments/
├── dto/
│   ├── index.ts
│   │   ├── export * from './create-payment.dto'
│   │   ├── export * from './update-payment.dto'
│   │   ├── export * from './query-payment.dto'
│   │   └── export * from './payment.dto'
│   │
│   ├── create-payment.dto.ts
│   │   └── CreatePaymentDto
│   │       ├── @ApiProperty orderId
│   │       ├── @ApiProperty amount
│   │       ├── @ApiProperty method
│   │       └── @IsOptional dueDate
│   │
│   ├── update-payment.dto.ts
│   │   └── UpdatePaymentDto
│   │       ├── @IsOptional status
│   │       └── @IsOptional dueDate
│   │
│   ├── query-payment.dto.ts
│   │   └── QueryPaymentDto
│   │       ├── page (default 1)
│   │       ├── limit (default 20)
│   │       ├── status (filter)
│   │       ├── method (filter)
│   │       └── getSkip(), getTake()
│   │
│   └── payment.dto.ts
│       └── PaymentDto (Response)
│           ├── @ApiProperty id
│           ├── @ApiProperty amount
│           ├── @ApiProperty status
│           ├── @ApiPropertyOptional notes
│           └── @Exclude sensitive fields
```

---

## 5. Request → Response Flow

```
┌─────────────────────────┐
│   POST /payments        │
│   {                     │
│     orderId: "...",     │
│     amount: 1000000,    │
│     method: "E_WALLET"  │
│   }                     │
└────────────┬────────────┘
             ↓
┌─────────────────────────────────────────┐
│  ValidationPipe                         │
│  • Parse CreatePaymentDto               │
│  • Run @IsUUID, @IsNumber, etc          │
│  • Throw 400 if invalid                 │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  PaymentsController.create()            │
│  • Validated dto available              │
│  • Call paymentsService.create(dto)     │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  PaymentsService.create()               │
│  • Business logic                       │
│  • Call paymentRepository.create()      │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  PaymentRepository.create()             │
│  • Call database.payment.create()       │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Prisma Client                          │
│  • Generate SQL INSERT                  │
│  • Execute on PostgreSQL                │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  PostgreSQL                             │
│  • INSERT into payment table            │
│  • Return inserted row                  │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Prisma transforms to Payment object    │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Repository returns Payment             │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Service returns Payment (transformed)  │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Controller returns PaymentDto          │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Swagger response transformer           │
│  • Apply @Exclude decorators            │
│  • Hide sensitive fields                │
└────────────┬────────────────────────────┘
             ↓
┌──────────────────────────┐
│  200 Created             │
│  {                       │
│    id: "...",            │
│    amount: 1000000,      │
│    status: "PENDING",    │
│    createdAt: "2026-..." │
│  }                       │
└──────────────────────────┘
```

---

## 6. Type Safety Pyramid

```
                    ▲
                    │ Strictest
                    │ (Fewest Bugs)
                    │
        ╔═══════════════════════╗
        ║  Strict TypeScript    ║ ← @NoAny, @StrictNull, etc
        ║  No "any" types       ║
        ╚═══════════╤═══════════╝
                    │
        ╔═══════════════════════╗
        ║  Interfaces & Types   ║ ← IPaymentService, PaymentStatus
        ║  Clear contracts      ║
        ╚═══════════╤═══════════╝
                    │
        ╔═══════════════════════╗
        ║  Enums not Strings    ║ ← PENDING vs "PENDING"
        ║  Type-safe values     ║
        ╚═══════════╤═══════════╝
                    │
        ╔═══════════════════════╗
        ║  DTOs with Validation ║ ← @IsUUID, @Min, @Max
        ║  Runtime checks       ║
        ╚═══════════╤═══════════╝
                    │
        ╔═══════════════════════╗
        ║  Repository Pattern   ║ ← Interface abstraction
        ║  Mock-friendly        ║
        ╚═══════════╤═══════════╝
                    │
        ╔═══════════════════════╗
        ║  Error Boundaries     ║ ← Try/catch, global filter
        ║  Handled errors       ║
        ╚═══════════╤═══════════╝
                    │
                    ▼
                Loosest
             (Most Bugs)
```

---

## 7. Validation Decorator Chain

```
@ApiProperty({ description: "...", example: 100 })
        ↓
   ┌─────────────────────────────┐
   │  Input: { amount: "abc" }   │
   └─────────────┬───────────────┘
                 ↓
        ┌─────────────────────────┐
        │  @IsNumber()            │
        │  Fails: "abc" not number │
        └──────────┬──────────────┘
                   ↓
        ┌─────────────────────────┐
        │  @IsPositive()          │
        │  (if number)            │
        └──────────┬──────────────┘
                   ↓
        ┌─────────────────────────┐
        │  @Min(1000)             │
        │  (if positive)          │
        └──────────┬──────────────┘
                   ↓
        ┌─────────────────────────┐
        │  @Max(999999999)        │
        │  (if min valid)         │
        └──────────┬──────────────┘
                   ↓
        ✅ Valid: amount = 100000
```

---

## 8. Error Response Pattern

```
┌──────────────────────────────────────┐
│  Application Error                   │
├──────────────────────────────────────┤
│  Service throws:                     │
│  throw new NotFoundException(         │
│    `Order ${id} not found`           │
│  )                                   │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  Global Exception Filter             │
├──────────────────────────────────────┤
│  Catches all exceptions              │
│  Transforms to HTTP response         │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  Standardized Error Response         │
├──────────────────────────────────────┤
│  {                                   │
│    statusCode: 404,                  │
│    message: "Order abc not found",   │
│    error: "Not Found",               │
│    timestamp: "2026-01-30T10:00Z"    │
│  }                                   │
└──────────────────────────────────────┘
```

---

## 9. Migration Flow

```
Step 1: Identify Changes
  Current: phoneNumber field
  Target: phone_number column
           ↓
Step 2: Create Migration File
  prisma/migrations/20260130.../migration.sql
           ↓
Step 3: Write SQL
  ALTER TABLE "user" RENAME COLUMN "phoneNumber" TO "phone_number"
           ↓
Step 4: Apply Migration
  npm run prisma:migrate
           ↓
Step 5: Update Prisma Schema
  phoneNumber String @map("phone_number")
           ↓
Step 6: Regenerate Client
  npm run prisma:generate
           ↓
Step 7: Update Code (if needed)
  // No code changes needed - Prisma handles mapping!
           ↓
Step 8: Test
  npm run test
  npm run prisma:studio
           ↓
       ✅ Complete
```

---

## 10. Module Dependencies (Recommended)

```
                  app.module.ts
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    ConfigModule   DatabaseModule  CommonModule
                       │
        ┌──────────────┼──────────────┬──────────────┐
        │              │              │              │
    UsersModule   PaymentsModule  OrdersModule  BookingsModule
        │
        └──→ PaymentsModule (depends on orders)
        
Rules:
✅ Lower modules don't depend on higher
✅ Shared logic in CommonModule
✅ DatabaseModule injected everywhere needed
✅ Circular dependencies avoided
```

---

## 11. File Organization (Correct Structure)

```
src/
├── common/                    # Shared code
│   ├── decorators/
│   │   ├── permissions.decorator.ts
│   │   └── current-user.decorator.ts
│   ├── filters/
│   │   └── exception.filter.ts
│   ├── guards/
│   │   └── permissions.guard.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   └── utils/
│       └── logger.ts
│
├── database/                  # ORM Integration
│   ├── database.module.ts
│   └── database.service.ts
│
├── infrastructure/            # Config & Setup
│   ├── config/
│   │   └── app.config.ts
│   └── logger/
│       └── logger.service.ts
│
├── shared/                    # Global types/enums
│   ├── constants/
│   ├── dto/                   # Global DTOs
│   ├── enums/
│   ├── exceptions/
│   ├── filters/
│   └── types/
│
├── modules/                   # Feature modules
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   ├── guards/
│   │   └── strategies/
│   │
│   ├── payments/
│   │   ├── payments.module.ts
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   ├── dto/
│   │   ├── repositories/
│   │   ├── entities/
│   │   ├── interfaces/
│   │   └── gateways/
│   │
│   ├── orders/
│   ├── bookings/
│   └── [other modules]/
│
├── app.module.ts              # Main module
├── app.controller.ts
├── main.ts                    # Entry point
```

---

## 12. Testing Pyramid

```
            ▲
            │
            │     E2E Tests (5%)
          ╱ ╲    • Full API flows
         ╱   ╲   • Real DB
        ╱     ╲  • Selenium, etc.
       ╱───────╲
      ╱         ╲ Integration Tests (15%)
     ╱           ╲ • Multiple modules
    ╱─────────────╲ • Mocked external
   ╱               ╲ services
  ╱─────────────────╲
 ╱                   ╲ Unit Tests (80%)
╱─────────────────────╲ • Single functions
                       • Mocked dependencies
                       • Fast & isolated

✅ Use repositories to mock data access
✅ Mock external services
✅ Test business logic thoroughly
```

---

## 13. Git Workflow (Recommended)

```
main (production-ready)
  ↑
  └─ release/v1.0.0 (release prep)
      ↑
      └─ dev (development branch)
          ↑
          ├─ feature/database-normalization
          ├─ feature/repository-pattern
          ├─ feature/dto-standardization
          ├─ feature/swagger-docs
          └─ fix/error-handling
          
Commit message format:
feat: add payment repository pattern
fix: normalize database naming conventions
docs: update API documentation
```

---

## 14. Deployment Checklist

```
Pre-deployment:
  ✅ npm run lint (0 errors, 0 warnings)
  ✅ npm run build (successful)
  ✅ npm run test (100% pass)
  ✅ npm run test:cov (95%+ coverage)
  
Database:
  ✅ npm run prisma:migrate deploy (all migrations applied)
  ✅ Verified data integrity
  ✅ Backup taken
  
API:
  ✅ Swagger docs complete (http://localhost/api)
  ✅ All endpoints tested
  ✅ Error responses validated
  
Performance:
  ✅ Load test passed
  ✅ Response times acceptable
  ✅ Database indexes verified
  
Security:
  ✅ JWT auth enabled
  ✅ Sensitive data excluded from DTOs
  ✅ Input validation comprehensive
  ✅ SQL injection prevention (Prisma)
  
Monitoring:
  ✅ Logging configured
  ✅ Error tracking enabled
  ✅ Performance monitoring setup
  
Deploy ✅
```

---

## 15. Quick Reference Card

```
┌─────────────────────────────────┐
│      NAMING CONVENTIONS         │
├─────────────────────────────────┤
│ Database Tables:   snake_case   │
│ Database Columns:  snake_case   │
│ Prisma Models:     PascalCase   │
│ Prisma Fields:     camelCase    │
│ Services:          PascalCase   │
│ Controllers:       PascalCase   │
│ DTOs:              PascalCase   │
│ Enum Values:       UPPER_SNAKE  │
│ Functions:         camelCase    │
│ Constants:         UPPER_SNAKE  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│     DTO FILE STRUCTURE          │
├─────────────────────────────────┤
│ create-*.dto.ts     (POST input)│
│ update-*.dto.ts     (PATCH)     │
│ query-*.dto.ts      (GET filter)│
│ *.dto.ts            (response)  │
│ *-details.dto.ts    (detailed)  │
│ index.ts            (exports)   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  VALIDATION DECORATORS          │
├─────────────────────────────────┤
│ @IsNotEmpty()    Required       │
│ @IsOptional()    Can be omitted │
│ @IsNumber()      Must be number │
│ @IsString()      Must be string │
│ @Min(n)          Minimum value  │
│ @Max(n)          Maximum value  │
│ @MaxLength(n)    Max characters │
│ @IsEnum()        Enum value     │
│ @IsUUID()        Valid UUID     │
│ @IsEmail()       Valid email    │
└─────────────────────────────────┘
```

---

**All diagrams and references use:** Clean architecture + NestJS + Prisma + PostgreSQL best practices

Save this for quick reference during implementation! 📌

