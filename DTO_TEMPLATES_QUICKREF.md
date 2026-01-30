# DTO Code Templates & Quick Reference

**For rapid DTO creation following production standards**

---

## Quick Reference Checklist

Use this when creating new DTOs:

```
BEFORE CREATING A DTO:
☐ Does it represent an API input/output?
☐ Is it independent from Prisma?
☐ Does it use snake_case properties?
☐ Are all fields documented with @ApiProperty?
☐ Are validation decorators comprehensive?
☐ Is there a corresponding mapping function?
☐ Are tests written?

YES TO ALL? → Ready for production
```

---

## Template 1: Basic Create DTO

Copy and customize this template for any Create operation:

```typescript
// src/[module]/dto/create-[entity].dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Input DTO for creating a new [Entity]
 * 
 * API Endpoint: POST /[entities]
 * Request Body: CreateXDto
 * Response: ViewXDto
 */
export class Create[Entity]Dto {
  @ApiProperty({
    description: 'Clear, specific description',
    example: 'example-value',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  field_name: string;

  @ApiPropertyOptional({
    description: 'Optional field description',
    example: 'optional-value',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  optional_field?: string | null;
}

// Export from index.ts
// export { Create[Entity]Dto } from './create-[entity].dto';
```

---

## Template 2: Update DTO (Auto-Generated from Create)

```typescript
// src/[module]/dto/update-[entity].dto.ts
import { PartialType } from '@nestjs/swagger';
import { Create[Entity]Dto } from './create-[entity].dto';

/**
 * Update DTO - All fields optional (PATCH semantics)
 * 
 * Automatically extends CreateDto with all fields optional
 * No need to redefine decorators
 */
export class Update[Entity]Dto extends PartialType(Create[Entity]Dto) {}
```

---

## Template 3: Query/Filter DTO

```typescript
// src/[module]/dto/query-[entity].dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
} from 'class-validator';

/**
 * Query DTO for filtering and pagination
 * 
 * API Endpoint: GET /[entities]?page=1&limit=10&search=...
 * All fields are optional (filtering)
 */
export class Query[Entity]Dto {
  @ApiPropertyOptional({
    description: 'Search by name or description',
    example: 'search-term',
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
    enum: ['created_at', 'updated_at', 'name'],
    description: 'Sort field',
    example: 'created_at',
  })
  @IsEnum(['created_at', 'updated_at', 'name'])
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

---

## Template 4: View/Response DTO

```typescript
// src/[module]/dto/view-[entity].dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Response DTO for reading [Entity]
 * 
 * Used in: GET /[entities]/:id
 * Contains all fields from database that should be exposed
 */
export class View[Entity]Dto {
  @ApiProperty({
    description: 'Unique identifier',
    example: 'uuid-123',
  })
  @IsUUID('4')
  id: string;

  @ApiProperty({
    description: 'Entity name',
    example: 'example',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Optional field',
    example: 'value',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  optional_field: string | null;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-01-01T00:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  created_at: Date;

  @ApiProperty({
    description: 'Last update date',
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
}
```

---

## Template 5: Nested Object DTO

```typescript
// src/[module]/dto/[nested-object].dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, ValidateNested, Type } from 'class-validator';

/**
 * Nested DTO - used inside another DTO
 */
export class Nested[Entity]Dto {
  @ApiProperty({ example: 'uuid-123' })
  @IsUUID('4')
  id: string;

  @ApiProperty({ example: 'value' })
  @IsString()
  name: string;
}

/**
 * Parent DTO with nested object
 */
export class Parent[Entity]Dto {
  @ApiProperty({
    description: 'Nested object',
    type: Nested[Entity]Dto,
  })
  @ValidateNested()  // ← Validate nested object
  @Type(() => Nested[Entity]Dto)  // ← Transform to nested class
  nested_object: Nested[Entity]Dto;
}
```

---

## Template 6: Array of IDs DTO

```typescript
// src/[module]/dto/assign-[relation].dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMinSize,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';

/**
 * DTO for assigning multiple related entities
 * 
 * API Endpoint: POST /[entities]/:id/[relations]
 * Request Body: { "[relation]_ids": ["uuid-1", "uuid-2"] }
 */
export class Assign[Relation]Dto {
  @ApiProperty({
    description: '[Relation] IDs to assign',
    type: [String],
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)  // ← Requires at least 1
  @IsUUID('4', { each: true })  // ← Validates each item
  @IsNotEmpty()
  [relation]_ids: string[];
}
```

---

## Template 7: Service with Mapping

```typescript
// src/[module]/[module].service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';
import { Create[Entity]Dto } from './dto/create-[entity].dto';
import { Update[Entity]Dto } from './dto/update-[entity].dto';
import { Query[Entity]Dto } from './dto/query-[entity].dto';
import { View[Entity]Dto } from './dto/view-[entity].dto';

@Injectable()
export class [Entity]sService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create [Entity]
   */
  async create(createDto: Create[Entity]Dto): Promise<View[Entity]Dto> {
    // Map DTO to Prisma input
    const prismaInput: Prisma.[Entity]CreateInput = {
      name: createDto.field_name,
      optional_field: createDto.optional_field || null,
    };

    // Execute database operation
    const created = await this.db.[entity].create({
      data: prismaInput,
    });

    // Map to response DTO
    return this.mapToViewDto(created);
  }

  /**
   * Get all [Entities]
   */
  async findAll(query: Query[Entity]Dto): Promise<{
    data: View[Entity]Dto[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = query;

    const where: Prisma.[Entity]WhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const total = await this.db.[entity].count({ where });
    const [entities] = await this.db.[entity].findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: entities.map((e) => this.mapToViewDto(e)),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single [Entity]
   */
  async findOne(id: string): Promise<View[Entity]Dto> {
    const entity = await this.db.[entity].findUnique({ where: { id } });

    if (!entity) {
      throw new NotFoundException(`[Entity] "${id}" not found`);
    }

    return this.mapToViewDto(entity);
  }

  /**
   * Update [Entity]
   */
  async update(
    id: string,
    updateDto: Update[Entity]Dto,
  ): Promise<View[Entity]Dto> {
    const entity = await this.db.[entity].findUnique({ where: { id } });

    if (!entity) {
      throw new NotFoundException(`[Entity] "${id}" not found`);
    }

    const prismaInput: Prisma.[Entity]UpdateInput = {
      ...(updateDto.field_name && { name: updateDto.field_name }),
      ...(updateDto.optional_field !== undefined && {
        optional_field: updateDto.optional_field,
      }),
    };

    const updated = await this.db.[entity].update({
      where: { id },
      data: prismaInput,
    });

    return this.mapToViewDto(updated);
  }

  /**
   * Delete [Entity]
   */
  async delete(id: string): Promise<{ message: string }> {
    const entity = await this.db.[entity].findUnique({ where: { id } });

    if (!entity) {
      throw new NotFoundException(`[Entity] "${id}" not found`);
    }

    await this.db.[entity].update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { message: `[Entity] deleted` };
  }

  /**
   * Mapper: Prisma model → View DTO
   */
  private mapToViewDto(prismaEntity: any): View[Entity]Dto {
    return {
      id: prismaEntity.id,
      name: prismaEntity.name,
      optional_field: prismaEntity.optionalField,
      created_at: new Date(prismaEntity.createdAt),
      updated_at: new Date(prismaEntity.updatedAt),
      deleted_at: prismaEntity.deletedAt
        ? new Date(prismaEntity.deletedAt)
        : null,
    };
  }
}
```

---

## Template 8: Controller with DTOs

```typescript
// src/[module]/[module].controller.ts
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { [Entity]sService } from './[module].service';
import { Create[Entity]Dto } from './dto/create-[entity].dto';
import { Update[Entity]Dto } from './dto/update-[entity].dto';
import { Query[Entity]Dto } from './dto/query-[entity].dto';
import { View[Entity]Dto } from './dto/view-[entity].dto';

@ApiTags('[Entities]')
@Controller('[entities]')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class [Entity]sController {
  constructor(private readonly [module]Service: [Entity]sService) {}

  @Post()
  @RequirePermissions('[entities]:create')
  @ApiOperation({ summary: 'Create [Entity]' })
  @ApiCreatedResponse({
    type: View[Entity]Dto,
    description: '[Entity] created',
  })
  async create(@Body() dto: Create[Entity]Dto) {
    const data = await this.[module]Service.create(dto);
    return { data, message: '[Entity] created' };
  }

  @Get()
  @RequirePermissions('[entities]:read')
  @ApiOperation({ summary: 'Get all [Entities]' })
  @ApiOkResponse({
    description: 'Paginated [Entities]',
  })
  async findAll(@Query() query: Query[Entity]Dto) {
    return this.[module]Service.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('[entities]:read')
  @ApiOperation({ summary: 'Get [Entity]' })
  @ApiOkResponse({ type: View[Entity]Dto })
  @ApiNotFoundResponse()
  async findOne(@Param('id') id: string) {
    const data = await this.[module]Service.findOne(id);
    return { data };
  }

  @Patch(':id')
  @RequirePermissions('[entities]:update')
  @ApiOperation({ summary: 'Update [Entity]' })
  @ApiOkResponse({ type: View[Entity]Dto })
  @ApiNotFoundResponse()
  async update(
    @Param('id') id: string,
    @Body() dto: Update[Entity]Dto,
  ) {
    const data = await this.[module]Service.update(id, dto);
    return { data, message: '[Entity] updated' };
  }

  @Delete(':id')
  @RequirePermissions('[entities]:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete [Entity]' })
  @ApiNotFoundResponse()
  async delete(@Param('id') id: string) {
    await this.[module]Service.delete(id);
  }
}
```

---

## Template 9: DTO Test Suite

```typescript
// src/[module]/dto/create-[entity].dto.spec.ts
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Create[Entity]Dto } from './create-[entity].dto';

describe('Create[Entity]Dto', () => {
  describe('validation', () => {
    it('should validate with correct data', async () => {
      const dto = plainToClass(Create[Entity]Dto, {
        field_name: 'test',
        optional_field: 'optional',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail when required field is missing', async () => {
      const dto = plainToClass(Create[Entity]Dto, {});
      const errors = await validate(dto);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('field_name');
    });

    it('should fail when field exceeds max length', async () => {
      const dto = plainToClass(Create[Entity]Dto, {
        field_name: 'a'.repeat(256),
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass with only required fields', async () => {
      const dto = plainToClass(Create[Entity]Dto, {
        field_name: 'test',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
```

---

## Template 10: Index.ts Barrel Export

```typescript
// src/[module]/dto/index.ts
/**
 * DTO Barrel Exports
 * 
 * Makes importing cleaner:
 * ✅ import { Create[Entity]Dto } from './dto'
 * ❌ import { Create[Entity]Dto } from './dto/create-[entity].dto'
 */

export { Create[Entity]Dto } from './create-[entity].dto';
export { Update[Entity]Dto } from './update-[entity].dto';
export { Query[Entity]Dto } from './query-[entity].dto';
export { View[Entity]Dto } from './view-[entity].dto';
export { Assign[Relation]Dto } from './assign-[relation].dto';
```

---

## Common Validation Patterns

### Pattern: Required UUID Array
```typescript
@ApiProperty({
  description: 'Related entity IDs',
  type: [String],
  example: ['uuid-1', 'uuid-2'],
})
@IsArray()
@ArrayMinSize(1)
@IsUUID('4', { each: true })
@IsNotEmpty()
entity_ids: string[];
```

### Pattern: Optional Email
```typescript
@ApiPropertyOptional({
  description: 'Email address',
  format: 'email',
})
@IsEmail()
@IsOptional()
email?: string;
```

### Pattern: Price (cents)
```typescript
@ApiProperty({
  description: 'Price in cents',
  example: 10000,
  minimum: 0,
})
@IsNumber({ maxDecimalPlaces: 2 })
@Min(0)
price: number;
```

### Pattern: Date String
```typescript
@ApiProperty({
  description: 'Event date',
  example: '2024-12-31',
  format: 'date',
})
@IsDateString()
event_date: string;
```

### Pattern: Enum
```typescript
export enum StatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@ApiProperty({
  enum: StatusEnum,
  description: 'Entity status',
})
@IsEnum(StatusEnum)
status: StatusEnum;
```

---

## Naming Quick Reference

### Files
```
✅ create-role.dto.ts
✅ update-user.dto.ts  
✅ query-booking.dto.ts
✅ view-album.dto.ts
```

### Classes
```
✅ CreateRoleDto
✅ UpdateUserDto
✅ QueryBookingDto
✅ ViewAlbumDto
```

### Properties
```
✅ permission_ids
✅ first_name
✅ is_active
✅ created_at
❌ permissionIds
❌ firstName
❌ isActive
❌ createdAt
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Implementing Prisma
```typescript
// WRONG - Couples DTO to database
export class CreateRoleDto implements Prisma.RoleCreateInput {
  name: string;
}

// ✅ CORRECT - Independent
export class CreateRoleDto {
  name: string;
}
```

### ❌ Mistake 2: camelCase Properties
```typescript
// WRONG - Doesn't match database
export class CreateRoleDto {
  permissionIds: string[];
}

// ✅ CORRECT - Matches database
export class CreateRoleDto {
  permission_ids: string[];
}
```

### ❌ Mistake 3: Missing Decorators
```typescript
// WRONG - No validation or documentation
export class CreateRoleDto {
  name: string;
}

// ✅ CORRECT - Comprehensive
export class CreateRoleDto {
  @ApiProperty({ example: 'admin', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
```

### ❌ Mistake 4: Embedding Prisma Enums
```typescript
// WRONG - Prisma dependency
export class ViewRoleDto {
  status: Prisma.BookingStatus;
}

// ✅ CORRECT - Independent enum
export enum BookingStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
}

export class ViewRoleDto {
  @IsEnum(BookingStatusEnum)
  status: BookingStatusEnum;
}
```

### ❌ Mistake 5: Array Without Constraints
```typescript
// WRONG - Could be empty
export class CreateRoleDto {
  @IsArray()
  @IsUUID('4', { each: true })
  permission_ids?: string[];
}

// ✅ CORRECT - Enforces minimum
export class CreateRoleDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  @IsOptional()
  permission_ids?: string[];
}
```

---

## File Structure for New Module

```
src/[module]/
├── dto/
│   ├── create-[entity].dto.ts
│   ├── update-[entity].dto.ts
│   ├── query-[entity].dto.ts
│   ├── view-[entity].dto.ts
│   ├── assign-[relation].dto.ts
│   └── index.ts
├── entities/
│   └── [entity].entity.ts
├── [module].controller.ts
├── [module].controller.spec.ts
├── [module].service.ts
├── [module].service.spec.ts
├── [module].module.ts
└── [module].module.ts
```

---

## Copy-Paste Steps for New DTO

1. **Create Create DTO** → Copy Template 1, replace `[Entity]` and `[relation]`
2. **Create Update DTO** → Copy Template 2, update class name
3. **Create Query DTO** → Copy Template 3, customize fields
4. **Create View DTO** → Copy Template 4, add all response fields
5. **Create Barrel Export** → Copy Template 10
6. **Create Service** → Copy Template 7, update mappings
7. **Create Controller** → Copy Template 8, update endpoints
8. **Create Tests** → Copy Template 9, add specific test cases
9. **Update Module** → Import and register services/controllers
10. **Test Locally** → Run `npm test` and `npm run start:dev`

---

## Performance Tips

### Use Select to Limit Fields
```typescript
// ✅ GOOD - Only select needed fields
const result = await this.db.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    // Don't select: password, secretToken, etc.
  },
});

// ❌ BAD - Fetches all fields including sensitive ones
const result = await this.db.user.findMany();
```

### Pagination Matters
```typescript
// ✅ GOOD - Paginated
const users = await this.db.user.findMany({
  skip: (page - 1) * limit,
  take: limit,
});

// ❌ BAD - Fetches everything
const users = await this.db.user.findMany();
```

### Use includes/selects Wisely
```typescript
// ✅ GOOD - Only include needed relations
const role = await this.db.role.findUnique({
  where: { id },
  include: {
    permissions: true,
    // Don't include: _count of everything
  },
});

// ❌ BAD - Includes everything
const role = await this.db.role.findUnique({
  where: { id },
  include: { _all: true },
});
```

---

**Last Updated:** January 30, 2026  
**Status:** Production-Ready ✅
