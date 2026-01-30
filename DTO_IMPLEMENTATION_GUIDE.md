# DTO Implementation Guide - Production Architecture Patterns

**Project:** be-nest-wedding  
**Status:** ✅ Production-Ready  
**Last Updated:** January 30, 2026

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [DTO Layer Structure](#dto-layer-structure)
3. [Naming Conventions](#naming-conventions)
4. [DTO Mapping Patterns](#dto-mapping-patterns)
5. [Service Layer Implementation](#service-layer-implementation)
6. [Repository Pattern Examples](#repository-pattern-examples)
7. [Controller Implementation](#controller-implementation)
8. [Type Safety & Transformation](#type-safety--transformation)
9. [Validation Best Practices](#validation-best-practices)
10. [API Documentation with Swagger](#api-documentation-with-swagger)
11. [Testing DTO Layers](#testing-dto-layers)
12. [Migration Guide](#migration-guide)

---

## Architecture Overview

### Clean Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         API Request                          │
│                    (JSON Payload)                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       Controller                             │
│         (HTTP Handling & Input Validation)                   │
│      DTO: CreateRoleDto / QueryRoleDto                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        Service                              │
│     (Business Logic & Orchestration)                         │
│   Maps DTO → Prisma Types                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Repository                              │
│      (Database Operations via Prisma)                        │
│   Handles all Prisma.Role.create/update/delete              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     PostgreSQL                              │
│         (Persistent Data Storage)                            │
│    Tables: roles, permissions, role_permissions             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│     Transform Prisma Model → Response DTO                    │
│         (ViewRoleDto / ViewRolePermissionDto)               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Response                              │
│              (ViewRoleDto JSON)                              │
│      Properties: id, name, description, created_at, etc.    │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

| Principle | Benefit |
|-----------|---------|
| **DTOs = API Contract** | Decoupled from database schema, independent versioning |
| **No Prisma in DTOs** | Maintains separation of concerns, testable in isolation |
| **Mapping in Service** | Single responsibility, easier to test and maintain |
| **snake_case Properties** | Matches database columns, consistent API |
| **Explicit Relations** | Only pass IDs (e.g., `permission_ids`), not nested objects |
| **Type Transformers** | Dates, booleans properly converted with `@Type()` |

---

## DTO Layer Structure

### DTO Types by Purpose

```
src/roles/dto/
├── create-role.dto.ts          # POST /roles (Input)
├── update-role.dto.ts          # PATCH /roles/:id (Input)
├── query-role.dto.ts           # GET /roles?filter=... (Query)
├── view-role.dto.ts            # GET /roles/:id (Output)
├── assign-permissions.dto.ts   # POST /roles/:id/permissions (Input)
└── index.ts                     # Barrel export

src/roles/entities/
└── role.entity.ts              # Prisma model representation
```

### Standard DTO Template

```typescript
// create-[entity].dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsArray,
  IsUUID,
  ArrayMinSize,
  ValidateNested,
  Type,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Input DTO for creating a new Role
 * 
 * This DTO represents the API contract for POST /roles
 * It is completely independent from the Prisma schema
 */
export class CreateRoleDto {
  @ApiProperty({
    description: 'Unique role name',
    example: 'admin',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Administrator with full access',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Permission IDs to assign',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  @IsOptional()
  permission_ids?: string[];
}
```

---

## Naming Conventions

### Property Naming Pattern

| Layer | Format | Example | Rationale |
|-------|--------|---------|-----------|
| **Database (Prisma)** | snake_case | `phone_number`, `created_at` | SQL standard |
| **Prisma Model** | camelCase with @map | `phoneNumber` @map("phone_number") | TypeScript convention |
| **DTO Properties** | snake_case | `phone_number`, `created_at` | Matches database, API clarity |
| **Prisma Operations** | camelCase | `firstName`, `lastName` | TypeScript convention |

### File Naming Convention

```
✅ CORRECT
create-role.dto.ts         (kebab-case)
update-role.dto.ts
view-role.dto.ts
query-role.dto.ts
assign-permissions.dto.ts

❌ INCORRECT
CreateRoleDto.ts           (PascalCase)
createRoleDto.ts           (camelCase)
create_role_dto.ts         (snake_case)
```

### Class Naming Convention

```typescript
✅ CORRECT
export class CreateRoleDto { }         (PascalCase)
export class UpdateRoleDto { }
export class ViewRoleDto { }
export class QueryRoleDto { }

❌ INCORRECT
export class create_role_dto { }       (snake_case)
export class createRoleDto { }         (camelCase)
export interface ICreateRoleDto { }    (Hungarian notation)
```

---

## DTO Mapping Patterns

### Pattern 1: Create DTO → Prisma Create

**Input DTO (API Contract)**
```typescript
// src/roles/dto/create-role.dto.ts
export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  @IsOptional()
  permission_ids?: string[];
}
```

**Service Mapping**
```typescript
// src/roles/roles.service.ts
import { Prisma } from 'generated/prisma';

@Injectable()
export class RolesService {
  constructor(private readonly db: DatabaseService) {}

  async create(createRoleDto: CreateRoleDto): Promise<ViewRoleDto> {
    // Destructure and map DTO to Prisma input
    const { permission_ids, ...roleData } = createRoleDto;

    // Validate permissions exist
    if (permission_ids && permission_ids.length > 0) {
      const permissions = await this.db.permission.findMany({
        where: { id: { in: permission_ids } },
      });

      if (permissions.length !== permission_ids.length) {
        throw new BadRequestException('Invalid permission IDs');
      }
    }

    // Map to Prisma create input
    const prismaInput: Prisma.RoleCreateInput = {
      name: roleData.name,
      description: roleData.description || null,
      permissions: permission_ids
        ? {
            create: permission_ids.map((id) => ({
              permissionId: id, // Map to Prisma field name
            })),
          }
        : undefined,
    };

    // Execute database operation
    const createdRole = await this.db.role.create({
      data: prismaInput,
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    // Map Prisma model to response DTO
    return this.mapToViewDto(createdRole);
  }

  // Mapping helper
  private mapToViewDto(prismaRole: any): ViewRoleDto {
    return {
      id: prismaRole.id,
      name: prismaRole.name,
      description: prismaRole.description,
      created_at: prismaRole.created_at,
      updated_at: prismaRole.updated_at,
      deleted_at: prismaRole.deleted_at,
      permissions: prismaRole.permissions?.map((rp) => ({
        role_id: rp.roleId,
        permission_id: rp.permissionId,
        permission: rp.permission,
      })),
    };
  }
}
```

### Pattern 2: Update DTO → Prisma Update

**Update DTO (Extends Create using PartialType)**
```typescript
// src/roles/dto/update-role.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

/**
 * Update DTO - uses PATCH semantics
 * All fields are optional
 * Generated automatically from CreateRoleDto
 */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
```

**Service Implementation**
```typescript
async update(
  id: string,
  updateRoleDto: UpdateRoleDto,
): Promise<ViewRoleDto> {
  // Verify role exists
  const existingRole = await this.db.role.findUnique({ where: { id } });
  if (!existingRole) {
    throw new NotFoundException(`Role with ID "${id}" not found`);
  }

  // Destructure
  const { permission_ids, ...updateData } = updateRoleDto;

  // Validate permissions if provided
  if (permission_ids && permission_ids.length > 0) {
    const permissions = await this.db.permission.findMany({
      where: { id: { in: permission_ids } },
    });

    if (permissions.length !== permission_ids.length) {
      throw new BadRequestException('Invalid permission IDs');
    }
  }

  // Build update payload - only update provided fields
  const prismaUpdateInput: Prisma.RoleUpdateInput = {
    ...(updateData.name && { name: updateData.name }),
    ...(updateData.description !== undefined && {
      description: updateData.description,
    }),
    ...(permission_ids && {
      permissions: {
        deleteMany: {}, // Clear existing
        create: permission_ids.map((id) => ({
          permissionId: id,
        })),
      },
    }),
  };

  // Execute update
  const updatedRole = await this.db.role.update({
    where: { id },
    data: prismaUpdateInput,
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  return this.mapToViewDto(updatedRole);
}
```

### Pattern 3: Query DTO → Prisma Query

**Query DTO (Filtering, Pagination, Sorting)**
```typescript
// src/roles/dto/query-role.dto.ts
export class QueryRoleDto {
  @ApiPropertyOptional({
    description: 'Search by name or description',
    example: 'admin',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: ['name', 'created_at', 'updated_at'],
    description: 'Sort field',
    example: 'created_at',
  })
  @IsEnum(['name', 'created_at', 'updated_at'])
  @IsOptional()
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    description: 'Sort order',
    example: 'desc',
  })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sort_order?: 'asc' | 'desc' = 'desc';
}
```

**Service Query Implementation**
```typescript
async findAll(query: QueryRoleDto): Promise<PaginatedResponse<ViewRoleDto>> {
  const { page = 1, limit = 10, search, sort_by = 'created_at', sort_order = 'desc' } = query;

  // Build where clause for search
  const where: Prisma.RoleWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  // Map sort_by to Prisma field
  const orderBy: Prisma.RoleOrderByWithRelationInput = {
    [sort_by]: sort_order,
  };

  // Get total count
  const total = await this.db.role.count({ where });

  // Get paginated results
  const roles = await this.db.role.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  return {
    data: roles.map((role) => this.mapToViewDto(role)),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}
```

### Pattern 4: Response DTO (View/Read)

**View DTO - Complete Read Response**
```typescript
// src/roles/dto/view-role.dto.ts
export class ViewRolePermissionDto {
  @ApiProperty({
    description: 'Role ID',
    example: 'uuid-role',
  })
  @IsUUID('4')
  role_id: string;

  @ApiProperty({
    description: 'Permission ID',
    example: 'uuid-permission',
  })
  @IsUUID('4')
  permission_id: string;

  @ApiProperty({
    description: 'Permission details',
    type: 'object',
  })
  permission: Record<string, any>;
}

/**
 * Response DTO for reading roles
 * Used in GET endpoints and API responses
 */
export class ViewRoleDto {
  @ApiProperty({
    description: 'Role ID',
    example: 'uuid-role-123',
  })
  @IsUUID('4')
  id: string;

  @ApiProperty({
    description: 'Role name',
    example: 'admin',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Administrator role',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  description: string | null;

  @ApiProperty({
    description: 'Role created date',
    example: '2023-01-01T00:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  created_at: Date;

  @ApiProperty({
    description: 'Role last updated',
    example: '2023-01-01T00:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  updated_at: Date;

  @ApiPropertyOptional({
    description: 'Soft delete date',
    example: null,
    nullable: true,
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  deleted_at: Date | null;

  @ApiPropertyOptional({
    description: 'Associated permissions',
    type: [ViewRolePermissionDto],
  })
  @IsArray()
  @IsOptional()
  permissions?: ViewRolePermissionDto[];
}
```

---

## Service Layer Implementation

### Complete Service Example with All CRUD Operations

```typescript
// src/roles/roles.service.ts
import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { ViewRoleDto } from './dto/view-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a new role
   * 
   * @param createRoleDto Input DTO from API
   * @returns Newly created role as ViewRoleDto
   */
  async create(createRoleDto: CreateRoleDto): Promise<ViewRoleDto> {
    const { permission_ids, ...roleData } = createRoleDto;

    // Business logic: Check duplicate
    const existingRole = await this.db.role.findUnique({
      where: { name: roleData.name },
    });

    if (existingRole) {
      throw new ConflictException(
        `Role "${roleData.name}" already exists`,
      );
    }

    // Business logic: Validate referenced IDs
    if (permission_ids && permission_ids.length > 0) {
      const permissions = await this.db.permission.findMany({
        where: { id: { in: permission_ids } },
      });

      if (permissions.length !== permission_ids.length) {
        throw new BadRequestException(
          'One or more permission IDs are invalid',
        );
      }
    }

    // Map DTO to Prisma type
    const prismaInput: Prisma.RoleCreateInput = {
      name: roleData.name,
      description: roleData.description || null,
      ...(permission_ids && {
        permissions: {
          create: permission_ids.map((id) => ({
            permissionId: id,
          })),
        },
      }),
    };

    // Execute database operation
    const role = await this.db.role.create({
      data: prismaInput,
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    // Map Prisma response to DTO
    return this.mapToViewDto(role);
  }

  /**
   * Get all roles with pagination
   */
  async findAll(query: QueryRoleDto): Promise<{
    data: ViewRoleDto[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = query;

    // Build search filter
    const where: Prisma.RoleWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    // Build sort order
    const orderBy: Prisma.RoleOrderByWithRelationInput = {
      [sort_by]: sort_order,
    };

    // Get total count
    const total = await this.db.role.count({ where });

    // Get paginated data
    const roles = await this.db.role.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    return {
      data: roles.map((role) => this.mapToViewDto(role)),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single role by ID
   */
  async findOne(id: string): Promise<ViewRoleDto> {
    const role = await this.db.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role "${id}" not found`);
    }

    return this.mapToViewDto(role);
  }

  /**
   * Update a role
   */
  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<ViewRoleDto> {
    // Verify exists
    const role = await this.db.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role "${id}" not found`);
    }

    const { permission_ids, ...updateData } = updateRoleDto;

    // Validate permissions if provided
    if (permission_ids && permission_ids.length > 0) {
      const permissions = await this.db.permission.findMany({
        where: { id: { in: permission_ids } },
      });

      if (permissions.length !== permission_ids.length) {
        throw new BadRequestException(
          'One or more permission IDs are invalid',
        );
      }
    }

    // Build update input - only include changed fields
    const prismaUpdate: Prisma.RoleUpdateInput = {
      ...(updateData.name && { name: updateData.name }),
      ...(updateData.description !== undefined && {
        description: updateData.description,
      }),
      ...(permission_ids && {
        permissions: {
          deleteMany: {}, // Clear existing
          create: permission_ids.map((id) => ({
            permissionId: id,
          })),
        },
      }),
    };

    const updatedRole = await this.db.role.update({
      where: { id },
      data: prismaUpdate,
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    return this.mapToViewDto(updatedRole);
  }

  /**
   * Delete a role (soft delete)
   */
  async delete(id: string): Promise<{ message: string }> {
    const role = await this.db.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role "${id}" not found`);
    }

    await this.db.role.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { message: `Role "${id}" deleted successfully` };
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissions(
    id: string,
    assignPermissionsDto: any,
  ): Promise<ViewRoleDto> {
    const { permission_ids } = assignPermissionsDto;

    if (!permission_ids || permission_ids.length === 0) {
      throw new BadRequestException(
        'At least one permission ID is required',
      );
    }

    // Validate all permissions exist
    const permissions = await this.db.permission.findMany({
      where: { id: { in: permission_ids } },
    });

    if (permissions.length !== permission_ids.length) {
      throw new BadRequestException(
        'One or more permission IDs are invalid',
      );
    }

    // Update permissions
    const updated = await this.db.role.update({
      where: { id },
      data: {
        permissions: {
          deleteMany: {}, // Clear existing
          create: permission_ids.map((id: string) => ({
            permissionId: id,
          })),
        },
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    return this.mapToViewDto(updated);
  }

  /**
   * Mapper: Convert Prisma model to DTO
   * 
   * This is where database data is transformed to API response
   */
  private mapToViewDto(prismaRole: any): ViewRoleDto {
    return {
      id: prismaRole.id,
      name: prismaRole.name,
      description: prismaRole.description,
      created_at: new Date(prismaRole.createdAt), // Prisma uses camelCase
      updated_at: new Date(prismaRole.updatedAt),
      deleted_at: prismaRole.deletedAt
        ? new Date(prismaRole.deletedAt)
        : null,
      permissions: prismaRole.permissions?.map((rp: any) => ({
        role_id: rp.roleId,
        permission_id: rp.permissionId,
        permission: rp.permission,
      })),
    };
  }
}
```

---

## Repository Pattern Examples

### Option A: Service Layer Pattern (Current - Recommended)

The service layer directly uses the injected `DatabaseService` (Prisma client) to perform database operations. This is cleaner for small/medium projects.

```typescript
// src/roles/roles.service.ts
@Injectable()
export class RolesService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateRoleDto) {
    // Direct Prisma operations here
    return this.db.role.create({ data: {...} });
  }
}
```

### Option B: Repository Layer Pattern (For Scalability)

For larger projects, use a dedicated repository to abstract Prisma operations:

```typescript
// src/roles/roles.repository.ts
@Injectable()
export class RolesRepository {
  constructor(private readonly db: DatabaseService) {}

  create(input: Prisma.RoleCreateInput) {
    return this.db.role.create({
      data: input,
      include: { permissions: { include: { permission: true } } },
    });
  }

  findMany(where?: Prisma.RoleWhereInput, orderBy?: any, skip?: number, take?: number) {
    return this.db.role.findMany({
      where,
      orderBy,
      skip,
      take,
      include: { permissions: { include: { permission: true } } },
    });
  }

  findUnique(where: Prisma.RoleWhereUniqueInput) {
    return this.db.role.findUnique({
      where,
      include: { permissions: { include: { permission: true } } },
    });
  }

  update(where: Prisma.RoleWhereUniqueInput, data: Prisma.RoleUpdateInput) {
    return this.db.role.update({
      where,
      data,
      include: { permissions: { include: { permission: true } } },
    });
  }

  delete(where: Prisma.RoleWhereUniqueInput) {
    return this.db.role.update({
      where,
      data: { deleted_at: new Date() },
    });
  }
}

// Then in service:
@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async create(createRoleDto: CreateRoleDto): Promise<ViewRoleDto> {
    const { permission_ids, ...roleData } = createRoleDto;
    
    // Validation logic...
    
    const prismaInput: Prisma.RoleCreateInput = { ... };
    const role = await this.rolesRepository.create(prismaInput);
    return this.mapToViewDto(role);
  }
}
```

---

## Controller Implementation

### Complete Controller with DTO Usage

```typescript
// src/roles/roles.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { ViewRoleDto } from './dto/view-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Create a new role
   * 
   * @param createRoleDto - Input data: name, description, permission_ids
   * @returns Created role with id, created_at, etc.
   */
  @Post()
  @RequirePermissions('roles:create')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiCreatedResponse({
    description: 'Role created successfully',
    type: ViewRoleDto,
  })
  @ApiConflictResponse({ description: 'Role name already exists' })
  async create(@Body() createRoleDto: CreateRoleDto): Promise<{
    data: ViewRoleDto;
    message: string;
  }> {
    const role = await this.rolesService.create(createRoleDto);
    return {
      data: role,
      message: 'Role created successfully',
    };
  }

  /**
   * Get all roles with pagination
   * 
   * @param query - QueryRoleDto: page, limit, search, sort_by, sort_order
   * @returns Paginated list of roles
   */
  @Get()
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'Get all roles' })
  @ApiOkResponse({
    description: 'Paginated roles',
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/ViewRoleDto' } },
        pagination: {
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            pages: { type: 'number' },
          },
        },
      },
    },
  })
  async findAll(@Query() query: QueryRoleDto) {
    return await this.rolesService.findAll(query);
  }

  /**
   * Get single role by ID
   * 
   * @param id - Role UUID
   * @returns Single role with permissions
   */
  @Get(':id')
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiOkResponse({
    description: 'Role found',
    type: ViewRoleDto,
  })
  @ApiNotFoundResponse({ description: 'Role not found' })
  async findOne(@Param('id') id: string): Promise<{
    data: ViewRoleDto;
  }> {
    const role = await this.rolesService.findOne(id);
    return { data: role };
  }

  /**
   * Update a role
   * 
   * @param id - Role UUID
   * @param updateRoleDto - Update data (all fields optional)
   * @returns Updated role
   */
  @Patch(':id')
  @RequirePermissions('roles:update')
  @ApiOperation({ summary: 'Update a role' })
  @ApiOkResponse({
    description: 'Role updated successfully',
    type: ViewRoleDto,
  })
  @ApiNotFoundResponse({ description: 'Role not found' })
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<{
    data: ViewRoleDto;
    message: string;
  }> {
    const role = await this.rolesService.update(id, updateRoleDto);
    return {
      data: role,
      message: 'Role updated successfully',
    };
  }

  /**
   * Delete a role
   * 
   * @param id - Role UUID
   */
  @Delete(':id')
  @RequirePermissions('roles:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.rolesService.delete(id);
  }

  /**
   * Assign permissions to a role
   * 
   * @param id - Role UUID
   * @param assignPermissionsDto - permission_ids array
   * @returns Updated role with new permissions
   */
  @Post(':id/permissions')
  @RequirePermissions('roles:manage-permissions')
  @ApiOperation({ summary: 'Assign permissions to role' })
  @ApiOkResponse({
    description: 'Permissions assigned',
    type: ViewRoleDto,
  })
  @ApiNotFoundResponse({ description: 'Role not found' })
  async assignPermissions(
    @Param('id') id: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ): Promise<{
    data: ViewRoleDto;
    message: string;
  }> {
    const role = await this.rolesService.assignPermissions(
      id,
      assignPermissionsDto,
    );
    return {
      data: role,
      message: 'Permissions assigned successfully',
    };
  }
}
```

---

## Type Safety & Transformation

### Date Transformation Pattern

**Problem:** Prisma returns dates as `Date` objects, but JSON serialization needs special handling.

**Solution:** Use `@Type(() => Date)` decorator

```typescript
// ✅ CORRECT
export class ViewRoleDto {
  @ApiProperty({
    description: 'Creation date',
    example: '2023-01-01T00:00:00Z',
  })
  @IsDate()
  @Type(() => Date)  // ← Ensures proper deserialization
  created_at: Date;
}

// ❌ WRONG - Date may serialize incorrectly
export class ViewRoleDto {
  @ApiProperty()
  @IsDate()
  created_at: Date;  // Missing @Type()
}
```

### Nested Object Transformation

**Example: ViewAlbumDto with nested files**

```typescript
export class ViewFileDto {
  @ApiProperty()
  @IsUUID('4')
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @Type(() => Date)
  created_at: Date;
}

export class ViewAlbumFileDto {
  @ApiProperty()
  @Type(() => ViewFileDto)
  file: ViewFileDto;

  @ApiProperty()
  @IsInt()
  sort_order: number;
}

export class ViewAlbumDto {
  @ApiProperty()
  @Type(() => ViewAlbumFileDto)
  files: ViewAlbumFileDto[];
}
```

### Enum Transformation

**Prisma enums** are automatically transformed to strings. Use `@Enum()` for validation:

```typescript
export enum BookingStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export class QueryBookingDto {
  @ApiPropertyOptional({
    enum: BookingStatusEnum,
    description: 'Filter by booking status',
  })
  @IsEnum(BookingStatusEnum)
  @IsOptional()
  status?: BookingStatusEnum;
}

export class ViewBookingDto {
  @ApiProperty({
    enum: BookingStatusEnum,
    description: 'Current booking status',
  })
  @IsEnum(BookingStatusEnum)
  status: BookingStatusEnum;
}
```

---

## Validation Best Practices

### 1. Required vs Optional Fields

```typescript
✅ CORRECT - Explicit about requirement
export class CreateRoleDto {
  @ApiProperty()        // ← Indicates required
  @IsNotEmpty()         // ← Validates not empty
  @IsString()
  name: string;         // ← No ? means required in TypeScript

  @ApiPropertyOptional()  // ← Indicates optional
  @IsOptional()           // ← Makes it optional
  @IsString()
  description?: string;   // ← ? means optional in TypeScript
}

❌ WRONG - Ambiguous requirement
export class CreateRoleDto {
  @ApiProperty()  // ← Looks required but is it?
  @IsString()
  name?: string;  // ← TypeScript says optional, decorator says required

  description: string;  // ← No decorator, unclear if required
}
```

### 2. Array Validation

```typescript
✅ CORRECT - Comprehensive array validation
export class CreatePackageDto {
  @ApiProperty({
    description: 'Service IDs to include',
    type: [String],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)      // ← Requires at least 1 item
  @IsUUID('4', { each: true })  // ← Validates each item
  @IsNotEmpty()
  service_ids: string[];
}

❌ WRONG - Weak array validation
export class CreatePackageDto {
  @ApiProperty()
  @IsArray()           // ← Only checks it's an array
  service_ids?: string[];  // ← Could be empty or invalid UUIDs
}
```

### 3. Numeric Constraints

```typescript
✅ CORRECT - Complete numeric validation
export class CreateProductDto {
  @ApiProperty({
    description: 'Stock quantity',
    example: 100,
    minimum: 0,
  })
  @IsInt()
  @Min(0)              // ← No negative stock
  @Max(999999)         // ← Reasonable upper limit
  @IsNotEmpty()
  stock_qty: number;

  @ApiPropertyOptional({
    description: 'Price in cents',
    example: 10000,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  price?: number;
}

❌ WRONG - Missing constraints
export class CreateProductDto {
  stock_qty: number;    // ← Could be negative, NaN, etc.
  price?: number;       // ← Could be negative
}
```

### 4. String Constraints

```typescript
✅ CORRECT - String validation
export class CreateRoleDto {
  @ApiProperty({
    description: 'Unique role name',
    example: 'admin',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  @Matches(/^[a-z0-9_-]+$/, {  // ← Only lowercase, numbers, dash, underscore
    message: 'Role name must contain only lowercase letters, numbers, hyphens, and underscores',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Email address',
    format: 'email',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    pattern: '^[0-9]{10,11}$',
  })
  @Matches(/^[0-9]{10,11}$/)
  @IsOptional()
  phone?: string;
}

❌ WRONG - No string constraints
export class CreateRoleDto {
  name: string;        // ← Could be anything
  email?: string;      // ← No email validation
}
```

### 5. Custom Validators

```typescript
// src/common/validators/is-valid-permission.validator.ts
import { registerDecorator, ValidationOptions, ValidatorConstraint } from 'class-validator';

@ValidatorConstraint()
export class IsValidPermissionConstraint {
  constructor(private permissionService: PermissionService) {}

  async validate(permissionIds: string[]): Promise<boolean> {
    const permissions = await this.permissionService.findByIds(permissionIds);
    return permissions.length === permissionIds.length;
  }
}

export function IsValidPermission(validationOptions?: ValidationOptions) {
  return function (target: any, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidPermissionConstraint,
    });
  };
}

// Usage:
export class CreateRoleDto {
  @ApiProperty()
  @IsArray()
  @ArrayMinSize(1)
  @IsValidPermission({  // ← Custom validator
    message: 'One or more permission IDs are invalid',
  })
  permission_ids: string[];
}
```

---

## API Documentation with Swagger

### Complete Swagger Documentation Pattern

```typescript
import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';

/**
 * Complete example showing all Swagger decorator options
 */
export class CreateRoleDto {
  // ✅ Required string property
  @ApiProperty({
    description: 'The unique name of the role',
    example: 'admin',
    type: String,
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  // ✅ Optional string property
  @ApiPropertyOptional({
    description: 'Detailed description of what this role does',
    example: 'Administrator role with full system access',
    type: String,
    nullable: true,
    default: null,
  })
  @IsString()
  @IsOptional()
  description?: string | null;

  // ✅ Array of IDs
  @ApiPropertyOptional({
    description: 'Permission IDs to assign to this role',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    type: [String],
    items: { type: String, format: 'uuid' },
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  @IsOptional()
  permission_ids?: string[];
}

// Swagger response example
@ApiOkResponse({
  description: 'Paginated list of roles',
  schema: {
    allOf: [
      {
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(ViewRoleDto) },
          },
          pagination: {
            type: 'object',
            properties: {
              total: { type: 'number' },
              page: { type: 'number' },
              limit: { type: 'number' },
              pages: { type: 'number' },
            },
          },
        },
      },
    ],
  },
})
async findAll(@Query() query: QueryRoleDto) {}
```

### Controller Decorator Summary

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@ApiTags()` | Group endpoints | `@ApiTags('Roles')` |
| `@ApiOperation()` | Describe endpoint | `@ApiOperation({ summary: 'Create role' })` |
| `@ApiCreatedResponse()` | Document 201 response | `@ApiCreatedResponse({ type: ViewRoleDto })` |
| `@ApiOkResponse()` | Document 200 response | `@ApiOkResponse({ type: ViewRoleDto })` |
| `@ApiNotFoundResponse()` | Document 404 response | `@ApiNotFoundResponse({ description: 'Not found' })` |
| `@ApiBearerAuth()` | Indicate JWT auth | `@ApiBearerAuth('JWT-auth')` |
| `@ApiProperty()` | Document required field | `@ApiProperty({ example: 'value' })` |
| `@ApiPropertyOptional()` | Document optional field | `@ApiPropertyOptional()` |

---

## Testing DTO Layers

### Unit Test Example

```typescript
// src/roles/dto/create-role.dto.spec.ts
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateRoleDto } from './create-role.dto';

describe('CreateRoleDto', () => {
  it('should validate correct data', async () => {
    const dto = plainToClass(CreateRoleDto, {
      name: 'admin',
      description: 'Admin role',
      permission_ids: ['uuid-1', 'uuid-2'],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when name is empty', async () => {
    const dto = plainToClass(CreateRoleDto, {
      name: '',
      description: 'Admin role',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail when name exceeds max length', async () => {
    const dto = plainToClass(CreateRoleDto, {
      name: 'a'.repeat(256),
      description: 'Admin role',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when permission_ids are invalid UUIDs', async () => {
    const dto = plainToClass(CreateRoleDto, {
      name: 'admin',
      permission_ids: ['not-a-uuid', 'also-not-uuid'],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass with only required fields', async () => {
    const dto = plainToClass(CreateRoleDto, {
      name: 'viewer',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
```

### Service Test with DTO

```typescript
// src/roles/roles.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { DatabaseService } from 'src/database/database.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { ConflictException } from '@nestjs/common';

describe('RolesService', () => {
  let service: RolesService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: DatabaseService,
          useValue: {
            role: {
              create: jest.fn(),
              findUnique: jest.fn(),
            },
            permission: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    dbService = module.get<DatabaseService>(DatabaseService);
  });

  describe('create', () => {
    it('should create a role with valid DTO', async () => {
      const createDto: CreateRoleDto = {
        name: 'admin',
        description: 'Admin role',
        permission_ids: ['uuid-1'],
      };

      const mockRole = {
        id: 'uuid-role-1',
        name: 'admin',
        description: 'Admin role',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        permissions: [],
      };

      jest.spyOn(dbService.role, 'findUnique').mockResolvedValue(null);
      jest.spyOn(dbService.role, 'create').mockResolvedValue(mockRole);

      const result = await service.create(createDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', 'admin');
    });

    it('should throw ConflictException if role name exists', async () => {
      const createDto: CreateRoleDto = { name: 'admin' };

      jest.spyOn(dbService.role, 'findUnique').mockResolvedValue({
        id: 'existing-id',
        name: 'admin',
      });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
```

---

## Migration Guide

### Checklist for Existing Projects

If you're migrating from Prisma-coupled DTOs to this clean architecture:

#### Phase 1: Analysis (Week 1)
- [ ] Audit all existing DTOs
- [ ] Identify which DTOs implement Prisma types
- [ ] Document current naming conventions
- [ ] List all DTO properties using camelCase

#### Phase 2: Create New DTOs (Week 2-3)
- [ ] Create new DTO files without Prisma implementations
- [ ] Convert all camelCase properties to snake_case
- [ ] Add comprehensive validation decorators
- [ ] Add Swagger documentation

#### Phase 3: Update Services (Week 3-4)
- [ ] Implement mapping functions (DTO → Prisma)
- [ ] Update all CRUD methods
- [ ] Add business logic validation
- [ ] Test mapping correctness

#### Phase 4: Update Controllers (Week 4-5)
- [ ] Update controller method signatures
- [ ] Add proper HTTP status codes
- [ ] Update response wrappers
- [ ] Test endpoints

#### Phase 5: Testing & Validation (Week 5-6)
- [ ] Write DTO validation tests
- [ ] Write service integration tests
- [ ] E2E API tests
- [ ] Load testing if applicable

#### Phase 6: Deployment & Documentation (Week 6)
- [ ] Update API documentation
- [ ] Update client libraries
- [ ] Communicate breaking changes
- [ ] Monitor production

### Breaking Changes Management

**For clients consuming your API:**

```typescript
// ❌ OLD API (Prisma-coupled)
POST /api/roles
{
  "name": "admin",
  "permissionIds": ["uuid-1"]  // camelCase
}

Response:
{
  "id": "uuid",
  "name": "admin",
  "createdAt": "2023-01-01"    // camelCase
}

// ✅ NEW API (Clean Architecture)
POST /api/roles
{
  "name": "admin",
  "permission_ids": ["uuid-1"]  // snake_case
}

Response:
{
  "id": "uuid",
  "name": "admin",
  "created_at": "2023-01-01"    // snake_case
}
```

**Migration strategy:**
1. Run old and new endpoints in parallel (v1 and v2)
2. Release v2 with v1 still supported
3. Give clients 3-6 months to migrate
4. Deprecate v1, remove after timeline expires

---

## Summary: Why This Architecture is Better

### ✅ Benefits of Clean DTO Architecture

| Aspect | Prisma-Coupled DTOs | Clean DTOs |
|--------|---------------------|-----------|
| **Database Dependency** | Tightly coupled | Independent |
| **Schema Changes** | Break DTOs | DTOs unchanged |
| **Testing** | Harder (Prisma dependencies) | Easier (mocks, isolated) |
| **Frontend Contract** | Mixed with DB concerns | Clear API contract |
| **Versioning** | Complex | Separate versions possible |
| **Type Safety** | Implicit from Prisma | Explicit validation |
| **Documentation** | Unclear | Swagger-generated |
| **Maintainability** | Hard to trace flow | Clear separation of concerns |
| **Scalability** | Limited | Grows with project |

### 🎯 Production-Grade Characteristics

- ✅ **Decoupled**: DTOs independent from Prisma
- ✅ **Type-Safe**: Comprehensive validation
- ✅ **Well-Documented**: Swagger/OpenAPI compliant
- ✅ **Testable**: Easy unit and integration testing
- ✅ **Maintainable**: Clear separation of concerns
- ✅ **Scalable**: Repository pattern ready
- ✅ **Professional**: Follows NestJS best practices

---

## References

- [NestJS DTO Documentation](https://docs.nestjs.com/techniques/validation)
- [class-validator Documentation](https://github.com/typestack/class-validator)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/database/data-migrations)
- [Swagger/OpenAPI Specification](https://swagger.io/specification/)
- [Clean Architecture Principles](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

## Contact & Support

For questions about DTO implementation or architecture patterns, refer to:
- Architecture Review: `ARCHITECTURE_REVIEW.md`
- Complete Module Example: `COMPLETE_MODULE_EXAMPLE.md`
- Prisma Best Practices: `PRISMA_BEST_PRACTICES.md`
