# DTO Audit Report - NestJS Wedding Backend

**Date:** January 30, 2026  
**Project:** be-nest-wedding  
**Total DTOs Found:** 62

## Executive Summary

This audit identifies standardization issues across all 62 DTO files in the project. Key findings:

### Critical Issues Found:

1. **Prisma Interface Implementation** ❌
   - DTOs implement Prisma interfaces directly (e.g., `CreateRoleDto implements Prisma.RoleCreateInput`)
   - This violates DTOs independence principle
   - **Affected:** 15+ DTOs (CreateProductDto, CreatePackageDto, CreateServiceDto, CreateUserDto, CreateRoleDto, ViewRoleDto, CreateBookingSessionDto, etc.)

2. **Mixed Property Naming Conventions** ⚠️
   - Some DTOs use camelCase (e.g., `phoneNumber`, `firstName`)
   - Some use snake_case (e.g., `share_token`)
   - Database schema uses snake_case (required for Prisma mapping)
   - **Affected:** 20+ DTOs

3. **Missing or Incomplete API Decorators** ⚠️
   - Some properties missing `@ApiProperty` or `@ApiPropertyOptional`
   - Some descriptions are empty or missing examples
   - **Affected:** ViewRoleDto, ViewBookingDto, ViewPackageDto

4. **Missing Validation Decorators** ⚠️
   - Some properties lack appropriate validation decorators
   - Missing `@IsNotEmpty()` on required fields
   - Missing `@IsOptional()` on nullable fields
   - **Affected:** Multiple DTOs

5. **Array Validation Issues** ⚠️
   - Missing `@ArrayMinSize()` constraints
   - Missing `@ArrayMaxSize()` constraints
   - **Affected:** AssignPermissionsDto, AssignRolesToUserDto, AddFilesToAlbumDto

6. **Nested Object Validation** ⚠️
   - AddFilesToAlbumDto has nested objects but inconsistent usage of `@ValidateNested()` and `@Type()`
   - **Status:** Partially correct

7. **Inconsistent Type Annotations** ⚠️
   - UUID validation inconsistent (some use '4', some use 'all')
   - **Affected:** CreateRoleDto, CreateBookingDto, etc.

8. **Response DTOs Issues** ⚠️
   - ViewRoleDto and ViewBookingDto implement Prisma types directly
   - ViewRoleDto missing validation decorators on some fields
   - ViewBookingDto has weak typing with `any` types
   - **Affected:** ViewRoleDto, ViewBookingDto, ViewProductDto, ViewPackageDto

---

## Detailed DTOs Requiring Updates

### Category: CRUD Operations

#### 1. **Roles Module**
- ✗ `CreateRoleDto` - Implements Prisma.RoleCreateInput, needs snake_case properties
- ✗ `UpdateRoleDto` - Inherits from CreateRoleDto, needs validation review
- ✗ `ViewRoleDto` - Implements Role interface, missing descriptions, needs refactoring
- ✓ `QueryRoleDto` - Acceptable (extends PaginationQueryDto)
- ✗ `AssignPermissionsDto` - Missing @ArrayMinSize(1)
- ✓ `RevokePermissionsDto` - Similar to AssignPermissionsDto

#### 2. **Users Module**
- ✗ `CreateUserDto` - Implements Prisma.UserCreateInput, phoneNumber/firstName in camelCase
- ✗ `UpdateUserDto` - Implements Prisma.UserUpdateInput
- ✓ `QueryUserDto` - No issues
- ✗ `AssignRolesToUserDto` - Missing @ArrayMinSize(1)

#### 3. **Products Module**
- ✗ `CreateProductDto` - Implements Prisma.ProductCreateInput, has default values, missing @IsNotEmpty
- ✗ `CreateProductResponseDto` - Implements Product interface
- ✗ `UpdateProductDto` - PartialType, inherits issues
- ✓ `QueryProductDto` - Acceptable
- ✗ `ViewProductDto` - Implements Product interface, missing decorators

#### 4. **Packages Module**
- ✗ `CreatePackageDto` - Implements Prisma.PackageCreateInput, has Transform decorators (ok but complex)
- ✗ `CreatePackageResponseDto` - Implements Package interface
- ✗ `UpdatePackageDto` - PartialType
- ✗ `UpdatePackageServicesDto` - Missing @ArrayMinSize(1), missing @IsUUID for each
- ✓ `QueryPackageDto` - Acceptable
- ✗ `ViewPackageDto` - Implements Package interface

#### 5. **Services Module**
- ✗ `CreateServiceDto` - Implements Prisma.ServiceCreateInput
- ✗ `UpdateServiceDto` - PartialType
- ✗ `ViewServiceDto` - Missing review
- ✓ `QueryServiceDto` - Acceptable

#### 6. **Bookings Module**
- ✗ `CreateBookingDto` - camelCase properties (customerId, packageIds, serviceIds)
- ✗ `UpdateBookingDto` - PartialType
- ✗ `ViewBookingDto` - Uses `any` types, weak typing, missing descriptions
- ✓ `QueryBookingDto` - Acceptable

#### 7. **BookingSessions Module**
- ✗ `CreateBookingSessionDto` - Uses camelCase (bookingId, locationName, startsAt, endsAt)
- ✗ `UpdateBookingSessionDto` - PartialType
- ✓ `QueryBookingSessionDto` - Acceptable

#### 8. **Payments Module**
- ✗ `CreatePaymentDto` - Needs review (re-exported from common)
- ✗ `UpdatePaymentDto` - Needs review
- ✓ `MomoCallbackDto` - Acceptable

#### 9. **Albums Module**
- ✗ `CreateAlbumDto` - Uses snake_case (share_token), mixed conventions, missing @IsNotEmpty on title
- ✗ `UpdateAlbumDto` - PartialType
- ✗ `UploadImageToAlbumDto` - Missing type decorators (sortOrder should be @IsNumber not @IsString)
- ✗ `AddFilesToAlbumDto` - Good structure but nested DTO (AlbumFileDto) has issues
- ✗ `RemoveFilesFromAlbumDto` - Missing @ArrayMinSize(1)
- ✓ `ViewAlbumDto` - Acceptable
- ✓ `QueryAlbumDto` - Acceptable
- ✓ `GenerateShareTokenDto` - Acceptable

#### 10. **Categories Module**
- ✗ `CreateCategoryDto` - Missing @IsNotEmpty on name
- ✗ `UpdateCategoryDto` - PartialType, missing @IsNotEmpty

#### 11. **Orders Module**
- ✗ `CheckoutDto` - Missing decorators, bookingId should have @IsUUID
- ✗ `PayRemainingDto` - Needs review
- ✓ `Index exports` - Acceptable

#### 12. **InventoryReservations Module**
- ✓ `CreateInventoryReservationDto` - Acceptable
- ✗ `UpdateInventoryReservationDto` - Needs review

#### 13. **Permissions Module**
- ✓ `ViewPermissionDto` - Acceptable
- ✓ `QueryPermissionDto` - Acceptable

#### 14. **Auth Module**
- ✗ `LoginDto` - phoneNumber uses @IsPhoneNumber (ok), password missing @MaxLength
- ✗ `RegisterDto` - Similar to LoginDto, password missing @MaxLength
- ✗ `ChangePasswordDto` - Similar pattern

#### 15. **Common Module**
- ✓ `PaginationQueryDto` - Well-structured, acceptable
- ✓ `ResponseDto` - Acceptable

---

## Standardization Rules Applied

### Property Naming
- **Database columns:** snake_case (used in schema)
- **DTOs:** Keep snake_case to match database columns (as per DTO best practice)
- Exception: JavaScript conventions allow camelCase in DTO class properties if mapped

### Validation Patterns
```typescript
// Required field pattern
@ApiProperty({
  description: 'Clear description',
  example: 'example-value',
})
@IsString()
@IsNotEmpty()
name: string;

// Optional field pattern
@ApiPropertyOptional({
  description: 'Clear description',
  example: 'example-value',
  nullable: true,
})
@IsString()
@IsOptional()
description?: string | null;

// UUID field pattern
@ApiProperty({
  description: 'Entity ID',
  example: 'uuid-1234',
})
@IsUUID('4')
@IsNotEmpty()
id: string;

// Array pattern
@ApiProperty({
  description: 'List of IDs',
  example: ['uuid-1', 'uuid-2'],
  type: [String],
})
@IsArray()
@ArrayMinSize(1)
@IsUUID('4', { each: true })
@IsNotEmpty()
ids: string[];

// Nested objects pattern
@ApiProperty({
  description: 'Files to add',
  type: [AlbumFileDto],
})
@IsArray()
@ArrayMinSize(1)
@ValidateNested({ each: true })
@Type(() => AlbumFileDto)
@IsNotEmpty()
files: AlbumFileDto[];
```

---

## Priority Updates

### HIGH PRIORITY (Breaking Changes Risk)
1. Remove Prisma interface implementations
2. Standardize property names (snake_case vs camelCase)
3. Add missing @IsNotEmpty decorators on required fields
4. Fix weak typing (any → proper types)

### MEDIUM PRIORITY (Validation Issues)
1. Add @ArrayMinSize constraints to arrays
2. Add missing API decorators
3. Complete descriptions and examples
4. Standardize UUID validation

### LOW PRIORITY (Code Quality)
1. Consistency improvements
2. Remove redundant decorators
3. Type annotation cleanup

---

## Files Requiring Updates

**Total Files to Update: 52 DTO files**

✓ No changes: 10 files (QueryRole, QueryProduct, QueryBooking, PaginationQuery, ResponseDto, PermissionDto, InventoryReservation, etc.)

---

## Implementation Strategy

1. **Phase 1:** Update core entity Create/Update DTOs
2. **Phase 2:** Update Response/View DTOs
3. **Phase 3:** Update Query/Utility DTOs
4. **Phase 4:** Update Controller decorators (@ApiResponse)
5. **Phase 5:** Verification and testing

---

## Expected Outcomes

✅ All DTOs follow naming conventions  
✅ All DTOs are independent from Prisma interfaces  
✅ All properties have appropriate validation decorators  
✅ All API properties have descriptions and examples  
✅ No camelCase/snake_case inconsistencies  
✅ Strong typing throughout (no `any` types in DTOs)  
✅ Consistent array validation patterns  
✅ Complete nested object validation  
