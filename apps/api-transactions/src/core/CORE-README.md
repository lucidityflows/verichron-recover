# `core` Module

## 1. Overview

The `core` module is a foundational, global module within the `api-transactions` microservice. It provides the essential cross-cutting concerns required for a robust and secure application, including authentication, authorization, request-scoping, and exception handling.

As a `@Global()` module, its exported providers are available application-wide without needing to be explicitly imported into every feature module. This centralization ensures consistency and reduces boilerplate in feature development.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Authentication and Authorization:** It owns the entire authentication and authorization flow, including JWT validation for external users, HMAC signature verification for internal service-to-service calls, and the guards that enforce role- and permission-based access control.
-   **Request Context Management:** It owns the `RequestContext` service, a request-scoped provider that makes user and organization context available throughout the application without prop-drilling.
-   **Global Error Handling:** It owns the `AllExceptionsFilter`, which provides a consistent, structured error response format for all exceptions thrown within the application.
-   **Security Decorators:** It provides the decorators (`@Permissions`, `@Roles`, etc.) that controllers use to declare their security requirements.

### What This Module Does NOT Own

-   **Business Logic:** The `core` module is completely agnostic to business logic. It has no knowledge of payments, plans, or documents.
-   **Database Entities:** It does not define or interact with any database entities.
-   **Controller Endpoints:** It provides the building blocks for security but does not define any business-related API endpoints.

---

## 3. Key Components & Patterns

### 3.1. Guards (Authentication & Authorization)

The guards are executed in a specific sequence to secure endpoints.

-   **`JwtAuthGuard`:** The first line of defense. It implements a dual-authentication strategy:
    1.  **Internal HMAC Auth:** It first checks for HMAC headers (`x-verichron-service-name`, `x-verichron-signature`, etc.). If present, it verifies the signature to authenticate the request as a trusted internal service call.
    2.  **External JWT Auth:** If HMAC headers are not present, it falls back to validating the standard JWT Bearer token for external users (e.g., from a UI client).
-   **`OrgContextGuard`:** Runs after authentication. It establishes the organization context for the request by inspecting the user's JWT claims and the `x-org-id` header. It is responsible for creating and attaching the `activeContext` object to the request, which contains the user's validated roles and permissions for the given organization.
-   **`RoleGuard`:** A simple guard that checks if the user's roles (within `activeContext`) include at least one of the roles specified in an endpoint's `@Roles()` decorator.
-   **`PermissionsGuard`:** A fine-grained guard that ensures a user has **all** of the permissions specified in an endpoint's `@Permissions()` decorator.

### 3.2. Services & Interceptors

-   **`RequestContext` Service:** A request-scoped injectable service. It acts as a container for user and organization details (`userId`, `orgId`, `roles`, `permissions`). This eliminates the need to pass the `request` object through multiple layers of the application, leading to cleaner service method signatures.
-   **`RequestContextInterceptor`:** This interceptor runs after the guards have successfully authenticated and authorized the user. Its sole purpose is to take the user and `activeContext` objects from the `request` and populate the `RequestContext` service, making the context easily injectable anywhere in the application.

### 3.3. Filters

-   **`AllExceptionsFilter`:** A global, catch-all exception filter that ensures all errors, whether they are custom `BaseException` types, standard `HttpException`s, or unhandled system errors, are caught, logged, and formatted into a consistent JSON response structure (`{ statusCode, message, errorCode, ... }`).

### 3.4. Decorators

-   **`@Public()`:** Marks an endpoint to completely bypass all authentication and authorization guards.
-   **`@Roles(...roles: string[])`:** Specifies that a user must have at least one of the listed roles to access the endpoint.
-   **`@Permissions(...permissions: string[])`:** Specifies that a user must have *all* of the listed permissions to access the endpoint.
-   **`@SkipOrgContext()`:** Allows an endpoint to bypass the `OrgContextGuard`, useful for platform-level APIs that are not tied to a specific organization.

---

## 4. Authentication & Authorization Flow

For a typical protected endpoint, a request goes through the following sequence:

1.  **`JwtAuthGuard` Execution:**
    -   **Scenario A (Internal Call):** The guard detects HMAC headers, verifies the signature using the shared secret for the calling service, and attaches a `serviceAccount` object to the request. The flow proceeds.
    -   **Scenario B (External Call):** The guard validates the JWT Bearer token. On success, it attaches the `user` payload to the request. On failure, it throws a `401 Unauthorized`.
2.  **`OrgContextGuard` Execution:**
    -   The guard inspects the `user` payload and the `x-org-id` header to determine the correct organization context.
    -   It validates that the user has access to the requested organization.
    -   It creates and attaches an `activeContext` object to the request, containing the user's effective `orgId`, `roles`, and `permissions` for this specific request.
3.  **`RoleGuard` & `PermissionsGuard` Execution:**
    -   These guards inspect the `activeContext` on the request and compare its roles/permissions against the metadata provided by the `@Roles()` and `@Permissions()` decorators on the controller method. If the requirements are not met, a `403 Forbidden` is thrown.
4.  **`RequestContextInterceptor` Execution:**
    -   With all guards passed, this interceptor takes the `user` and `activeContext` from the request and populates the request-scoped `RequestContext` service.
5.  **Controller & Service Execution:**
    -   The request finally reaches the controller. Any downstream service can now inject `RequestContext` and reliably access user and organization information (`getUserId()`, `getOrgId()`, `hasPermission()`, etc.) without needing the `request` object.

---

## 5. Dependencies & Integrations

### External Dependencies

-   **`@nestjs/passport`, `passport-jwt`:** Used to implement the JWT authentication strategy (`JwtStrategy`).
-   **`@verichron/security`:** Provides the `HmacSigner` and associated constants for secure internal service-to-service authentication.
-   **`@verichron/contracts`:** Provides shared types and interfaces, such as `JWTPayload`, which defines the structure of the authenticated user object.
-   **`@verichron/error-handling`:** Provides the `BaseException` class, which the `AllExceptionsFilter` is designed to handle gracefully.

---

## 6. Gaps & Future Work

-   **In-Memory Nonce Cache:** The `JwtAuthGuard` uses an in-memory `Set` to store and validate nonces for HMAC-based internal authentication. As noted by a `TODO` in the code, this is not scalable and will fail in a multi-instance environment. It should be replaced with a distributed cache like Redis to ensure nonces are unique across all service instances.
