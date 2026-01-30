# Prisma Schema Best Practices Implementation

**Goal:** Normalize database schema to PostgreSQL snake_case conventions with proper Prisma mapping.

---

## 1. Enums - Keep as UPPERCASE in Database

```prisma
/// Booking lifecycle status
enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}

/// Order payment status
enum OrderStatus {
  UNPAID
  PARTIAL
  PAID
  REFUNDED
  CANCELLED
}

/// Payment method types
enum PaymentMethod {
  CASH
  BANK_TRANSFER
  CREDIT_CARD
  E_WALLET
}

/// Payment lifecycle status
enum PaymentStatus {
  PENDING
  PARTIAL_PAID
  SUCCESSFUL
  FAILED
  CANCELLED
  ABANDONED
  REFUNDED
}
```

**✅ Enums remain UPPERCASE - no @map needed**

---

## 2. User Model - Complete Example

```prisma
/// User account with authentication credentials
model User {
  id                String         @id @default(uuid())
  /// Unique phone number for login
  phoneNumber       String         @unique @map("phone_number")
  passwordHash      String         @map("password_hash")
  firstName         String?        @map("first_name")
  lastName          String?        @map("last_name")
  email             String?        @unique
  avatarUrl         String?        @map("avatar_url")
  /// Account active/inactive status
  isActive          Boolean        @default(true) @map("is_active")
  refreshToken      String?        @map("refresh_token")
  refreshTokenExpiry DateTime?      @map("refresh_token_expiry")

  // Relations
  roles             UserRole[]
  bookings          Booking[]
  sessions          BookingSession[]
  files             File[]
  albums            Album[]

  // Timestamps
  createdAt         DateTime       @default(now()) @map("created_at")
  updatedAt         DateTime       @updatedAt @map("updated_at")
  deletedAt         DateTime?      @map("deleted_at")

  @@map("user")
  @@index([email])
  @@index([isActive])
  @@index([createdAt])
}
```

---

## 3. Payment Model - Complex Example

```prisma
/// Payment transaction record
model Payment {
  id                  String         @id @default(uuid())
  orderId             String         @map("order_id")
  /// Sequence number for payments within an order
  paymentSequence     Int            @default(1) @map("payment_sequence")
  paymentType         PaymentType    @default(REMAINING) @map("payment_type")
  /// Payment amount in VND
  amount              Float
  method              PaymentMethod
  status              PaymentStatus  @default(PENDING)
  description         String?
  dueDate             DateTime?      @map("due_date")
  attemptCount        Int            @default(0) @map("attempt_count")
  lastAttemptAt       DateTime?      @map("last_attempt_at")
  successfulAttemptId String?        @map("successful_attempt_id")
  notes               String?
  internalNotes       String?        @map("internal_notes")
  cancelledAt         DateTime?      @map("cancelled_at")
  cancellationReason  String?        @map("cancellation_reason")

  // Relations
  order                    Order                        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  attempts                 PaymentAttempt[]
  gatewayTransactions      PaymentGatewayTransaction[]

  // Timestamps
  createdAt           DateTime       @default(now()) @map("created_at")
  updatedAt           DateTime       @updatedAt @map("updated_at")

  @@map("payment")
  @@unique([orderId, paymentSequence])
  @@index([orderId])
  @@index([status])
  @@index([dueDate])
  @@index([method])
}
```

---

## 4. Junction Model - Example

```prisma
/// Links users to their assigned roles
model UserRole {
  userId String @map("user_id")
  roleId String @map("role_id")

  // Relations
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@map("user_role")
  @@id([userId, roleId])
  @@index([roleId])
}
```

---

## 5. Naming Pattern Reference

| Element | Pattern | Example | Notes |
|---------|---------|---------|-------|
| Table | snake_case | `user`, `payment_attempt` | Use `@@map()` |
| Column | snake_case | `phone_number`, `created_at` | Use `@map()` |
| Prisma Field | camelCase | `phoneNumber`, `createdAt` | Always camelCase in Prisma |
| Prisma Model | PascalCase | `User`, `PaymentAttempt` | Model name |
| Enum | PascalCase | `PaymentStatus` | Enum type |
| Enum Value | UPPER_SNAKE_CASE | `PARTIAL_PAID` | Database value |

---

## 6. Timestamps Pattern (Standard)

```prisma
model Entity {
  id        String   @id @default(uuid())
  // ... fields ...
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")  // For soft deletes
  
  @@map("entity")
}
```

---

## 7. Field Validation Patterns

```prisma
model Product {
  id               String  @id @default(uuid())
  /// Product name, required
  name             String
  /// Optional detailed description
  description      String?
  /// Price in VND, min 0
  price            Float   @default(0)
  /// Available stock quantity
  stockQty         Int     @default(0) @map("stock_qty")
  /// Active/inactive status
  isActive         Boolean @default(false) @map("is_active")
  categoryId       String? @map("category_id")

  // Relations
  category         Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  
  // Timestamps
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  deletedAt        DateTime? @map("deleted_at")

  @@map("product")
  @@index([categoryId])
  @@index([isActive])
}
```

---

## 8. Migration Strategy

### Step 1: Create Migration with New Names
```bash
npx prisma migrate dev --name normalize_database_naming
```

### Step 2: Migration File (auto-generated)
The migration will:
1. Create new tables with snake_case names
2. Migrate data from old tables
3. Drop old tables (if needed)
4. Update foreign keys

### Step 3: Verify in Database
```sql
\d user  -- Check columns are snake_case
SELECT * FROM user LIMIT 1;
```

---

## 9. Common Mistakes to Avoid

### ❌ Wrong: Missing @map
```prisma
model User {
  phoneNumber String  // Generates: "phoneNumber" column ❌
}
```

### ✅ Correct: Add @map
```prisma
model User {
  phoneNumber String @map("phone_number")  // Generates: "phone_number" column ✅
}
```

### ❌ Wrong: Inconsistent naming
```prisma
model User {
  phoneNumber String @map("phone_no")  // Inconsistent naming
  emailAddress String @map("email")     // Should be "email_address"
}
```

### ✅ Correct: Consistent pattern
```prisma
model User {
  phoneNumber String @map("phone_number")
  emailAddress String @map("email_address")
}
```

---

## 10. Special Cases

### Boolean Fields
```prisma
model User {
  isActive    Boolean @default(true) @map("is_active")
  isDeleted   Boolean @default(false) @map("is_deleted")
  isVerified  Boolean @map("is_verified")
}
```

### Numeric Fields with Units
```prisma
model Payment {
  /// Amount in VND (primary currency)
  amount      Float   @map("amount")  // Avoid "amountVND"
  
  /// Price in decimal (2 places)
  price       Decimal @db.Decimal(10, 2)
  
  /// Percentage (0-100)
  taxRate     Float   @map("tax_rate")
}
```

### Foreign Keys with Naming
```prisma
model Booking {
  id          String @id @default(uuid())
  customerId  String @map("customer_id")
  
  customer    User   @relation(fields: [customerId], references: [id])
  
  @@map("booking")
  @@index([customerId])  // Use Prisma field name
}
```

---

## 11. Review Checklist

Before committing schema changes:

- [ ] All table names use `@@map("snake_case")`
- [ ] All column names use `@map("snake_case")`
- [ ] All Prisma field names remain `camelCase`
- [ ] All relation fields have corresponding `@map` on FK
- [ ] All indexes use correct field names
- [ ] Timestamps follow pattern: `createdAt`, `updatedAt`, `deletedAt`
- [ ] Enums remain UPPERCASE (no @map needed)
- [ ] Migration generates correct SQL
- [ ] Prisma client regenerates: `npx prisma generate`

---

## 12. Testing Schema Changes

```bash
# Generate updated client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Verify with Studio
npm run prisma:studio

# Run tests
npm run test
```

