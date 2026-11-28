# `core` Module

## 1. Overview

The `core` module is a foundational, cross-cutting concern module for the `api-debts` microservice. It does not contain any business-specific features but instead provides the essential building blocks for security, request handling, error handling, and application-wide standards.

As a `@Global()` module, its providers are available for dependency injection throughout the entire application without needing to import `CoreModule` into every feature module. Its primary purpose is to establish a consistent and robust request lifecycle.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Request Lifecycle Services:** Owns the `RequestContext` service, which provides a request-scoped container for user and organization information.
-   **Authorization & Authentication:** Owns the guards (`JwtAuthGuard`, `OrgContextGuard`, `PermissionsGuard`, `RoleGuard`, `InternalApiKeyGuard`) that form the multi-layered security pipeline.
-   **Decorators:** Provides the decorators (`@Permissions`, `@Roles`, `@Public`) used by controllers to declare security requirements for endpoints.
-   **Global Infrastructure:** Owns the global exception filter (`AllExceptionsFilter`), validation pipe (`ValidationPipe`), and context-populating interceptor (`RequestContextInterceptor`).
-   **Core Utilities:** Owns utility functions like `currency.util.ts` for safe financial calculations.

### What This Module Does NOT Own

-   **Business Logic:** It is completely agnostic to business rules related to debts, portfolios, or imports.
-   **API Endpoints:** It does not expose any controllers or endpoints.
-   **Entities:** It does not define or manage any database entities.

---

## 3. Key Concepts & The Request Lifecycle

This module establishes a standardized request lifecycle for every incoming request to `api-debts`. The sequence is critical for understanding how security and context are handled.

**Typical Request Flow:**

1.  **`JwtAuthGuard`:**
    -   If internal auth headers (`X-Internal-API-Key`) are present, it validates the API key.
    -   If not an internal call, it validates the `Bearer` JWT token using `JwtStrategy`.
    -   If successful, it attaches a `user` object to the request. It also handles HMAC validation for service-to-service calls.

2.  **`OrgContextGuard`:**
    -   Reads the `user` object from the request.
    -   Extracts the `organizationId` from the JWT claims.
    -   If the `x-org-id` header is present, it verifies the header's org matches the token's org.
    -   It creates an `activeContext` object containing the user's `orgId`, `roles`, and `permissions`, and attaches it to the request.

3.  **`RoleGuard` & `PermissionsGuard`:**
    -   These guards read the `activeContext` from the request.
    -   `RoleGuard` checks if the user's roles match those specified by the `@Roles()` decorator on the controller method.
    -   `PermissionsGuard` checks if the user's permissions include **all** permissions specified by the `@Permissions()` decorator.

4.  **`RequestContextInterceptor`:**
    -   This interceptor runs *after* the guards have successfully validated the request.
    -   It injects the `RequestContext` service (which is request-scoped).
    -   It populates the `RequestContext` with all the user and context information from `request.user` and `request.activeContext`.

5.  **`ValidationPipe`:**
    -   This global pipe runs on the request data (body, query, params).
    -   It uses `class-validator` and `class-transformer` to validate that the incoming data matches the DTO and to strip any non-whitelisted properties.

6.  **Controller & Service:**
    -   The request finally reaches the controller.
    -   The controller can then call its associated service.
    -   The service can safely inject `RequestContext` and call methods like `getOrgId()` or `getUserId()` to get the context for the current request, without needing the `request` object to be passed down.

---

## 4. Components

### Services

-   **`RequestContext`:** A `REQUEST`-scoped injectable service that acts as a container for the current user's identity (`userId`, `email`) and authorization context (`orgId`, `roles`, `permissions`). This is the preferred way to access user/org info within services.

### Guards

-   **`JwtAuthGuard`:** The first line of defense. Validates JWTs for external requests or HMAC signatures for internal service-to-service calls.
-   **`OrgContextGuard`:** Establishes the organization context for a request and attaches an `activeContext` object to the request for subsequent guards.
-   **`RoleGuard`:** Checks for user roles against the `@Roles()` decorator.
-   **`PermissionsGuard`:** Checks for user permissions against the `@Permissions()` decorator.
-   **`InternalApiKeyGuard`:** A specific guard for securing internal endpoints with a static API key, an alternative to the HMAC signature method in `JwtAuthGuard`.

### Decorators

-   **`@Public()`:** Marks an endpoint as public, causing all guards to be skipped.
-   **`@Roles(...roles: string[])`:** Specifies the required organization roles (e.g., `ORG_ADMIN`) for an endpoint.
-   **`@Permissions(...permissions: string[])`:** Specifies the required permissions (e.g., `debt:read`) for an endpoint.
-   **`@SkipOrgContext()`:** Allows a route to bypass the `OrgContextGuard` validation.

### Filters, Interceptors, and Pipes

-   **`AllExceptionsFilter`:** A global, catch-all filter that ensures any unhandled exception is caught and formatted into a standardized JSON error response. It also provides enhanced logging of the error and request details.
-   **`RequestContextInterceptor`:** A global interceptor that populates the `RequestContext` service.
-   **`ValidationPipe`:** A global pipe that automatically validates and transforms all incoming DTOs.

### Utilities

-   **`currency.util.ts`:** A set of helper functions (`addCurrency`, `subtractCurrency`, etc.) for performing safe decimal arithmetic on financial values by converting them to cents (integers) to avoid floating-point errors.

---

## 5. Dependencies & Integrations

-   **`@verichron/error-handling`**: The `BaseException` class is used by `AllExceptionsFilter`.
-   **`@verichron/contracts` / `@verichron/events`**: Provides shared types and interfaces like `JWTPayload`.
-   **`@verichron/enums`**: Provides shared enums for `UserType`, `OrganizationRole`, etc.
-   **`@verichron/security`**: Provides the `HmacSigner` used for internal service-to-service authentication.
-   **`@nestjs/passport` & `passport-jwt`**: Used to implement JWT authentication strategy.

---

## 6. Gaps & Future Work

-   **In-Memory Nonce Cache:** The `JwtAuthGuard` uses an in-memory `Set` to store nonces for HMAC signature validation. The code includes a `TODO` to replace this with a distributed cache like Redis. In its current state, this feature will not work correctly in a multi-instance (scaled) environment, as each instance would have its own separate nonce cache.
