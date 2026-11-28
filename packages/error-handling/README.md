@verichron/error-handling
Standardized error handling package for the Verichron monorepo. Ensures consistent error structures, secure responses, and comprehensive logging across all microservices.
Overview
The @verichron/error-handling package provides a comprehensive, centralized error handling system that ensures consistency, security, and reliability in how errors are handled, communicated to clients, and logged server-side across all Verichron microservices.
What It Provides

BaseException: A base class for all custom business exceptions
ErrorResponse Interface: A standard structure for all API error responses
GlobalHttpExceptionFilter: A NestJS filter that catches and formats all exceptions
PII Sanitization: Automatic redaction of sensitive information from responses and logs
Structured Logging: Comprehensive server-side error logging with environment-aware behavior
Validation Integration: Seamless formatting of class-validator errors

Benefits

Consistency: All services return errors in the same format
Security: Automatic PII sanitization prevents sensitive data leakage
Type Safety: TypeScript ensures correct error structure
Client-Friendly: Stable error codes enable programmatic error handling
Maintainable: Centralized error handling logic reduces duplication
Observable: Detailed server-side logging for debugging and monitoring
Production-Ready: Environment-aware behavior (development vs. production)


Quick Start
1. Installation
This package is internal to the Verichron monorepo and uses workspace dependencies:
json{
  "dependencies": {
    "@verichron/error-handling": "workspace:*"
  }
}
2. Apply the Global Filter
In your microservice's main.ts:
typescriptimport { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from '@verichron/error-handling';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply the standardized error filter
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  await app.listen(3000);
}
bootstrap();
3. Create Custom Exceptions
Create service-specific exceptions that extend BaseException:
typescript// apps/api-users/src/profiles/errors/user-not-found.exception.ts
import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@verichron/error-handling';

export class UserNotFoundException extends BaseException {
  constructor(userId: string) {
    super(
      `User with ID '${userId}' not found.`,
      HttpStatus.NOT_FOUND,
      'USERS_PROFILE_001' // Stable error code for client-side handling
    );
  }
}
4. Throw Exceptions in Your Service
typescript// apps/api-users/src/profiles/profiles.service.ts
import { Injectable } from '@nestjs/common';
import { UserNotFoundException } from './errors/user-not-found.exception';

@Injectable()
export class ProfilesService {
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });

    if (!user) {
      throw new UserNotFoundException(id);
    }

    return user;
  }
}

Core Components
BaseException
An abstract base class that all custom, domain-specific exceptions must extend. Provides:

Consistent initialization with message, statusCode, and errorCode
Seamless integration with GlobalHttpExceptionFilter
Type safety for exception handling

ErrorResponse Interface
Defines the standard JSON structure for all API error responses:
typescriptinterface ErrorResponse {
  statusCode: number;
  message: string | string[];
  errorCode: string;
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
}
GlobalHttpExceptionFilter
A NestJS global exception filter responsible for:

Catching All Exceptions: Intercepts HttpExceptions, BaseExceptions, and all other unhandled errors
Standardizing Responses: Transforms caught exceptions into the ErrorResponse format
PII Sanitization: Automatically redacts sensitive information from client responses
Logging: Provides comprehensive server-side error logging
Environment Awareness: Adapts behavior based on NODE_ENV


Error Response Format
All API errors return a standardized JSON response:
json{
  "statusCode": 404,
  "message": "User with ID '123' not found.",
  "errorCode": "USERS_PROFILE_001",
  "error": "Not Found",
  "timestamp": "2025-10-25T12:34:56.789Z",
  "path": "/users/123",
  "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
}
Field Descriptions
FieldTypeDescriptionstatusCodenumberHTTP status code (e.g., 400, 401, 403, 404, 500)messagestring | string[]Human-readable error message, or array of validation messageserrorCodestringStable, unique machine-readable code (e.g., USERS_PROFILE_001, DEBTS_002)errorstringHuman-readable HTTP status text (e.g., "Bad Request", "Not Found")timestampstringISO 8601 timestamp when the error occurredpathstringRequest path that triggered the error (sanitized to remove PII)requestIdstring(Optional) Correlation ID for distributed tracing

HTTP Status Codes
Use appropriate HTTP status codes for all error scenarios:
CodeError TypeDescription400Bad RequestInvalid request format, data, or parameters401UnauthorizedMissing or invalid authentication credentials403ForbiddenInsufficient permissions to access the resource404Not FoundThe requested resource does not exist409ConflictResource already exists or conflicting state prevents action422Unprocessable EntitySemantic validation failed (business rules)429Too Many RequestsRate limit exceeded500Internal Server ErrorA generic unhandled server-side error502Bad GatewayUpstream service error503Service UnavailableThe service is temporarily unavailable

Creating Custom Exceptions
Basic Pattern
All custom exceptions must extend BaseException:
typescriptimport { HttpStatus } from '@nestjs/common';
import { BaseException } from '@verichron/error-handling';

export class DebtorAlreadyExistsException extends BaseException {
  constructor(email: string) {
    super(
      `Debtor with email '${email}' already exists.`,
      HttpStatus.CONFLICT,
      'DEBTORS_PROFILE_002'
    );
  }
}
Constructor Parameters
typescriptconstructor(
  message: string,        // Human-readable error message
  statusCode: number,     // HTTP status code (use HttpStatus enum)
  errorCode: string       // Stable, unique machine-readable code
)
Usage in Services
typescript@Injectable()
export class DebtorsService {
  async create(createDebtorDto: CreateDebtorDto): Promise<Debtor> {
    const existing = await this.debtorRepository.findOne({
      where: { email: createDebtorDto.email }
    });

    if (existing) {
      throw new DebtorAlreadyExistsException(createDebtorDto.email);
    }

    return this.debtorRepository.save(createDebtorDto);
  }
}

Error Code Convention
Error codes must follow the convention: SERVICE_MODULE_NNN

SERVICE: Identifier for the microservice (e.g., USERS, ORGS, DEBTS, DEBTORS, COMMS, TRANSACTIONS)
MODULE: Optional identifier for the feature module within the service (e.g., AUTH, PROFILE, RBAC, ONBOARDING)
NNN: A sequential, unique number for the specific error within that module

Examples
Error CodeDescriptionServiceModuleUSERS_AUTH_001Invalid credentialsapi-usersauthUSERS_PROFILE_001User not foundapi-usersprofilesUSERS_RBAC_001Role not foundapi-usersrbacORGS_ONBOARDING_001Invalid organization typeapi-organizationsonboardingORGS_SETTINGS_002Invalid setting valueapi-organizationssettingsDEBTS_001Debt not foundapi-debts(root)DEBTS_PORTFOLIOS_003Cannot delete portfolio with active debtsapi-debtsportfoliosDEBTORS_PROFILE_001Debtor not foundapi-debtorsprofilesTRANSACTIONS_PLANS_001Payment plan already exists for debtapi-transactionsplansVALIDATION_001Generic validation error(any)(any)UNHANDLED_ERRORDefault for unexpected, unhandled exceptions(any)(any)
Benefits of Stable Error Codes

Programmatic Error Handling: Clients can handle specific errors without parsing message strings
Forward Compatibility: Error messages can change without breaking client logic
Analytics: Track error frequency by type across services
Documentation: Error codes serve as a stable contract in API documentation


Global Exception Filter Deep Dive
The Single Source of Truth
The @verichron/error-handling package provides a single, centralized GlobalHttpExceptionFilter that must be used by all Verichron microservices. This filter is the only exception handler in the platform.
⚠️ Anti-Pattern Alert: Avoid Custom Filters
Do NOT create custom HttpExceptionFilter implementations within individual microservices.
Creating service-specific exception filters (e.g., api-organizations/src/common/filters/http-exception.filter.ts) is an anti-pattern that:

Breaks Consistency: Leads to different error response formats across services
Duplicates Effort: Re-implements complex logic (PII sanitization, logging) in multiple places
Increases Maintenance: Bug fixes must be applied to every custom filter
Compromises Security: Custom filters are less rigorously tested and may leak PII
Hinders Evolution: Prevents seamless rollout of platform-wide error handling features

All Verichron microservices MUST use the GlobalHttpExceptionFilter from @verichron/error-handling.
Filter Responsibilities

Catch All Exceptions: HttpException, BaseException, generic Error, unknown exceptions
Transform to ErrorResponse: Standardize all exceptions into the ErrorResponse format
Sanitize PII: Redact sensitive information from client responses and logs
Log Server-Side: Comprehensive error logging with environment-aware verbosity
Environment Adaptation: Different behavior in development vs. production


PII Sanitization
The error handling system automatically removes or masks Personally Identifiable Information (PII) from client-facing error responses and server-side logs (in production) to prevent sensitive data leakage.
PII Fields Automatically Redacted
The following types of data are automatically redacted when detected:
Personal Information

Social Security Numbers (SSN)
Date of Birth (DOB)
Full names (firstName, lastName, middleName, fullName)

Contact Information

Email addresses
Phone numbers
Physical addresses (street1, street2, city, state, postalCode, country)
Latitude, Longitude

Financial Information

Credit card numbers
Bank account numbers
Routing numbers
Income/salary data

Government IDs

Passport numbers
Driver's license numbers
Tax IDs / EINs

How PII Sanitization Works

Field-level redaction: Any field matching known PII field names (case-insensitive) in request bodies, queries, or error details is replaced with [REDACTED]
Pattern matching: Regular expressions detect and mask PII patterns (email, phone, SSN) within string messages
Path sanitization: URL paths are analyzed, and parameters suspected of containing PII are replaced
Message sanitization: All error messages are scanned for PII patterns before being included in responses or logs

PII Sanitization Examples
Before sanitization:
json{
  "message": "Invalid email format for john.doe@example.com",
  "path": "/debtors/john.doe@example.com",
  "body": {
    "firstName": "John",
    "lastName": "Doe",
    "ssn": "123-45-6789",
    "email": "john.doe@example.com"
  }
}
After sanitization (client response):
json{
  "statusCode": 400,
  "message": "Invalid email format for [REDACTED]",
  "errorCode": "VALIDATION_001",
  "error": "Bad Request",
  "timestamp": "2025-10-25T12:34:56.789Z",
  "path": "/debtors/[REDACTED]"
}
Server-side log (production):
json{
  "timestamp": "2025-10-25T12:34:56.789Z",
  "status": 400,
  "method": "POST",
  "url": "/debtors",
  "body": "[REDACTED]",
  "exception": {
    "name": "BadRequestException",
    "message": "Invalid email format for [REDACTED]"
  }
}

Validation Errors
The system integrates with NestJS's ValidationPipe to automatically validate incoming DTOs using class-validator and class-transformer. Validation errors are caught by GlobalHttpExceptionFilter and formatted consistently.
Validation Error Response
Validation errors result in a 400 Bad Request with an array of specific error messages:
json{
  "statusCode": 400,
  "message": [
    "firstName must be a string",
    "email must be a valid email address",
    "phoneNumber must match the pattern /^[+]?[0-9]+$/"
  ],
  "errorCode": "VALIDATION_001",
  "error": "Bad Request",
  "timestamp": "2025-10-25T12:34:56.789Z",
  "path": "/debtors"
}
ValidationPipe Configuration
Configure the global ValidationPipe in your main.ts with these best practices:
typescriptimport { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,                              // Strip non-whitelisted properties
    forbidNonWhitelisted: true,                   // Throw error for non-whitelisted properties
    transform: true,                              // Auto-transform to DTO instances
    transformOptions: {
      enableImplicitConversion: true              // Auto-convert primitive types
    }
  })
);
Example DTO with Validation
typescriptimport { IsEmail, IsString, IsNotEmpty, Matches } from 'class-validator';

export class CreateDebtorDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @Matches(/^[+]?[0-9]{10,15}$/)
  phoneNumber: string;
}

Server-Side Logging
The GlobalHttpExceptionFilter performs comprehensive server-side logging of all errors. This logging is audience-specific:

Clients: Receive sanitized, consistent ErrorResponse objects
Server Logs: Contain full, detailed error information for debugging and monitoring

Server-Side Log Entry Structure
An example of a detailed server-side log entry (JSON format):
json{
  "timestamp": "2025-10-25T12:34:56.789Z",
  "status": 404,
  "method": "GET",
  "url": "/debtors/123",
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "body": {},
  "query": {},
  "params": { "id": "123" },
  "exception": {
    "name": "DebtorNotFoundException",
    "message": "Debtor with ID 123 not found",
    "stack": "Error: Debtor with ID not found\n    at ProfilesService.findOne..."
  }
}
Production vs. Development Environment
Production Mode (NODE_ENV=production)

Stack traces are never sent to clients
Generic error messages for 500-level errors ("Internal server error")
Full error details (including PII-redacted request data) logged server-side
body, query, and params in server logs are [REDACTED] to protect sensitive data

Development Mode

More detailed error messages sent to clients
Stack traces may be included in client responses (optional)
Full error details (including sensitive input data) logged server-side for debugging
No PII redaction in server logs (for easier debugging)

Log Levels

WARN (4xx errors): Client errors, expected business exceptions
ERROR (5xx errors): Server errors, unexpected exceptions, system failures


Security & Best Practices
Security Checklist

✅ No PII in Client Responses: Sensitive data is always redacted from API error responses
✅ No Stack Traces in Production: Internal error details never exposed to clients
✅ Sanitized Paths: URL parameters containing PII are masked in responses and logs
✅ Environment-Aware Logging: Production logs redact sensitive request data
✅ Stable Error Codes: Rely on errorCode for programmatic error handling, not message text

Implementation Best Practices

Use Custom Exceptions: Create domain-specific exceptions extending BaseException for clear business logic representation
Meaningful Error Codes: Follow the SERVICE_MODULE_NNN convention consistently
Descriptive Messages: Write human-readable error messages that help users understand what went wrong
Appropriate Status Codes: Use the correct HTTP status code for each error type (see table above)
Server-Side Logging: Always log full error details server-side for monitoring and debugging
Never Log Passwords: Even in development, ensure password fields are never logged


Testing Standards
Thorough testing of the error handling system ensures reliability, security, and adherence to standards.
Unit Tests for GlobalHttpExceptionFilter
Unit tests focus on verifying internal logic, response formatting, PII sanitization, and logging behavior in isolation.
Key Test Areas (using mocked ExecutionContext, Request, Response, Logger):
Response Formatting

Verify HttpException, BaseException, generic Error, and unknown errors are correctly transformed into ErrorResponse
Check statusCode, message, errorCode, error, timestamp, and path for accuracy

PII Redaction

Assert that sensitive data is [REDACTED] from message and path in client responses
Verify PII patterns (emails, SSNs, phone numbers) are masked

Logging Behavior

Spy on internal Logger to confirm:

Correct log levels (WARN for 4xx, ERROR for 5xx)
PII redaction in server-side logs in production
Full, unsanitized details in development
Stack traces only in development logs



Environment Control

Test both production (isProd = true) and development (isProd = false) scenarios

Unit Tests for Custom Exceptions
Each custom exception should have simple unit tests:
typescriptdescribe('UserNotFoundException', () => {
  it('should initialize with correct properties', () => {
    const exception = new UserNotFoundException('user-123');

    expect(exception.message).toBe("User with ID 'user-123' not found.");
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exception.errorCode).toBe('USERS_PROFILE_001');
  });
});
Integration/E2E Tests for Error Paths
Integration tests verify that API endpoints trigger expected exceptions and the GlobalHttpExceptionFilter processes them correctly.
Key Test Cases:
Validation Failures
typescriptit('should return 400 with validation errors for invalid DTO', async () => {
  const response = await request(app.getHttpServer())
    .post('/debtors')
    .send({ firstName: 123, email: 'invalid' })
    .expect(400);

  expect(response.body.message).toBeInstanceOf(Array);
  expect(response.body.errorCode).toBe('VALIDATION_001');
});
Resource Not Found
typescriptit('should return 404 for non-existent resource', async () => {
  const response = await request(app.getHttpServer())
    .get('/debtors/non-existent-id')
    .expect(404);

  expect(response.body.errorCode).toBe('DEBTORS_PROFILE_001');
  expect(response.body.message).toContain('not found');
});
Business Logic Conflicts
typescriptit('should return 409 when creating duplicate resource', async () => {
  // Create initial resource
  await request(app.getHttpServer())
    .post('/debtors')
    .send(validDebtorDto);

  // Attempt duplicate
  const response = await request(app.getHttpServer())
    .post('/debtors')
    .send(validDebtorDto)
    .expect(409);

  expect(response.body.errorCode).toBe('DEBTORS_PROFILE_002');
});
PII Redaction Verification
typescriptit('should redact PII from error responses', async () => {
  const response = await request(app.getHttpServer())
    .get('/debtors/john.doe@example.com')
    .expect(400);

  expect(response.body.path).not.toContain('john.doe@example.com');
  expect(response.body.path).toContain('[REDACTED]');
});
Authentication/Authorization
typescriptit('should return 401 for missing authentication', async () => {
  const response = await request(app.getHttpServer())
    .get('/debtors')
    .expect(401);

  expect(response.body.errorCode).toBe('USERS_AUTH_001');
});

it('should return 403 for insufficient permissions', async () => {
  const response = await request(app.getHttpServer())
    .get('/debtors')
    .set('Authorization', `Bearer ${collectorToken}`) // Collector lacks permission
    .expect(403);
});

Architecture
Package Philosophy
The @verichron/error-handling package embodies separation of concerns:
Shared Package Responsibilities

Defines what errors look like (structure, format)
Defines how errors are handled (filter logic, sanitization, logging)
Provides reusable infrastructure (BaseException, GlobalHttpExceptionFilter)

Service-Specific Responsibilities

Defines why errors occur (business logic)
Creates concrete exception classes for domain-specific errors
Throws exceptions when business rules are violated

Design Principles

Single Source of Truth: One filter, one response format, one package
Convention Over Configuration: Minimal setup required per service
Security by Default: PII sanitization and production safeguards built-in
Environment Awareness: Automatic adaptation to dev vs. prod environments
Extensibility: Easy to create custom exceptions for new business logic
Type Safety: Full TypeScript support ensures correctness at compile time

Integration Points

NestJS Exception Filters: Leverages framework's exception handling layer
class-validator: Seamlessly formats validation errors
Logger: Structured server-side logging (ready for integration with observability tools)
Request/Response: Extracts context for error responses and logs


Future Enhancements
Planned Features

Structured Logging Integration: Direct integration with structured logging libraries (Winston, Pino)
Distributed Tracing: Automatic requestId generation and propagation
Error Code Registry: Auto-generated documentation of all error codes across services
Enhanced Validation Errors: Field-level error details with validation rules
Internationalization: Multi-language error messages based on Accept-Language header
Error Rate Monitoring: Hooks for real-time error rate tracking and alerting
Retry-After Headers: Automatic inclusion for rate limiting and service unavailability

Contributing
When adding new features to this package:

Ensure backward compatibility with existing custom exceptions
Add comprehensive unit tests for new functionality
Update this README with new features and examples
Consider impact on all microservices in the monorepo
Follow the existing code style and conventions


Summary
The @verichron/error-handling package is the foundation of error handling across the Verichron platform. By using this package consistently:

Developers get a simple, predictable way to handle errors
Clients receive consistent, secure, parseable error responses
Operations get comprehensive logging for debugging and monitoring
Security is enhanced through automatic PII sanitization
Maintenance is simplified through centralized error handling logic

Always extend BaseException for custom exceptions, always use GlobalHttpExceptionFilter, and always follow the error code convention. This discipline ensures the platform remains maintainable, secure, and user-friendly as it scales.