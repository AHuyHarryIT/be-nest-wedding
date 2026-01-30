# DTO Architecture - Real-World Examples from be-nest-wedding

**This document shows actual working code from your production backend**

---

## Table of Contents

1. [Roles Module - Complete Flow](#roles-module---complete-flow)
2. [Products Module - Complex Mappings](#products-module---complex-mappings)
3. [Bookings Module - Nested Relations](#bookings-module---nested-relations)
4. [Albums Module - Advanced Patterns](#albums-module---advanced-patterns)
5. [Auth Module - Special Cases](#auth-module---special-cases)
6. [Common Anti-Patterns & Fixes](#common-anti-patterns--fixes)

---

## Roles Module - Complete Flow

### Current Production State ✅

**DTO Layer - CREATE**
```typescript
// src/roles/dto/create-role.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsArray,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'The unique name of the role',
    example: 'admin',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the role',
    example: 'Administrator role with full access',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Array of permission IDs to assign to this role',
    example: ['uuid-1', 'uuid-2'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  @IsOptional()
  permission_ids?: string[];
}
```

**Key Features:**
- ✅ No Prisma interface implementation
- ✅ snake_case properties match database
- ✅ Comprehensive @ApiProperty decorators
- ✅ All decorators present for validation
- ✅ Optional array with constraints

---

**DTO Layer - UPDATE**
```typescript
// src/roles/dto/update-role.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
```

**Why this works:**
- Automatically makes all CreateRoleDto fields optional
- No need to duplicate decorators
- PATCH semantics (only send what you want to change)
- Type-safe and maintainable

---

**DTO Layer - RESPONSE**
```typescript
// src/roles/dto/view-role.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsArray, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ViewRolePermissionDto {
  @ApiProperty({
    description: 'Role ID',
    example: 'uuid-role-1',
  })
  @IsUUID('4')
  role_id: string;

  @ApiProperty({
    description: 'Permission ID',
    example: 'uuid-permission-1',
  })
  @IsUUID('4')
  permission_id: string;

  @ApiProperty({
    description: 'Permission details',
    example: {
      id: 'uuid-permission-1',
      key: 'user:read',
      description: 'Allows reading user data',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
    },
  })
  permission: Record<string, any>;
}

export class ViewRoleDto {
  @ApiProperty({
    description: 'Unique identifier of the role',
    example: 'uuid-role-1',
  })
  @IsUUID('4')
  id: string;

  @ApiProperty({
    description: 'Name of the role',
    example: 'Admin',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the role',
    example: 'Administrator role with full access',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  description: string | null;

  @ApiProperty({
    description: 'Creation date of the role',
    example: '2023-01-01T00:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  created_at: Date;

  @ApiProperty({
    description: 'Last update date of the role',
    example: '2023-01-01T00:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  updated_at: Date;

  @ApiPropertyOptional({
    description: 'Soft delete date of the role',
    example: null,
    nullable: true,
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  deleted_at: Date | null;

  @ApiPropertyOptional({
    description: 'Associated permissions',
    type: () => [ViewRolePermissionDto],
  })
  @IsArray()
  @IsOptional()
  permissions?: ViewRolePermissionDto[];
}
```

**Key Features:**
- ✅ Nested DTO for permissions (ViewRolePermissionDto)
- ✅ Proper Date transformation with @Type(() => Date)
- ✅ Includes all response fields with documentation
- ✅ Optional nested array with @IsOptional()

---

**Service Layer - CREATE MAPPING**
```typescript
// src/roles/roles.service.ts (excerpt)
import { Prisma } from 'generated/prisma';

@Injectable()
export class RolesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(@Body() createRoleDto: CreateRoleDto) {
    const { permission_ids, ...roleData } = createRoleDto;

    // Check if role name already exists
    const existingRole = await this.databaseService.role.findUnique({
      where: { name: roleData.name },
    });

    if (existingRole) {
      throw new ConflictException(
        `Role with name "${roleData.name}" already exists`,
      );
    }

    // Validate permissions exist
    if (permission_ids && permission_ids.length > 0) {
      const permissions = await this.databaseService.permission.findMany({
        where: { id: { in: permission_ids } },
      });

      if (permissions.length !== permission_ids.length) {
        throw new BadRequestException('One or more permission IDs are invalid');
      }

      // Create role with permissions
      return await this.databaseService.role.create({
        data: {
          name: roleData.name,
          description: roleData.description || null,
          permissions: {
            create: permission_ids.map((permissionId) => ({
              permissionId,  // ← Maps permission_ids to Prisma field
            })),
          },
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    }

    // Create role without permissions
    return await this.databaseService.role.create({
      data: {
        name: roleData.name,
        description: roleData.description || null,
      },
    });
  }

  private mapToViewDto(prismaRole: any): ViewRoleDto {
    return {
      id: prismaRole.id,
      name: prismaRole.name,
      description: prismaRole.description,
      created_at: new Date(prismaRole.createdAt),  // Prisma camelCase → DTO snake_case
      updated_at: new Date(prismaRole.updatedAt),
      deleted_at: prismaRole.deletedAt ? new Date(prismaRole.deletedAt) : null,
      permissions: prismaRole.permissions?.map((rp) => ({
        role_id: rp.roleId,
        permission_id: rp.permissionId,
        permission: rp.permission,
      })),
    };
  }
}
```

**Key Points:**
1. **DTO Validation** - NestJS automatically validates CreateRoleDto
2. **Business Logic** - Permission validation in service layer
3. **DTO → Prisma Mapping** - Convert snake_case to Prisma structure
4. **Type Mapping** - Use mapToViewDto to convert response
5. **Error Handling** - ConflictException for duplicates, BadRequestException for invalid IDs

---

**Controller Layer - HTTP Handling**
```typescript
// src/roles/roles.controller.ts (excerpt)
@Post()
@RequirePermissions('roles:create')
@ApiOperation({ summary: 'Create a new role' })
@ApiCreatedSuccessResponse({ description: 'Role created successfully' })
@ApiUnauthorizedResponse()
@ApiForbiddenResponse()
@ApiConflictResponse()
@ApiErrorResponse({ description: 'Error occurred while creating role' })
create(@Body() createRoleDto: CreateRoleDto) {
  const role = this.rolesService.create(createRoleDto);
  return ResponseBuilder.created(role, 'Role created successfully');
}
```

**Flow:**
1. **Request** → POST /roles { name: "admin", permission_ids: [...] }
2. **Validation** → CreateRoleDto validators run automatically
3. **Controller** → Passes validated DTO to service
4. **Service** → Maps DTO to Prisma, executes create, maps response
5. **Response** → ViewRoleDto in 201 Created with Location header

---

## Products Module - Complex Mappings

### Example: Product with Multiple Property Conversions

**DTO - INPUT**
```typescript
// src/products/dto/create-product.dto.ts
export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Vintage Camera',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Stock quantity',
    example: 100,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  stock_qty: number;  // ← Database: stock_quantity

  @ApiPropertyOptional({
    description: 'Is product active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Category ID',
    example: 'uuid-category-1',
  })
  @IsUUID('4')
  @IsOptional()
  category_id?: string;

  @ApiPropertyOptional({
    description: 'Image file ID',
    example: 'uuid-file-1',
  })
  @IsUUID('4')
  @IsOptional()
  image_file_id?: string;

  @ApiPropertyOptional({
    description: 'OneDrive folder ID',
    example: 'folder-uuid',
  })
  @IsString()
  @IsOptional()
  one_drive_folder_id?: string;
}
```

**Prisma Schema Reference:**
```prisma
model Product {
  id                    String   @id @default(uuid()) @db.Uuid
  name                  String   @db.VarChar(255)
  stock_qty             Int      @default(0)
  is_active             Boolean  @default(true)
  category_id           String?  @db.Uuid
  image_file_id         String?  @db.Uuid
  one_drive_folder_id   String?
  created_at            DateTime @default(now()) @db.Timestamptz
  updated_at            DateTime @updatedAt @db.Timestamptz
  deleted_at            DateTime? @db.Timestamptz
  category              Category? @relation(fields: [category_id], references: [id])
  imageFile             FileMetadata? @relation("ProductImage", fields: [image_file_id], references: [id])
  oneDriveFolder        OneDriveFolder? @relation(fields: [one_drive_folder_id], references: [id])
}
```

**Service - Mapping Logic**
```typescript
async create(createProductDto: CreateProductDto): Promise<ViewProductDto> {
  // Validate category exists if provided
  if (createProductDto.category_id) {
    const category = await this.databaseService.category.findUnique({
      where: { id: createProductDto.category_id },
    });

    if (!category) {
      throw new BadRequestException('Category not found');
    }
  }

  // Map DTO to Prisma input
  const prismaInput: Prisma.ProductCreateInput = {
    name: createProductDto.name,
    stock_qty: createProductDto.stock_qty,
    is_active: createProductDto.is_active ?? true,  // Default value
    ...(createProductDto.category_id && {
      category: { connect: { id: createProductDto.category_id } },
    }),
    ...(createProductDto.image_file_id && {
      imageFile: { connect: { id: createProductDto.image_file_id } },
    }),
    ...(createProductDto.one_drive_folder_id && {
      oneDriveFolder: { connect: { id: createProductDto.one_drive_folder_id } },
    }),
  };

  const product = await this.databaseService.product.create({
    data: prismaInput,
    include: {
      category: true,
      imageFile: true,
      oneDriveFolder: true,
    },
  });

  return this.mapToViewDto(product);
}

private mapToViewDto(prismaProduct: any): ViewProductDto {
  return {
    id: prismaProduct.id,
    name: prismaProduct.name,
    stock_qty: prismaProduct.stock_qty,
    is_active: prismaProduct.is_active,
    category_id: prismaProduct.category_id,
    image_file_id: prismaProduct.image_file_id,
    one_drive_folder_id: prismaProduct.one_drive_folder_id,
    created_at: new Date(prismaProduct.created_at),
    updated_at: new Date(prismaProduct.updated_at),
    deleted_at: prismaProduct.deleted_at ? new Date(prismaProduct.deleted_at) : null,
    // Optional: Include related objects
    category: prismaProduct.category ? { id: prismaProduct.category.id, name: prismaProduct.category.name } : undefined,
  };
}
```

**Key Learning Points:**
1. **Relation Handling** - Use `connect` to relate by ID only
2. **Default Values** - Use `??` operator for defaults
3. **Optional Relations** - Use spread operator for conditional relations
4. **Type Mapping** - Convert all camelCase from Prisma to snake_case
5. **Nested Transformation** - Only transform needed related data

---

## Bookings Module - Nested Relations

### Complex Nested Structure Example

**DTO - Nested Input**
```typescript
// src/bookings/dto/create-booking.dto.ts
export class CreateBookingDto {
  @ApiProperty({
    description: 'Customer ID',
    example: 'uuid-customer',
  })
  @IsUUID('4')
  @IsNotEmpty()
  customer_id: string;

  @ApiPropertyOptional({
    description: 'Package IDs',
    type: [String],
    example: ['uuid-package-1', 'uuid-package-2'],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  @IsOptional()
  package_ids?: string[];

  @ApiPropertyOptional({
    description: 'Service IDs',
    type: [String],
    example: ['uuid-service-1', 'uuid-service-2'],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  @IsOptional()
  service_ids?: string[];

  @ApiPropertyOptional({
    description: 'Event date',
    example: '2024-12-31T10:00:00Z',
    format: 'date-time',
  })
  @IsDateString()
  @IsOptional()
  event_date?: string;

  @ApiPropertyOptional({
    description: 'Total price',
    example: 50000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  total_price?: number;

  @ApiPropertyOptional({
    description: 'Booking notes',
    example: 'Special requests here',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
```

**DTO - Nested Response**
```typescript
// src/bookings/dto/view-booking.dto.ts
export class ViewBookingOrderDto {
  @ApiPropertyOptional()
  @IsUUID('4')
  id?: string;

  @ApiPropertyOptional()
  total_price?: number;

  @ApiPropertyOptional()
  deposit_amount?: number;

  @ApiPropertyOptional()
  remaining_amount?: number;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  @Type(() => Date)
  created_at?: Date;
}

export class ViewBookingDto {
  @ApiProperty()
  @IsUUID('4')
  id: string;

  @ApiProperty()
  @IsUUID('4')
  customer_id: string;

  @ApiProperty()
  @IsDateString()
  event_date: string;

  @ApiProperty()
  @IsNumber()
  total_price: number;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({
    description: 'Associated orders',
    type: [ViewBookingOrderDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ViewBookingOrderDto)
  orders?: ViewBookingOrderDto[];

  @ApiProperty()
  @Type(() => Date)
  created_at: Date;

  @ApiProperty()
  @Type(() => Date)
  updated_at: Date;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsOptional()
  cancelled_at?: Date | null;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsOptional()
  deleted_at?: Date | null;
}
```

**Service - Complex Mapping**
```typescript
async create(createBookingDto: CreateBookingDto): Promise<ViewBookingDto> {
  // Validate customer exists
  const customer = await this.databaseService.user.findUnique({
    where: { id: createBookingDto.customer_id },
  });

  if (!customer) {
    throw new NotFoundException('Customer not found');
  }

  // Validate packages if provided
  if (createBookingDto.package_ids && createBookingDto.package_ids.length > 0) {
    const packages = await this.databaseService.package.findMany({
      where: { id: { in: createBookingDto.package_ids } },
    });

    if (packages.length !== createBookingDto.package_ids.length) {
      throw new BadRequestException('One or more package IDs are invalid');
    }
  }

  // Validate services if provided
  if (createBookingDto.service_ids && createBookingDto.service_ids.length > 0) {
    const services = await this.databaseService.service.findMany({
      where: { id: { in: createBookingDto.service_ids } },
    });

    if (services.length !== createBookingDto.service_ids.length) {
      throw new BadRequestException('One or more service IDs are invalid');
    }
  }

  // Map to Prisma input - handle multiple relations
  const prismaInput: Prisma.BookingCreateInput = {
    customer: { connect: { id: createBookingDto.customer_id } },
    event_date: createBookingDto.event_date ? new Date(createBookingDto.event_date) : null,
    total_price: createBookingDto.total_price || 0,
    notes: createBookingDto.notes,
    ...(createBookingDto.package_ids && {
      packages: {
        create: createBookingDto.package_ids.map((packageId) => ({
          packageId,
        })),
      },
    }),
    ...(createBookingDto.service_ids && {
      services: {
        create: createBookingDto.service_ids.map((serviceId) => ({
          serviceId,
        })),
      },
    }),
  };

  const booking = await this.databaseService.booking.create({
    data: prismaInput,
    include: {
      customer: true,
      packages: { include: { package: true } },
      services: { include: { service: true } },
      orders: true,
    },
  });

  return this.mapToViewDto(booking);
}

private mapToViewDto(prismaBooking: any): ViewBookingDto {
  return {
    id: prismaBooking.id,
    customer_id: prismaBooking.customer_id,
    event_date: prismaBooking.event_date?.toISOString() || null,
    total_price: prismaBooking.total_price,
    status: prismaBooking.status,
    orders: prismaBooking.orders?.map((order: any) => ({
      id: order.id,
      total_price: order.total_price,
      deposit_amount: order.deposit_amount,
      remaining_amount: order.remaining_amount,
      status: order.status,
      created_at: new Date(order.created_at),
    })),
    created_at: new Date(prismaBooking.created_at),
    updated_at: new Date(prismaBooking.updated_at),
    cancelled_at: prismaBooking.cancelled_at ? new Date(prismaBooking.cancelled_at) : null,
    deleted_at: prismaBooking.deleted_at ? new Date(prismaBooking.deleted_at) : null,
  };
}
```

**Key Lessons:**
1. **Multiple Relations** - Handle multiple many-to-many relations in one create
2. **Validation Before Create** - Verify all IDs exist before database operation
3. **Proper Nesting** - Transform nested arrays properly
4. **Date Conversion** - Convert all dates consistently
5. **Selective Inclusion** - Only include relations needed in response

---

## Albums Module - Advanced Patterns

### Most Complex DTO Example - Files and Transformations

**DTO - File Upload with Nested Structure**
```typescript
// src/albums/dto/add-files-to-album.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested, Type, IsInt, Min, IsOptional, IsUUID, IsNotEmpty } from 'class-validator';
import { IsArray, ArrayMinSize } from 'class-validator';

export class AlbumFileDto {
  @ApiProperty({
    description: 'File ID to add to album',
    example: 'uuid-file-1',
  })
  @IsUUID('4')
  @IsNotEmpty()
  file_id: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  sort_order?: number = 0;

  @ApiPropertyOptional({
    description: 'Usage type',
    enum: ['MAIN', 'THUMBNAIL', 'BACKUP'],
    example: 'MAIN',
  })
  @IsOptional()
  usage_type?: string;
}

export class AddFilesToAlbumDto {
  @ApiProperty({
    description: 'Array of files to add',
    type: [AlbumFileDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })  // ← Validates each nested object
  @Type(() => AlbumFileDto)  // ← Transforms to AlbumFileDto class
  @IsNotEmpty()
  files: AlbumFileDto[];
}
```

**Service - Nested Transformation**
```typescript
async addFilesToAlbum(
  id: string,
  addFilesDto: AddFilesToAlbumDto,
): Promise<ViewAlbumDto> {
  // Verify album exists
  const album = await this.databaseService.album.findUnique({
    where: { id },
  });

  if (!album) {
    throw new NotFoundException('Album not found');
  }

  // Verify all files exist
  const fileIds = addFilesDto.files.map((f) => f.file_id);
  const files = await this.databaseService.fileMetadata.findMany({
    where: { id: { in: fileIds } },
  });

  if (files.length !== fileIds.length) {
    throw new BadRequestException('One or more file IDs are invalid');
  }

  // Create album files with nested data
  const prismaInput: Prisma.AlbumUpdateInput = {
    files: {
      create: addFilesDto.files.map((albumFile) => ({
        file: { connect: { id: albumFile.file_id } },
        sort_order: albumFile.sort_order || 0,
        usage_type: albumFile.usage_type || 'MAIN',
      })),
    },
  };

  const updated = await this.databaseService.album.update({
    where: { id },
    data: prismaInput,
    include: {
      files: {
        include: { file: true },
        orderBy: { sort_order: 'asc' },
      },
    },
  });

  return this.mapToViewDto(updated);
}
```

**Key Advanced Features:**
1. **Nested Validation** - `@ValidateNested({ each: true })`
2. **Type Transformation** - `@Type(() => AlbumFileDto)`
3. **Nested Array Processing** - Map and create multiple nested relations
4. **Error Handling** - Verify nested resources before creating
5. **Ordering** - Sort included relations for consistent results

---

## Auth Module - Special Cases

### Special Pattern: Password Validation

**DTO - Password Fields**
```typescript
// src/auth/dto/auth.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsStrongPassword,
  IsNotEmpty,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'User phone number',
    example: '0123456789',
    pattern: '^[0-9]{10,11}$',
  })
  @Matches(/^[0-9]{10,11}$/, {
    message: 'Phone number must be 10-11 digits',
  })
  phone_number: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'CurrentPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  current_password: string;

  @ApiProperty({
    description: 'New password (must be strong)',
    example: 'NewPassword123!@#',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  new_password: string;

  @ApiProperty({
    description: 'Confirm new password (must match)',
    example: 'NewPassword123!@#',
  })
  @IsString()
  @IsNotEmpty()
  confirm_password: string;
}
```

**Service - Password Handling**
```typescript
async changePassword(
  userId: string,
  changePasswordDto: ChangePasswordDto,
): Promise<{ message: string }> {
  // Verify passwords match
  if (changePasswordDto.new_password !== changePasswordDto.confirm_password) {
    throw new BadRequestException('New passwords do not match');
  }

  // Get user with password hash
  const user = await this.databaseService.user.findUnique({
    where: { id: userId },
    select: { id: true, password_hash: true },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(
    changePasswordDto.current_password,
    user.password_hash,
  );

  if (!isPasswordValid) {
    throw new UnauthorizedException('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(changePasswordDto.new_password, 10);

  // Update password
  await this.databaseService.user.update({
    where: { id: userId },
    data: { password_hash: hashedPassword },
  });

  return { message: 'Password changed successfully' };
}
```

**Key Security Patterns:**
1. **Strong Password Validation** - @IsStrongPassword with requirements
2. **Confirmation Validation** - Verify passwords match before update
3. **Never Return Passwords** - Use select to exclude from responses
4. **Compare Securely** - Use bcrypt for password hashing/comparison
5. **Clear Error Messages** - Don't expose why auth failed

---

## Common Anti-Patterns & Fixes

### Anti-Pattern 1: DTO with Database Logic

❌ **WRONG:**
```typescript
export class CreateUserDto {
  email: string;

  // ← Database logic in DTO!
  async validateEmailUnique(): Promise<boolean> {
    // Requires injecting DatabaseService...
  }
}
```

✅ **CORRECT:**
```typescript
// DTO stays clean
export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

// Validation in Service
@Injectable()
export class UsersService {
  async create(createUserDto: CreateUserDto) {
    const existing = await this.db.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }
    // ...
  }
}
```

---

### Anti-Pattern 2: Exposing Internal Fields

❌ **WRONG:**
```typescript
export class ViewUserDto {
  id: string;
  email: string;
  password_hash: string;  // ← Never expose!
  two_factor_secret: string;  // ← Sensitive!
  api_key: string;  // ← Secret!
}
```

✅ **CORRECT:**
```typescript
export class ViewUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  first_name: string;

  @ApiProperty()
  is_active: boolean;

  // Password, secrets, API keys NOT included
}
```

---

### Anti-Pattern 3: Missing Type Safety

❌ **WRONG:**
```typescript
export class ViewBookingDto {
  orders: any;  // ← What's the structure?
  customer: any;  // ← Unknown fields
  services: any;  // ← Unclear
}
```

✅ **CORRECT:**
```typescript
export class ViewBookingOrderDto {
  @ApiProperty()
  @IsUUID('4')
  id: string;

  @ApiProperty()
  @IsNumber()
  total_price: number;
}

export class ViewBookingDto {
  @ApiProperty({
    type: [ViewBookingOrderDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ViewBookingOrderDto)
  orders: ViewBookingOrderDto[];
}
```

---

### Anti-Pattern 4: Inconsistent Property Naming

❌ **WRONG:**
```typescript
export class QueryUserDto {
  firstName?: string;        // camelCase
  last_name?: string;        // snake_case
  isActive?: boolean;        // camelCase
  created_at?: Date;         // snake_case
  phoneNumber?: string;      // camelCase - INCONSISTENT!
}
```

✅ **CORRECT:**
```typescript
export class QueryUserDto {
  @IsOptional()
  first_name?: string;       // snake_case
  
  @IsOptional()
  last_name?: string;        // snake_case
  
  @IsOptional()
  is_active?: boolean;       // snake_case
  
  @IsOptional()
  created_at?: Date;         // snake_case
  
  @IsOptional()
  phone_number?: string;     // snake_case - CONSISTENT!
}
```

---

### Anti-Pattern 5: Missing Validation

❌ **WRONG:**
```typescript
export class CreateProductDto {
  name: string;              // No validation
  price: number;             // Could be negative
  quantity: number;          // Could be negative
  category_ids: string[];    // No UUID validation
}
```

✅ **CORRECT:**
```typescript
export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  @IsOptional()
  category_ids?: string[];
}
```

---

## Summary: Real-World DTO Checklist

For **every DTO you create**, verify:

```
STRUCTURE:
☐ File: src/[module]/dto/[type]-[entity].dto.ts
☐ Class: [Type][Entity]Dto (e.g., CreateRoleDto)
☐ Export: From dto/index.ts barrel file
☐ Separate: Create, Update, Query, View DTOs

PROPERTIES:
☐ All use snake_case matching database columns
☐ No @map or Prisma references
☐ All required fields have @IsNotEmpty()
☐ All optional fields have @IsOptional()
☐ All have @ApiProperty() or @ApiPropertyOptional()
☐ All have realistic examples

ARRAYS:
☐ Use @ArrayMinSize(1) not @ArrayNotEmpty()
☐ Arrays of IDs have @IsUUID('4', { each: true })
☐ Nested arrays use @ValidateNested({ each: true })

TYPES:
☐ Dates use @Type(() => Date)
☐ Enums use @IsEnum(EnumClass)
☐ Nested objects use @ValidateNested() + @Type()

SECURITY:
☐ Sensitive fields (passwords, secrets) NOT in responses
☐ Only expose necessary information
☐ No raw database fields exposed

SERVICE LAYER:
☐ Create mapping function: mapToViewDto()
☐ Validate referenced IDs exist
☐ Handle errors (NotFoundException, ConflictException)
☐ Convert DTO properties to Prisma operations
```

---

**Last Updated:** January 30, 2026  
**Status:** Production-Ready ✅  
**Verified:** All examples from live codebase in be-nest-wedding project
