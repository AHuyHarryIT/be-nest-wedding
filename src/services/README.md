# Services CRUD API Documentation

## Overview

The Services module provides comprehensive CRUD operations for managing wedding services in the system. It includes advanced features like filtering, pagination, soft deletion, and status management.

## Endpoints

### POST /services

Create a new service

- **Body**: `CreateServiceDto`
- **Response**: `201 Created` with service data
- **Features**:
  - Auto-generates unique slug if not provided
  - Ensures slug uniqueness by appending numbers if conflicts exist
  - Sets default values for optional fields
  - Validates input data with proper constraints

### GET /services

Get all services with optional filtering and pagination

- **Query Parameters**:
  - `q`: Search query (searches name and description)
  - `isActive`: Filter by active status (true/false)
  - `minPrice`: Minimum price filter
  - `maxPrice`: Maximum price filter
  - `page`: Page number for pagination (default: 1)
  - `limit`: Items per page (default: 10, max: 100)
  - `sortBy`: Sort field (name, price, createdAt, updatedAt)
  - `sortOrder`: Sort order (asc, desc)
- **Response**: `200 OK` with paginated results or simple array

### GET /services/active

Get all active services

- **Response**: `200 OK` with array of active services
- **Features**: Only returns services where `isActive = true` and not deleted

### GET /services/:id

Get a service by ID

- **Parameters**: `id` (string, UUID)
- **Response**: `200 OK` with service data or `404 Not Found`
- **Features**: Excludes soft-deleted services

### GET /services/slug/:slug

Get a service by slug

- **Parameters**: `slug` (string)
- **Response**: `200 OK` with service data or `404 Not Found`
- **Features**: URL-friendly alternative to ID lookup

### PATCH /services/:id

Update a service by ID

- **Parameters**: `id` (string, UUID)
- **Body**: `UpdateServiceDto` (partial update)
- **Response**: `200 OK` with updated service data or `404 Not Found`
- **Features**:
  - Handles slug conflicts during updates
  - Auto-generates unique slug if provided slug conflicts with existing services
  - Validates all input fields

### PATCH /services/:id/toggle-status

Toggle service active status

- **Parameters**: `id` (string, UUID)
- **Response**: `200 OK` with updated service data
- **Features**: Toggles `isActive` between true/false

### DELETE /services/:id

Soft delete a service by ID

- **Parameters**: `id` (string, UUID)
- **Response**: `200 OK` with success message or `404 Not Found`
- **Features**: Sets `deletedAt` timestamp instead of permanently deleting

### DELETE /services/:id/hard

Permanently delete a service by ID

- **Parameters**: `id` (string, UUID)
- **Response**: `200 OK` with success message or `404 Not Found`
- **Features**: Permanently removes the service from database

### PATCH /services/:id/restore

Restore a soft-deleted service

- **Parameters**: `id` (string, UUID)
- **Response**: `200 OK` with restored service data
- **Features**: Sets `deletedAt` to null

## Data Transfer Objects (DTOs)

### CreateServiceDto

```typescript
{
  name: string;              // Required: Service name (max 255 chars, not empty)
  slug?: string;             // Optional: URL-friendly identifier (max 255 chars)
  description?: string;      // Optional: Service description
  price?: number;            // Optional: Service price (default: 0, min: 0, max 2 decimals)
  isActive?: boolean;        // Optional: Active status (default: false)
}
```

### UpdateServiceDto

- Partial version of `CreateServiceDto`
- All fields are optional

### QueryServiceDto

```typescript
{
  q?: string;                    // Search query
  isActive?: boolean;            // Filter by active status
  minPrice?: number;             // Minimum price filter
  maxPrice?: number;             // Maximum price filter
  page?: number;                 // Page number (default: 1)
  limit?: number;                // Items per page (default: 10, max: 100)
  sortBy?: string;               // Sort field
  sortOrder?: 'asc' | 'desc';    // Sort order
}
```

### ViewServiceDto / Response Format

```typescript
{
  id: string; // UUID
  name: string; // Service name
  slug: string | null; // URL-friendly identifier
  description: string | null; // Service description
  price: number; // Service price
  isActive: boolean; // Active status
  createdAt: Date; // Creation timestamp
  updatedAt: Date; // Last update timestamp
  deletedAt: Date | null; // Soft deletion timestamp
}
```

## Features

### Slug Management

- **Auto-generation**: If no slug is provided, automatically generates one from the service name
- **Uniqueness**: Ensures all slugs are unique by appending incremental numbers when conflicts occur
- **Conflict Resolution**: During updates, automatically resolves slug conflicts
- **URL-friendly**: Converts text to lowercase, removes special characters, replaces spaces with hyphens

### Validation

- Input validation using class-validator decorators
- Type transformations for query parameters
- Price validation (minimum 0, max 2 decimal places)
- Pagination limits (max 100 items per page)

### Error Handling

- Automatic Prisma error handling via exception filters
- Custom not found exceptions for invalid IDs/slugs
- Proper HTTP status codes for all operations

### Response Formatting

- Standardized API response format using ResponseBuilder
- Consistent error messages and success responses
- Metadata includes timestamps and request IDs

### Soft Deletion

- Services are soft-deleted by default (sets `deletedAt`)
- Option for hard deletion when needed
- Ability to restore soft-deleted services
- Excluded from normal queries automatically

### Search & Filtering

- Text search across name and description fields
- Price range filtering
- Active status filtering
- Flexible sorting options

### Pagination

- Cursor-based pagination with page/limit
- Total count and navigation metadata
- Configurable page sizes with limits

## Security Considerations

- Input validation prevents injection attacks
- UUID-based IDs prevent enumeration
- Soft deletion preserves data integrity
- Type-safe operations with Prisma

## Performance Features

- Efficient database queries with Prisma
- Indexed fields for fast lookups
- Pagination to handle large datasets
- Case-insensitive search with database optimization
