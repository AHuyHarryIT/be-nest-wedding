# Prisma Exception Handling

This document describes the Prisma exception handling implementation in the NestJS application.

## Overview

The Prisma exception handling system consists of two main filters:

1. **PrismaExceptionFilter** - Handles `PrismaClientKnownRequestError`
2. **PrismaClientExceptionFilter** - Handles other Prisma client errors

## Supported Prisma Error Codes

### PrismaClientKnownRequestError Mappings

| Prisma Code | HTTP Status | Error Code                     | Description                                                  |
| ----------- | ----------- | ------------------------------ | ------------------------------------------------------------ |
| P2000       | 400         | VALUE_TOO_LONG                 | The provided value is too long for the column                |
| P2001       | 404         | RECORD_NOT_FOUND               | The record searched for does not exist                       |
| P2002       | 409         | UNIQUE_CONSTRAINT_VIOLATION    | Unique constraint failed                                     |
| P2003       | 400         | FOREIGN_KEY_CONSTRAINT_FAILED  | Foreign key constraint failed                                |
| P2004       | 400         | CONSTRAINT_FAILED              | A constraint failed on the database                          |
| P2005       | 400         | INVALID_VALUE                  | The value stored in the database is invalid                  |
| P2006       | 400         | INVALID_VALUE_PROVIDED         | The provided value is not valid                              |
| P2007       | 400         | DATA_VALIDATION_ERROR          | Data validation error                                        |
| P2008       | 400         | QUERY_PARSE_ERROR              | Failed to parse the query                                    |
| P2009       | 400         | QUERY_VALIDATION_ERROR         | Failed to validate the query                                 |
| P2010       | 500         | RAW_QUERY_FAILED               | Raw query failed                                             |
| P2011       | 400         | NULL_CONSTRAINT_VIOLATION      | Null constraint violation                                    |
| P2012       | 400         | MISSING_REQUIRED_VALUE         | Missing a required value                                     |
| P2013       | 400         | MISSING_REQUIRED_ARGUMENT      | Missing the required argument                                |
| P2014       | 400         | RELATION_VIOLATION             | The change would violate the required relation               |
| P2015       | 404         | RELATED_RECORD_NOT_FOUND       | A related record could not be found                          |
| P2016       | 400         | QUERY_INTERPRETATION_ERROR     | Query interpretation error                                   |
| P2017       | 400         | RECORDS_NOT_CONNECTED          | The records for relation are not connected                   |
| P2018       | 404         | CONNECTED_RECORDS_NOT_FOUND    | The required connected records were not found                |
| P2019       | 400         | INPUT_ERROR                    | Input error                                                  |
| P2020       | 400         | VALUE_OUT_OF_RANGE             | Value out of range for the type                              |
| P2021       | 404         | TABLE_NOT_FOUND                | The table does not exist in the current database             |
| P2022       | 404         | COLUMN_NOT_FOUND               | The column does not exist in the current database            |
| P2023       | 400         | INCONSISTENT_COLUMN_DATA       | Inconsistent column data                                     |
| P2024       | 408         | CONNECTION_TIMEOUT             | Timed out fetching a new connection from the connection pool |
| P2025       | 404         | RECORD_NOT_FOUND_FOR_OPERATION | Record to update not found                                   |

### Other Prisma Client Errors

| Exception Type                  | HTTP Status | Error Code                    | Description                                   |
| ------------------------------- | ----------- | ----------------------------- | --------------------------------------------- |
| PrismaClientUnknownRequestError | 500         | UNKNOWN_DATABASE_ERROR        | Unknown database error occurred               |
| PrismaClientRustPanicError      | 500         | DATABASE_ENGINE_ERROR         | Database engine encountered an internal error |
| PrismaClientInitializationError | 500         | DATABASE_INITIALIZATION_ERROR | Failed to initialize database connection      |
| PrismaClientValidationError     | 400         | DATABASE_VALIDATION_ERROR     | Invalid query parameters or data structure    |

## Response Format

All Prisma errors are formatted according to the standardized error response format:

```json
{
  "success": false,
  "message": "Database operation failed",
  "error": {
    "code": "UNIQUE_CONSTRAINT_VIOLATION",
    "message": "A record with this email already exists",
    "details": {
      "prismaCode": "P2002",
      "meta": {
        "target": ["email"]
      },
      "path": "/api/users",
      "method": "POST"
    }
  },
  "meta": {
    "timestamp": "2025-10-15T10:30:00.000Z",
    "version": "1.0.0",
    "requestId": "req_1697368200000_abc123def"
  }
}
```

## Usage Examples

### Creating a User with Duplicate Email (P2002)

**Request:**

```bash
POST /api/users
{
  "email": "existing@example.com",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "success": false,
  "message": "Database operation failed",
  "error": {
    "code": "UNIQUE_CONSTRAINT_VIOLATION",
    "message": "A record with this email already exists"
  },
  "meta": {
    "timestamp": "2025-10-15T10:30:00.000Z",
    "version": "1.0.0",
    "requestId": "req_1697368200000_abc123def"
  }
}
```

### Updating Non-Existent Record (P2025)

**Request:**

```bash
PATCH /api/users/non-existent-id
{
  "name": "Updated Name"
}
```

**Response:**

```json
{
  "success": false,
  "message": "Database operation failed",
  "error": {
    "code": "RECORD_NOT_FOUND_FOR_OPERATION",
    "message": "Record to update not found"
  },
  "meta": {
    "timestamp": "2025-10-15T10:30:00.000Z",
    "version": "1.0.0",
    "requestId": "req_1697368200000_abc123def"
  }
}
```

### Foreign Key Constraint Violation (P2003)

**Request:**

```bash
POST /api/posts
{
  "title": "My Post",
  "authorId": "non-existent-user-id"
}
```

**Response:**

```json
{
  "success": false,
  "message": "Database operation failed",
  "error": {
    "code": "FOREIGN_KEY_CONSTRAINT_FAILED",
    "message": "Foreign key constraint failed"
  },
  "meta": {
    "timestamp": "2025-10-15T10:30:00.000Z",
    "version": "1.0.0",
    "requestId": "req_1697368200000_abc123def"
  }
}
```

## Configuration

The Prisma exception filters are automatically registered in `main.ts`:

```typescript
// Global filters (order matters - more specific first)
app.useGlobalFilters(
  new PrismaExceptionFilter(),
  new PrismaClientExceptionFilter(),
  new HttpExceptionFilter(),
);
```

## Development vs Production

- **Development**: Error details include Prisma-specific information, request path, and method
- **Production**: Error details are omitted for security reasons

## Error Logging

All Prisma errors are automatically logged with:

- Error message
- Prisma error code (if applicable)
- Full stack trace
- Request context

## Best Practices

1. **Let Prisma Errors Bubble Up**: Don't catch Prisma errors in services, let the filters handle them
2. **Use Descriptive Field Names**: Unique constraint error messages will be more meaningful
3. **Handle Business Logic Separately**: Use custom exceptions for business logic errors
4. **Test Error Scenarios**: Ensure your API handles all common Prisma error scenarios

## Integration with Existing Controllers

The filters work seamlessly with existing controllers. Simply remove manual try/catch blocks for Prisma operations:

```typescript
// Before
async update(id: string, updateDto: UpdateDto) {
  try {
    return await this.service.update(id, updateDto);
  } catch (error) {
    if (error.code === 'P2025') {
      throw new NotFoundException('Record not found');
    }
    throw error;
  }
}

// After
async update(id: string, updateDto: UpdateDto) {
  // Prisma errors are automatically handled by the filters
  return await this.service.update(id, updateDto);
}
```
