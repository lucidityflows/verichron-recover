# Error Handling Documentation

## Overview

The api-debtors microservice implements a comprehensive, production-ready error handling system with:

- **Standardized error responses** - Consistent structure across all errors
- **Appropriate HTTP status codes** - Proper status codes for different error scenarios
- **PII exclusion** - Automatic sanitization of sensitive data in error messages
- **Graceful error handling** - Global exception filter catches all errors
- **Useful error messages** - Helpful for debugging while maintaining security

## Error Response Format

All errors return a standardized JSON response:

```json
{
  "statusCode": 404,
  "message": "Debtor with ID not found",
  "error": "Not Found",
  "timestamp": "2025-10-17T22:45:30.123Z",
  "path": "/debtors/123e4567-e89b-12d3-a456-426614174000",
  "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
}
```

### Error Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `statusCode` | number | HTTP status code (400, 401, 403, 404, 409, 422, 500, etc.) |
| `message` | string \| string[] | Error message or array of validation errors |
| `error` | string | Human-readable error type (e.g., "Bad Request", "Not Found") |
| `timestamp` | string | ISO 8601 timestamp when the error occurred |
| `path` | string | Request path (sanitized to remove PII) |
| `requestId` | string | Optional correlation ID for tracing |

## HTTP Status Codes

The system uses appropriate HTTP status codes:

| Code | Error Type | Description | Example |
|------|------------|-------------|---------|
| 400 | Bad Request | Invalid request format or data | Malformed JSON |
| 401 | Unauthorized | Missing or invalid authentication | Missing JWT token |
| 403 | Forbidden | Insufficient permissions | User cannot access resource |
| 404 | Not Found | Resource not found | Debtor ID doesn't exist |
| 409 | Conflict | Resource already exists | Duplicate debtor |
| 422 | Unprocessable Entity | Validation failed | Invalid email format |
| 429 | Too Many Requests | Rate limit exceeded | Too many API calls |
| 500 | Internal Server Error | Server-side error | Database connection failed |
| 502 | Bad Gateway | Upstream service error | Dependency unavailable |
| 503 | Service Unavailable | Service temporarily down | Maintenance mode |

## PII Sanitization

The error handling system automatically **removes or masks Personally Identifiable Information (PII)** from all error responses to prevent data leakage.

### PII Fields Redacted

The following types of data are automatically redacted:

- **Personal Information**
  - Social Security Numbers (SSN)
  - Date of Birth (DOB)
  - Full names (firstName, lastName, middleName)

- **Contact Information**
  - Email addresses
  - Phone numbers
  - Physical addresses (street, city, postal code)

- **Financial Information**
  - Credit card numbers
  - Bank account numbers
  - Routing numbers
  - Income/salary data

- **Government IDs**
  - Passport numbers
  - Driver's license numbers
  - Tax IDs / EINs

### How PII Sanitization Works

1. **Field-level redaction** - Any field matching PII field names is replaced with `[REDACTED]`
2. **Pattern matching** - Regular expressions detect and mask PII in strings
3. **Path sanitization** - URL paths are sanitized to remove PII parameters
4. **Message sanitization** - Error messages are scanned for PII patterns

### Examples

**Before sanitization:**
```json
{
  "message": "Invalid email format for john.doe@example.com",
  "path": "/debtors/john.doe@example.com"
}
```

**After sanitization:**
```json
{
  "message": "Invalid email format for [REDACTED]",
  "path": "/debtors/[REDACTED]"
}
```

## Custom Exceptions

The system provides domain-specific exceptions with proper status codes:

### Not Found Exceptions (404)

- `DebtorNotFoundException` - Debtor not found by ID
- `AddressNotFoundException` - Address not found by ID
- `EmailNotFoundException` - Email not found by ID
- `PhoneNumberNotFoundException` - Phone number not found by ID
- `DemographicsNotFoundException` - Demographics data not found
- `DocumentNotFoundException` - Document not found by ID

**Usage:**
```typescript
throw new DebtorNotFoundException(debtorId);
// Returns: { statusCode: 404, message: "Debtor with ID not found", ... }
```

### Conflict Exceptions (409)

- `DebtorAlreadyExistsException` - Debtor already exists

**Usage:**
```typescript
throw new DebtorAlreadyExistsException();
// Returns: { statusCode: 409, message: "A debtor with this information already exists", ... }
```

## Validation Errors

The system automatically validates all incoming DTOs using class-validator decorators.

### Validation Error Response

Validation errors return a 400 Bad Request with an array of error messages:

```json
{
  "statusCode": 400,
  "message": [
    "firstName must be a string",
    "email must be a valid email address",
    "phoneNumber must match the pattern /^[+]?[0-9].../"
  ],
  "error": "Bad Request",
  "timestamp": "2025-10-17T22:45:30.123Z",
  "path": "/debtors"
}
```

### Validation Configuration

The global validation pipe is configured with:

- `whitelist: true` - Strip unknown properties
- `forbidNonWhitelisted: true` - Reject requests with unknown properties
- `transform: true` - Auto-transform payloads to DTO instances
- `transformOptions.enableImplicitConversion: true` - Convert primitive types
- PII sanitization applied to all validation error messages

## Global Exception Filter

The `HttpExceptionFilter` is a global filter that:

1. **Catches all exceptions** - Both HTTP exceptions and unhandled errors
2. **Formats responses** - Returns standardized `ErrorResponseDto`
3. **Sanitizes PII** - Removes sensitive data from all error responses
4. **Logs server-side** - Full error details (with stack traces) logged for debugging
5. **Hides stack traces** - Stack traces never sent to clients in production

### Server-Side Logging

Full error details (including stack traces and PII) are logged server-side for debugging:

- **500+ errors** - Logged as ERROR with full stack trace
- **400-499 errors** - Logged as WARN with details
- **Other errors** - Logged as DEBUG

**Example log entry:**
```json
{
  "timestamp": "2025-10-17T22:45:30.123Z",
  "path": "/debtors/123",
  "method": "GET",
  "statusCode": 404,
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "error": {
    "name": "DebtorNotFoundException",
    "message": "Debtor with ID 123e4567-e89b-12d3-a456-426614174000 not found",
    "stack": "Error: Debtor with ID not found\n    at ProfilesService.findOne..."
  }
}
```

## Production vs Development

### Production Mode (`NODE_ENV=production`)

- Stack traces **never** sent to clients
- Generic error messages for 500 errors
- Full logging server-side only

### Development Mode

- More detailed error messages
- Still sanitizes PII
- Still uses standardized format

## Usage Examples

### In Controllers

```typescript
import { DebtorNotFoundException } from '../common/exceptions';

async findOneDebtor(id: string): Promise<DebtorResponseDto> {
  const debtor = await this.service.findOne(id);

  if (!debtor) {
    throw new DebtorNotFoundException(id);
  }

  return debtor;
}
```

### In Services

```typescript
import { ConflictException } from '@nestjs/common';

async createDebtor(dto: CreateDebtorDto): Promise<Debtor> {
  const existing = await this.repo.findByName(dto.firstName, dto.lastName);

  if (existing) {
    throw new DebtorAlreadyExistsException();
  }

  return this.repo.save(dto);
}
```

### Swagger Documentation

All error responses are documented in Swagger:

```typescript
@ApiResponse({
  status: HttpStatus.NOT_FOUND,
  description: 'Debtor not found',
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: 'Invalid input data',
  type: ErrorResponseDto,
})
```

## File Structure

```
apps/api-debtors/src/
├── common/
│   ├── dto/
│   │   └── error-response.dto.ts          # Standardized error response format
│   ├── exceptions/
│   │   ├── debtor-not-found.exception.ts
│   │   ├── address-not-found.exception.ts
│   │   ├── email-not-found.exception.ts
│   │   ├── phone-number-not-found.exception.ts
│   │   ├── demographics-not-found.exception.ts
│   │   ├── document-not-found.exception.ts
│   │   ├── debtor-already-exists.exception.ts
│   │   └── index.ts
│   ├── filters/
│   │   ├── http-exception.filter.ts       # Global exception filter
│   │   └── index.ts
│   └── utils/
│       ├── pii-sanitizer.util.ts          # PII sanitization utilities
│       └── index.ts
└── main.ts                                # Global filter registration
```

## Testing Error Handling

### Example: Test 404 Error

```bash
curl -X GET http://localhost:3001/debtors/invalid-id
```

**Response:**
```json
{
  "statusCode": 404,
  "message": "Debtor with ID not found",
  "error": "Not Found",
  "timestamp": "2025-10-17T22:45:30.123Z",
  "path": "/debtors/invalid-id"
}
```

### Example: Test Validation Error

```bash
curl -X POST http://localhost:3001/debtors \
  -H "Content-Type: application/json" \
  -d '{"firstName": 123}'  # Invalid: firstName should be string
```

**Response:**
```json
{
  "statusCode": 400,
  "message": ["firstName must be a string"],
  "error": "Bad Request",
  "timestamp": "2025-10-17T22:45:30.123Z",
  "path": "/debtors"
}
```

## Security Considerations

1. **No PII in responses** - All sensitive data is redacted
2. **No stack traces in production** - Implementation details hidden
3. **Sanitized paths** - URL parameters are sanitized
4. **Validation messages** - PII patterns removed from validation errors
5. **Server-side logging** - Full details logged only server-side
6. **Rate limiting** - 429 errors for excessive requests (when implemented)

## Best Practices

1. **Use custom exceptions** - Use domain-specific exceptions for clarity
2. **Don't include PII in messages** - Error messages are auto-sanitized, but avoid including PII
3. **Log everything server-side** - Use the logger for debugging
4. **Document all errors in Swagger** - Add @ApiResponse for all error codes
5. **Test error scenarios** - Write tests for error handling paths
6. **Monitor error rates** - Track 4xx and 5xx errors in production

## Future Enhancements

- Request correlation IDs (distributed tracing)
- Error rate monitoring and alerting
- Custom error codes for business logic errors
- Internationalization (i18n) for error messages
- Rate limiting with retry-after headers
