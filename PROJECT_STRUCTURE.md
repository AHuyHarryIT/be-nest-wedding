# Wedding Management System - Project Structure

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Architecture](#project-architecture)
4. [Directory Structure](#directory-structure)
5. [Core Modules](#core-modules)
6. [Database Schema](#database-schema)
7. [Authentication & Authorization](#authentication--authorization)
8. [API Endpoints](#api-endpoints)
9. [Common Utilities](#common-utilities)
10. [Configuration](#configuration)
11. [Development Workflow](#development-workflow)

---

## 🎯 Project Overview

**be-nest-wedding** is a comprehensive Wedding Management System backend built with NestJS. It provides a complete solution for managing wedding-related services including:

- Customer and staff management with role-based access control (RBAC)
- Wedding package and service bookings
- Booking session scheduling with staff assignments
- Product inventory management and reservations
- Payment tracking (deposits and remaining balances)
- Photo album management with file uploads
- OneDrive integration for media storage

### Key Statistics
- **TypeScript Files:** 149
- **Total Lines of Code:** ~7,075
- **Modules:** 15+ feature modules
- **Database Tables:** 21 models

---

## 🛠 Technology Stack

### Backend Framework
- **NestJS 11.x** - Progressive Node.js framework
- **TypeScript 5.7.x** - Type-safe JavaScript
- **Node.js** - Runtime environment

### Database & ORM
- **PostgreSQL 16** - Primary database
- **Prisma 6.17.x** - Next-generation ORM
- **Docker Compose** - Database containerization

### Authentication & Security
- **JWT (jsonwebtoken)** - Token-based authentication
- **Passport.js** - Authentication middleware
- **bcryptjs** - Password hashing
- **Cookie-based authentication** - Secure token storage

### File Management
- **Multer 2.x** - File upload handling
- **Sharp 0.34.x** - Image processing
- **Azure MSAL** - Microsoft authentication
- **Microsoft Graph Client** - OneDrive integration

### Validation & Documentation
- **class-validator** - DTO validation
- **class-transformer** - Object transformation
- **Swagger/OpenAPI** - API documentation

### Development Tools
- **ESLint 9.x** - Code linting
- **Prettier 3.x** - Code formatting
- **Jest 30.x** - Testing framework
- **Husky 9.x** - Git hooks
- **Commitlint** - Commit message linting

---

## 🏗 Project Architecture

### Architectural Pattern
The project follows **NestJS's modular architecture** with a clear separation of concerns:

```
┌─────────────────────────────────────────────────┐
│              Application Layer                   │
│  (Controllers, Guards, Interceptors, Filters)   │
├─────────────────────────────────────────────────┤
│              Business Logic Layer                │
│         (Services, DTOs, Validators)            │
├─────────────────────────────────────────────────┤
│              Data Access Layer                   │
│       (Prisma ORM, Database Service)            │
├─────────────────────────────────────────────────┤
│              Database Layer                      │
│            (PostgreSQL Database)                 │
└─────────────────────────────────────────────────┘
```

### Design Patterns Used
1. **Module Pattern** - Feature-based module organization
2. **Dependency Injection** - NestJS DI container
3. **Repository Pattern** - Prisma as data access layer
4. **DTO Pattern** - Data Transfer Objects for validation
5. **Guard Pattern** - Authentication and authorization
6. **Interceptor Pattern** - Response transformation
7. **Filter Pattern** - Exception handling

---

## 📁 Directory Structure

```
be-nest-wedding/
├── .husky/                    # Git hooks configuration
├── docs/                      # Additional documentation
│   └── PRISMA_EXCEPTION_HANDLING.md
├── prisma/                    # Database schema and migrations
│   ├── migrations/            # Database migration files
│   ├── schema.prisma          # Prisma schema definition
│   ├── seed.ts                # Database seeding script
│   └── seed-rbac.ts           # RBAC seeding script
├── src/                       # Source code
│   ├── albums/                # Album management module
│   ├── auth/                  # Authentication module
│   ├── booking-sessions/      # Booking session management
│   ├── bookings/              # Booking management
│   ├── categories/            # Product category management
│   ├── common/                # Shared utilities and helpers
│   │   ├── decorators/        # Custom decorators
│   │   ├── dto/               # Common DTOs
│   │   ├── filters/           # Exception filters
│   │   ├── guards/            # Auth and permission guards
│   │   ├── interceptors/      # Response interceptors
│   │   ├── interfaces/        # TypeScript interfaces
│   │   └── utils/             # Helper utilities
│   ├── database/              # Database service module
│   ├── inventory-reservations/ # Inventory reservation module
│   ├── packages/              # Package management
│   ├── payments/              # Payment processing
│   ├── permissions/           # Permission management
│   ├── products/              # Product management
│   ├── roles/                 # Role management (RBAC)
│   ├── services/              # Service management
│   ├── storage/               # File storage (OneDrive)
│   ├── users/                 # User management
│   ├── app.module.ts          # Root application module
│   ├── app.controller.ts      # Root controller
│   ├── app.service.ts         # Root service
│   └── main.ts                # Application entry point
├── test/                      # Test files
│   ├── app.e2e-spec.ts       # End-to-end tests
│   └── jest-e2e.json         # E2E test configuration
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
├── .prettierrc               # Prettier configuration
├── commitlint.config.js      # Commit lint configuration
├── docker-compose.yml        # Docker services configuration
├── eslint.config.mjs         # ESLint configuration
├── nest-cli.json             # NestJS CLI configuration
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── tsconfig.build.json       # Build-specific TS config
├── CRUD_API_SUMMARY.md       # API implementation summary
├── VALIDATION_IMPROVEMENTS.md # Validation enhancements doc
└── README.md                 # Project readme
```

---

## 🧩 Core Modules

### 1. **Authentication Module** (`src/auth/`)
**Purpose:** Handle user authentication and token management

**Files:**
- `auth.controller.ts` - Login, register, logout, refresh endpoints
- `auth.service.ts` - Authentication business logic
- `jwt.strategy.ts` - JWT validation strategy
- `jwt-cookie.strategy.ts` - Cookie-based JWT strategy
- `jwt-auth.guard.ts` - JWT authentication guard
- `get-user.decorator.ts` - User decorator for extracting current user
- `dto/` - Login, register, refresh token DTOs
- `validators/` - Custom validation rules

**Key Features:**
- Cookie-based JWT authentication
- Phone number + password login
- Refresh token mechanism
- Password hashing with bcrypt
- User registration with role assignment

---

### 2. **Users Module** (`src/users/`)
**Purpose:** User profile and account management

**Files:**
- `users.controller.ts` - User CRUD endpoints
- `users.service.ts` - User business logic
- `dto/` - User DTOs

**Key Features:**
- Get user profile
- Update user information
- Manage user avatars
- User role assignments
- Soft delete support

---

### 3. **Roles & Permissions Module** (`src/roles/`, `src/permissions/`)
**Purpose:** Role-Based Access Control (RBAC) system

**Files:**
- `roles.controller.ts` - Role management endpoints
- `roles.service.ts` - Role business logic
- `permissions.controller.ts` - Permission management
- `permissions.service.ts` - Permission business logic
- `dto/` - Create/Update DTOs

**Key Features:**
- Create and manage roles
- Assign permissions to roles
- Assign roles to users
- Permission-based route protection
- Permission hierarchy

**Default Roles:**
- `admin` - Full system access
- `staff` - Limited operational access
- `customer` - Basic user access

---

### 4. **Products & Categories Module** (`src/products/`, `src/categories/`)
**Purpose:** Manage wedding-related products and inventory

**Files:**
- `products.controller.ts` - Product CRUD endpoints
- `products.service.ts` - Product business logic
- `product-image.service.ts` - Product image management
- `categories.controller.ts` - Category management
- `categories.service.ts` - Category business logic

**Key Features:**
- Product CRUD operations
- Product categorization
- Stock quantity tracking
- Product image upload to OneDrive
- Soft delete support
- Active/inactive status

**Product Properties:**
- Name, description, price
- Stock quantity
- Category assignment
- OneDrive folder integration
- Image file reference

---

### 5. **Services & Packages Module** (`src/services/`, `src/packages/`)
**Purpose:** Manage wedding services and service packages

**Files:**
- `services.controller.ts` - Service CRUD endpoints
- `services.service.ts` - Service business logic
- `packages.controller.ts` - Package CRUD endpoints
- `packages.service.ts` - Package business logic

**Key Features:**
- Service CRUD operations
- Package creation with multiple services
- Service pricing
- Package pricing
- Slug generation for SEO
- Active/inactive status

**Service Types Examples:**
- Photography
- Videography
- Makeup & Hair
- Venue decoration
- DJ/Entertainment

---

### 6. **Bookings Module** (`src/bookings/`)
**Purpose:** Manage wedding bookings and reservations

**Files:**
- `bookings.controller.ts` - Booking endpoints
- `bookings.service.ts` - Booking business logic
- `dto/` - Create, Update, Query DTOs

**Key Features:**
- Create bookings with packages
- Booking status management (PENDING, CONFIRMED, CANCELLED, COMPLETED)
- Event date tracking
- Customer assignment
- Total price calculation
- Booking cancellation
- Booking confirmation
- Relationship with sessions, albums, payments

**Booking Workflow:**
1. Customer creates booking with package selection
2. Booking starts in PENDING status
3. Admin/staff confirms booking → CONFIRMED
4. After event completion → COMPLETED
5. If needed → CANCELLED

---

### 7. **Booking Sessions Module** (`src/booking-sessions/`)
**Purpose:** Manage individual sessions within a booking

**Files:**
- `booking-sessions.controller.ts` - Session endpoints
- `booking-sessions.service.ts` - Session business logic
- `dto/` - Session DTOs

**Key Features:**
- Session scheduling with start/end times
- Location and address tracking
- Staff assignment to sessions
- Service assignment to sessions
- Inventory reservation per session
- Session status management

**Use Case:**
A wedding booking might have multiple sessions:
- Pre-wedding photoshoot session
- Wedding ceremony session
- Reception session

---

### 8. **Inventory Reservations Module** (`src/inventory-reservations/`)
**Purpose:** Reserve products for specific booking sessions

**Files:**
- `inventory-reservations.controller.ts`
- `inventory-reservations.service.ts`
- `dto/` - Reservation DTOs

**Key Features:**
- Reserve products for sessions
- Track quantity reserved
- Prevent double-booking of inventory
- Reservation timestamps
- Link products to booking sessions

---

### 9. **Payments Module** (`src/payments/`)
**Purpose:** Track booking payments (deposits and balances)

**Files:**
- `payments.controller.ts` - Payment endpoints
- `payments.service.ts` - Payment business logic
- `dto/` - Payment DTOs

**Key Features:**
- Deposit payment tracking
- Remaining balance tracking
- Multiple payment methods (CASH, BANK_TRANSFER, CREDIT_CARD, E_WALLET)
- Payment status (PENDING, SUCCESSFUL, FAILED, REFUNDED)
- Transaction ID tracking
- Payment notes and timestamps

**Payment Workflow:**
1. Create payment for booking
2. Record deposit payment
3. Track remaining balance
4. Update payment status

---

### 10. **Albums Module** (`src/albums/`)
**Purpose:** Manage photo albums for bookings

**Files:**
- `albums.controller.ts` - Album endpoints
- `albums.service.ts` - Album business logic
- `dto/` - Album DTOs

**Key Features:**
- Create albums for bookings
- Associate files with albums
- Album sharing with tokens
- Public/private albums
- Album expiration dates
- Cover image selection
- Sort order for files
- File captions

---

### 11. **Storage Module** (`src/storage/`)
**Purpose:** OneDrive integration for file storage

**Files:**
- `onedrive.service.ts` - OneDrive API integration
- `storage.module.ts` - Storage module configuration

**Key Features:**
- Upload files to OneDrive
- Create folders in OneDrive
- Azure/Microsoft Graph authentication
- File metadata storage
- Support for images and documents

---

### 12. **Database Module** (`src/database/`)
**Purpose:** Centralized Prisma database service

**Files:**
- `database.service.ts` - Prisma client wrapper
- `database.module.ts` - Database module configuration

**Key Features:**
- Global Prisma client instance
- Connection management
- Transaction support
- Query optimization
- Error handling

---

### 13. **Common Module** (`src/common/`)
**Purpose:** Shared utilities, decorators, guards, and filters

**Structure:**
```
common/
├── decorators/
│   ├── permissions.decorator.ts    # @RequirePermissions()
│   └── api-response.decorator.ts   # Swagger response decorators
├── dto/
│   ├── pagination-query.dto.ts     # Pagination parameters
│   └── response.dto.ts              # Standard response format
├── filters/
│   ├── http-exception.filter.ts    # HTTP exception handler
│   └── prisma-exception/           # Prisma error handlers
├── guards/
│   └── permissions.guard.ts        # Permission-based access control
├── interceptors/
│   └── response.interceptor.ts     # Response formatting
├── interfaces/
│   └── api-response.interface.ts   # Response type definitions
└── utils/
    ├── pagination.helper.ts        # Pagination utilities
    └── response-builder.util.ts    # Response builder class
```

**Key Components:**

#### Decorators
- `@RequirePermissions(...permissions)` - Protect routes with permissions
- `@ApiStandardResponse()` - Swagger success response
- `@ApiPaginatedResponse()` - Swagger paginated response

#### Guards
- `JwtAuthGuard` - Verify JWT token
- `PermissionsGuard` - Check user permissions

#### Filters
- `HttpExceptionFilter` - Format HTTP exceptions
- `PrismaExceptionFilter` - Handle Prisma database errors

#### Interceptors
- `ResponseInterceptor` - Transform all responses to standard format

#### Response Builder
```typescript
ResponseBuilder.success(data, message)
ResponseBuilder.created(data, message)
ResponseBuilder.updated(data, message)
ResponseBuilder.deleted(message)
ResponseBuilder.paginated(data, pagination, message)
ResponseBuilder.error(message, code, details)
```

---

## 💾 Database Schema

### Overview
The database uses PostgreSQL with Prisma ORM. The schema includes 21 models with comprehensive relationships.

### Core Models

#### **User**
```prisma
User {
  id                 String    @id @default(uuid())
  phoneNumber        String    @unique
  passwordHash       String
  firstName          String?
  lastName           String?
  email              String?
  avatarUrl          String?
  isActive           Boolean   @default(true)
  refreshToken       String?
  refreshTokenExpiry DateTime?
  roles              UserRole[]
  bookings           Booking[]
  sessions           SessionStaff[]
  files              File[]
  albums             Album[]
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  deletedAt          DateTime?
}
```

#### **Role & Permission (RBAC)**
```prisma
Role {
  id          String           @id @default(uuid())
  name        String           @unique
  description String?
  users       UserRole[]
  permissions RolePermission[]
}

Permission {
  id          String           @id @default(uuid())
  key         String           @unique
  description String?
  roles       RolePermission[]
}
```

#### **Product & Category**
```prisma
Product {
  id               String  @id @default(uuid())
  name             String
  description      String?
  price            Float   @default(0)
  stockQty         Int     @default(0)
  isActive         Boolean @default(false)
  categoryId       String?
  imageFileId      String?
  oneDriveFolderId String?
  category         Category?
  inventoryReservations InventoryReservation[]
}

Category {
  id          String  @id @default(uuid())
  name        String  @unique
  description String?
  isActive    Boolean @default(true)
  products    Product[]
}
```

#### **Service & Package**
```prisma
Service {
  id          String  @id @default(uuid())
  name        String
  slug        String? @unique
  description String?
  price       Float   @default(0)
  isActive    Boolean @default(false)
  packages    PackageService[]
  sessions    SessionService[]
}

Package {
  id          String  @id @default(uuid())
  name        String
  slug        String? @unique
  description String?
  price       Float   @default(0)
  isActive    Boolean @default(false)
  services    PackageService[]
  bookings    Booking[]
}
```

#### **Booking & BookingSession**
```prisma
Booking {
  id          String           @id @default(uuid())
  customerId  String
  packageId   String
  notes       String?
  status      BookingStatus    @default(PENDING)
  eventDate   DateTime
  totalPrice  Float            @default(0)
  cancelledAt DateTime?
  customer    User
  package     Package
  sessions    BookingSession[]
  albums      Album[]
  Payment     Payment[]
}

BookingSession {
  id           String        @id @default(uuid())
  bookingId    String
  title        String
  locationName String?
  address      String?
  startsAt     DateTime
  endsAt       DateTime
  status       BookingStatus @default(PENDING)
  booking      Booking
  staffs       SessionStaff[]
  services     SessionService[]
  inventoryReservations InventoryReservation[]
}
```

#### **Payment**
```prisma
Payment {
  id          String  @id @default(uuid())
  bookingId   String?
  totalAmount Float   @default(0)
  
  // Deposit payment tracking
  depositTxnId  String?
  depositMethod PaymentMethod?
  depositStatus PaymentStatus  @default(PENDING)
  depositAmount Float          @default(0)
  depositNote   String?
  depositAt     DateTime?
  
  // Remaining balance tracking
  remainingTxnId  String?
  remainingMethod PaymentMethod?
  remainingStatus PaymentStatus  @default(PENDING)
  remainingAmount Float          @default(0)
  remainingNote   String?
  remainingAt     DateTime?
  
  booking Booking?
}
```

#### **Album & File**
```prisma
File {
  id         String          @id @default(uuid())
  uploaderId String
  name       String
  storageKey String
  storageUrl String
  mimeType   String
  byteSize   Int
  width      Int?
  height     Int?
  usageType  String
  visibility VisibilityLevel @default(PRIVATE)
  uploader   User
  albums     AlbumFile[]
  coverAlbums Album[]
}

Album {
  id          String    @id @default(uuid())
  ownerUserId String?
  bookingId   String?
  title       String
  description String?
  isPublic    Boolean   @default(false)
  share_token String?   @unique
  expiresAt   DateTime?
  coverFileId String?
  owner       User?
  booking     Booking?
  coverFile   File?
  files       AlbumFile[]
}
```

### Enums

```typescript
enum BookingStatus {
  PENDING, CONFIRMED, CANCELLED, COMPLETED
}

enum PaymentMethod {
  CASH, BANK_TRANSFER, CREDIT_CARD, E_WALLET
}

enum PaymentStatus {
  PENDING, SUCCESSFUL, FAILED, REFUNDED
}

enum VisibilityLevel {
  PUBLIC, PRIVATE, UNLISTED
}
```

### Relationships Summary

- **User** → many Bookings (as customer)
- **User** → many SessionStaff (as staff member)
- **User** → many Files (as uploader)
- **User** → many Albums (as owner)
- **Role** ↔ **User** (many-to-many via UserRole)
- **Role** ↔ **Permission** (many-to-many via RolePermission)
- **Package** ↔ **Service** (many-to-many via PackageService)
- **Package** → many Bookings
- **Booking** → many BookingSessions
- **Booking** → many Albums
- **Booking** → many Payments
- **BookingSession** ↔ **User** (many-to-many via SessionStaff)
- **BookingSession** ↔ **Service** (many-to-many via SessionService)
- **BookingSession** → many InventoryReservations
- **Product** → many InventoryReservations
- **Category** → many Products
- **Album** ↔ **File** (many-to-many via AlbumFile)

---

## 🔐 Authentication & Authorization

### Authentication Flow

1. **User Registration**
   ```
   POST /auth/register
   Body: { phoneNumber, password, firstName, lastName, email }
   → Creates user with default "customer" role
   → Returns access token (in cookie) and refresh token
   ```

2. **User Login**
   ```
   POST /auth/login
   Body: { phoneNumber, password }
   → Validates credentials
   → Returns access token (in cookie) and refresh token
   ```

3. **Token Refresh**
   ```
   POST /auth/refresh
   Body: { refreshToken }
   → Validates refresh token
   → Returns new access token
   ```

4. **Logout**
   ```
   POST /auth/logout
   → Clears cookies
   → Invalidates refresh token
   ```

### JWT Token Structure
```json
{
  "userId": "uuid",
  "phoneNumber": "string",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Cookie Configuration
- **Name:** `access_token`
- **HttpOnly:** true
- **Secure:** true (in production)
- **SameSite:** Strict
- **Max Age:** 24 hours

### Permission-Based Authorization

#### Permission Keys
```typescript
// User management
'users:read', 'users:write', 'users:delete'

// Role management
'roles:read', 'roles:write', 'roles:delete'

// Booking management
'bookings:read', 'bookings:write', 'bookings:delete'

// Product management
'products:read', 'products:write', 'products:delete'

// And more...
```

#### Usage in Controllers
```typescript
@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  
  @Get()
  @RequirePermissions('products:read')
  findAll() { ... }
  
  @Post()
  @RequirePermissions('products:write')
  create() { ... }
  
  @Delete(':id')
  @RequirePermissions('products:delete')
  remove() { ... }
}
```

### Authorization Flow
```
Request → JwtAuthGuard (validates token)
       → PermissionsGuard (checks permissions)
       → Controller Method
```

---

## 🌐 API Endpoints

### Base URL
- **Development:** `http://localhost:3000`
- **API Documentation:** `http://localhost:3000/api-docs`

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/refresh` | Refresh access token | No |
| POST | `/auth/logout` | Logout user | Yes |
| GET | `/auth/profile` | Get current user profile | Yes |

### User Management

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/users` | List all users | `users:read` |
| GET | `/users/:id` | Get user by ID | `users:read` |
| PATCH | `/users/:id` | Update user | `users:write` |
| DELETE | `/users/:id` | Delete user | `users:delete` |

### Role & Permission Management

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/roles` | List roles | `roles:read` |
| POST | `/roles` | Create role | `roles:write` |
| GET | `/roles/:id` | Get role by ID | `roles:read` |
| PATCH | `/roles/:id` | Update role | `roles:write` |
| DELETE | `/roles/:id` | Delete role | `roles:delete` |
| POST | `/roles/:id/permissions` | Assign permissions | `roles:write` |
| GET | `/permissions` | List permissions | `permissions:read` |
| POST | `/permissions` | Create permission | `permissions:write` |

### Product & Category Management

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/products` | List products | `products:read` |
| POST | `/products` | Create product | `products:write` |
| GET | `/products/:id` | Get product by ID | `products:read` |
| PATCH | `/products/:id` | Update product | `products:write` |
| DELETE | `/products/:id` | Soft delete product | `products:delete` |
| POST | `/products/:id/restore` | Restore product | `products:write` |
| GET | `/categories` | List categories | `categories:read` |
| POST | `/categories` | Create category | `categories:write` |

### Service & Package Management

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/services` | List services | `services:read` |
| POST | `/services` | Create service | `services:write` |
| GET | `/services/:id` | Get service by ID | `services:read` |
| PATCH | `/services/:id` | Update service | `services:write` |
| DELETE | `/services/:id` | Soft delete service | `services:delete` |
| GET | `/packages` | List packages | `packages:read` |
| POST | `/packages` | Create package | `packages:write` |
| POST | `/packages/:id/services` | Add services to package | `packages:write` |

### Booking Management

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/bookings` | List bookings | `bookings:read` |
| POST | `/bookings` | Create booking | `bookings:write` |
| GET | `/bookings/:id` | Get booking by ID | `bookings:read` |
| PATCH | `/bookings/:id` | Update booking | `bookings:write` |
| DELETE | `/bookings/:id` | Soft delete booking | `bookings:delete` |
| POST | `/bookings/:id/restore` | Restore booking | `bookings:write` |
| POST | `/bookings/:id/confirm` | Confirm booking | `bookings:write` |
| POST | `/bookings/:id/cancel` | Cancel booking | `bookings:write` |

### Booking Session Management

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/booking-sessions` | List sessions | `booking-sessions:read` |
| POST | `/booking-sessions` | Create session | `booking-sessions:write` |
| GET | `/booking-sessions/:id` | Get session by ID | `booking-sessions:read` |
| PATCH | `/booking-sessions/:id` | Update session | `booking-sessions:write` |
| DELETE | `/booking-sessions/:id` | Delete session | `booking-sessions:delete` |

### Payment Management

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/payments` | List payments | `payments:read` |
| POST | `/payments` | Create payment | `payments:write` |
| GET | `/payments/:id` | Get payment by ID | `payments:read` |
| PATCH | `/payments/:id` | Update payment | `payments:write` |
| DELETE | `/payments/:id` | Delete payment | `payments:delete` |

### Album Management

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/albums` | List albums | `albums:read` |
| POST | `/albums` | Create album | `albums:write` |
| GET | `/albums/:id` | Get album by ID | `albums:read` |
| PATCH | `/albums/:id` | Update album | `albums:write` |
| DELETE | `/albums/:id` | Soft delete album | `albums:delete` |

### Inventory Reservations

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/inventory-reservations` | List reservations | `inventory:read` |
| POST | `/inventory-reservations` | Create reservation | `inventory:write` |
| GET | `/inventory-reservations/:id` | Get reservation | `inventory:read` |
| PATCH | `/inventory-reservations/:id` | Update reservation | `inventory:write` |
| DELETE | `/inventory-reservations/:id` | Delete reservation | `inventory:delete` |

---

## 🛠 Common Utilities

### Response Builder
Located: `src/common/utils/response-builder.util.ts`

**Standard Response Format:**
```typescript
{
  success: boolean,
  message: string,
  data: T | null,
  error?: {
    code: string,
    details: any
  },
  meta: {
    timestamp: string,
    version: string,
    requestId: string
  }
}
```

**Paginated Response Format:**
```typescript
{
  success: boolean,
  message: string,
  data: T[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number,
    hasNext: boolean,
    hasPrevious: boolean
  },
  meta: { ... }
}
```

### Pagination Helper
Located: `src/common/utils/pagination.helper.ts`

**Usage:**
```typescript
const { skip, take } = getPaginationParams(page, limit);
const items = await prisma.model.findMany({ skip, take });
```

### Exception Filters

1. **HttpExceptionFilter** - Formats HTTP exceptions
2. **PrismaExceptionFilter** - Handles Prisma errors
3. **PrismaClientExceptionFilter** - Handles Prisma client errors

**Common Prisma Errors Handled:**
- P2002: Unique constraint violation
- P2003: Foreign key constraint failed
- P2025: Record not found
- P2001: Record does not exist

---

## ⚙️ Configuration

### Environment Variables

```bash
# Application
PORT=3000
NODE_ENV=development

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=appdb
DATABASE_URL="postgresql://user:password@localhost:5432/appdb"

# JWT
JWT_SECRET=super-secret-jwt-key
JWT_EXPIRES_IN=24h

# OneDrive/Azure
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id
AZURE_USER_ID=your-user-id

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4200
```

### NestJS Configuration
**File:** `nest-cli.json`
```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

### TypeScript Configuration
**Files:** `tsconfig.json`, `tsconfig.build.json`
- **Target:** ES2021
- **Module:** CommonJS
- **Strict mode:** Enabled
- **Decorators:** Enabled

### Prisma Configuration
**File:** `prisma/schema.prisma`
- **Provider:** PostgreSQL
- **Client output:** `../generated/prisma`
- **Migrations:** Enabled

---

## 🚀 Development Workflow

### Installation
```bash
# Install dependencies
npm install

# Setup database
docker-compose up -d

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database
npm run prisma:db:seed
```

### Development
```bash
# Start development server
npm run start:dev

# Start with debugging
npm run start:debug

# Access Swagger docs
open http://localhost:3000/api-docs
```

### Database Management
```bash
# Create new migration
npm run prisma:migrate

# Deploy migrations
npm run prisma:deploy

# Open Prisma Studio
npm run prisma:studio

# Reset database
npm run prisma:reset

# Format schema
npm run prisma:format
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Docker
```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down
```

### Git Workflow
**Commit Convention:** Conventional Commits
```
feat: add new feature
fix: bug fix
docs: documentation changes
style: code style changes
refactor: code refactoring
test: test additions/changes
chore: maintenance tasks
```

**Enforced by:**
- Husky pre-commit hooks
- Commitlint
- Lint-staged

---

## 📝 Additional Documentation

- **CRUD_API_SUMMARY.md** - Complete API implementation summary
- **VALIDATION_IMPROVEMENTS.md** - Validation enhancements documentation
- **docs/PRISMA_EXCEPTION_HANDLING.md** - Prisma error handling guide

---

## 🔑 Key Features Summary

✅ **Complete CRUD APIs** for all entities
✅ **Role-Based Access Control (RBAC)** with permissions
✅ **Cookie-based JWT Authentication** with refresh tokens
✅ **Soft delete support** for most entities
✅ **Pagination** on list endpoints
✅ **Swagger/OpenAPI documentation** with interactive UI
✅ **OneDrive integration** for file storage
✅ **Comprehensive validation** with class-validator
✅ **Standard response format** across all endpoints
✅ **Error handling** with custom filters
✅ **Database migrations** with Prisma
✅ **Docker support** for local development
✅ **Git hooks** for code quality
✅ **TypeScript** for type safety

---

## 📊 Module Dependency Graph

```
AppModule
├── ConfigModule (Global)
├── DatabaseModule (Global)
├── CommonModule (Global)
│   ├── Guards (JwtAuthGuard, PermissionsGuard)
│   ├── Interceptors (ResponseInterceptor)
│   └── Filters (HttpException, PrismaException)
├── AuthModule
│   └── depends on: DatabaseModule
├── UsersModule
│   └── depends on: DatabaseModule, AuthModule
├── RolesModule
│   └── depends on: DatabaseModule
├── PermissionsModule
│   └── depends on: DatabaseModule
├── CategoriesModule
│   └── depends on: DatabaseModule
├── ProductsModule
│   └── depends on: DatabaseModule, CategoriesModule, StorageModule
├── ServicesModule
│   └── depends on: DatabaseModule
├── PackagesModule
│   └── depends on: DatabaseModule, ServicesModule
├── BookingsModule
│   └── depends on: DatabaseModule, UsersModule, PackagesModule
├── BookingSessionsModule
│   └── depends on: DatabaseModule, BookingsModule
├── PaymentsModule
│   └── depends on: DatabaseModule, BookingsModule
├── AlbumsModule
│   └── depends on: DatabaseModule, BookingsModule
├── InventoryReservationsModule
│   └── depends on: DatabaseModule, ProductsModule, BookingSessionsModule
└── StorageModule (OneDrive)
    └── depends on: Azure/Microsoft Graph SDK
```

---

## 🎓 Learning Resources

### NestJS
- Official Docs: https://docs.nestjs.com
- GitHub: https://github.com/nestjs/nest

### Prisma
- Official Docs: https://www.prisma.io/docs
- Schema Reference: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference

### TypeScript
- Handbook: https://www.typescriptlang.org/docs/handbook/

---

**Last Updated:** 2026-01-12
**Version:** 1.0.0
**Maintainer:** Wedding Management System Team
