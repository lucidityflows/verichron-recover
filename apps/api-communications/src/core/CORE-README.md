# `core` Module

## 1. Overview

The `core` module is a foundational, global module within the `api-communications` microservice. It provides essential, cross-cutting services and infrastructure for the entire application, including authentication, authorization, request-scoped context management, logging, and global exception handling.

As a module marked `@Global()`, its exported providers (like `RequestContext`) are available for injection in any other module across the application without needing to be explicitly imported, promoting a clean and DRY (Don't Repeat Yourself) architecture.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Authentication and Authorization:** It owns the complete authentication and authorization pipeline. This includes a dual-strategy guard that handles both external user JWTs and internal service-to-service HMAC authentication, as well as guards for enforcing role- and permission-based access control.
-   **Request Context:** It owns the request-scoped `RequestContext` service, which acts as an injectable container for user and organization details, and the interceptor responsible for populating it.
-   **Global Infrastructure:** It provides application-wide infrastructure like the `AllExceptionsFilter` for consistent error responses, the `LoggingInterceptor` for HTTP request logging, and custom parameter decorators for convenient access to user and organization IDs in controllers.

### What This Module Does NOT Own

-   **Business Logic:** The `core` module is entirely agnostic to the application's business domain. It has no knowledge of communications, templates, or compliance rules.
-   **Database Entities:** It is a stateless module that does not define or interact with any database entities.
-   **API Endpoints:** It does not define any business-related API endpoints but provides the security framework upon which those endpoints are built.

---

## 3. Key Components & Patterns

### 3.1. Guards (Authentication & Authorization)

The guards are the heart of the security framework and are executed in sequence.

-   **`JwtAuthGuard`:** The primary authentication guard. It first checks for HMAC headers for internal service-to-service calls. If they are not present, it falls back to standard JWT validation for external users.
-   **`OrgContextGuard`:** This guard runs after authentication to establish the organization-level context. It reads the `x-org-id` header and uses it as a key to look up the user's specific roles and permissions for that organization from the `orgRoles` and `orgPermissions` maps within the JWT payload. It then attaches an `activeContext` object to the request.
-   **`RoleGuard`:** This guard consumes the `activeContext` set by `OrgContextGuard` and verifies that the user has at least one of the roles specified in an endpoint's `@Role()` decorator.
-   **`PermissionsGuard`:** This guard checks if the user's permissions, read directly from the JWT claims namespace, satisfy **all** permissions specified in an endpoint's `@Permissions()` decorator.

### 3.2. Services, Interceptors, and Pipes

-   **`RequestContext` Service:** A request-scoped service that provides a clean, injectable way to access the current user's information (`userId`, `orgId`, `roles`, etc.) from anywhere in the application, avoiding the need to pass the `request` object down through multiple layers.
-   **`RequestContextInterceptor`:** Runs after the guards. It populates the `RequestContext` service with the `user` and `activeContext` data that was attached to the `request` object during the guard execution phase.
-   **`LoggingInterceptor`:** A global interceptor that logs key details about every incoming HTTP request and its response, including the method, URL, status code, and duration.
-   **`AllExceptionsFilter`:** A global filter that catches all unhandled exceptions and formats them into a standardized JSON error response, ensuring consistency for API clients.
-   **`ValidationPipe`:** A global pipe that automatically validates all incoming DTOs against their `class-validator` decorators.

### 3.3. Custom Decorators

-   **`@OrganizationId()`:** A custom parameter decorator for use in controller methods. It provides a convenient shortcut to inject the user's primary `organizationId` directly from the JWT claims.
-   **`@CurrentUserId()`:** A custom parameter decorator that injects the user's ID (`sub` claim) directly into a controller method parameter.
-   **Other Decorators:** `@Public()`, `@Role()`, `@Permissions()`, and `@SkipOrgContext()` are used to attach metadata to endpoints, declaring their specific security requirements for the guards to consume.

---

## 4. Authentication & Authorization Flow

For a typical protected endpoint, a request goes through the following sequence:

1.  **`JwtAuthGuard`:** Authenticates the request via HMAC (for services) or JWT (for users). A successful JWT validation attaches the full user payload to the `request` object.
2.  **`OrgContextGuard`:** Reads the `x-org-id` header. It then looks up the roles and permissions for that specific organization from the user's claims and attaches them to the request as `request.activeContext`.
3.  **`RoleGuard` / `PermissionsGuard`:** These guards run, checking the `activeContext` or JWT claims against the metadata from the `@Role()` and `@Permissions()` decorators, throwing a `403 Forbidden` if requirements are not met.
4.  **`RequestContextInterceptor`:** Takes the validated user and context data from the request and populates the injectable `RequestContext` service.
5.  **Controller Execution:** The request reaches the controller, and any downstream service can now inject `RequestContext` to securely access user and organization information.

---

## 5. Dependencies & Integrations

### External Dependencies

-   **`@nestjs/passport`, `passport-jwt`:** Used to implement the JWT authentication strategy.
-   **`@verichron/security`:** Provides the `HmacSigner` for secure internal service-to-service authentication.
-   **`@verichron/contracts`:** Provides shared types like `JWTPayload`.
-   **`@verichron/error-handling`:** Provides the `BaseException` class used by the `AllExceptionsFilter`.
-   **`class-validator` / `class-transformer`:** Used by the global `ValidationPipe` for DTO validation.

---

## 6. Gaps & Future Work

-   **In-Memory Nonce Cache:** The `JwtAuthGuard` uses an in-memory `Set` for HMAC nonce validation, which is not suitable for a multi-instance, scaled deployment. A `TODO` in the code indicates this should be replaced with a distributed cache like Redis.
-   **Inconsistent Guard Data Sourcing:** The `RoleGuard` and `PermissionsGuard` source their data differently. `RoleGuard` uses the `activeContext` created by `OrgContextGuard`, while `PermissionsGuard` reads directly from the raw JWT claims. While functional, this could be harmonized to have all authorization guards consistently use the `activeContext` for clarity.
