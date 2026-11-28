# `core` Module

## 1. Overview

The `core` module is the foundational infrastructure layer for the `api-organizations` microservice. It provides a comprehensive and consistent framework for all cross-cutting concerns, including authentication, authorization, request context management, global error handling, and reusable data access utilities.

As a `@Global()` module, its exported providers are available application-wide, ensuring that all feature modules are built upon a common and robust foundation without the need for repetitive imports.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **The Security & Authorization Pipeline:** It owns the complete set of NestJS Guards (`JwtAuthGuard`, `OrgContextGuard`, `PermissionsGuard`, etc.) that secure the application's endpoints.
-   **Request Context Management:** It owns the `RequestContext` service, providing a clean, request-scoped, and injectable way to access user and organization context anywhere in the application.
-   **Global Infrastructure:** It provides application-wide utilities, including a global exception filter (`AllExceptionsFilter`), custom parameter decorators, and a library of helpers for building database queries.

### What This Module Does NOT Own

-   **Business Logic:** The `core` module is entirely agnostic to business logic. It has no knowledge of organization profiles, onboarding, or analytics.
-   **Database Entities:** It does not define or interact with any database entities.

---

## 3. Key Components & Patterns

### 3.1. Guards (Authentication & Authorization)
This module implements a multi-layered guard strategy to secure endpoints.

-   **`JwtAuthGuard`:** The entry point for authentication. It validates the JWT Bearer token on all protected routes using the `JwtStrategy`.
-   **`OrgContextGuard`:** Runs after authentication to establish the authorization context. It inspects the `userType` from the JWT and populates a `request.activeContext` object, correctly handling the distinct contexts for `PLATFORM_ADMIN` (no organization scope), `DEBTOR` (multi-organization scope), and `ORGANIZATION_USER` (single-organization scope).
-   **`PermissionsGuard`:** Performs fine-grained access control by checking if the permissions in the `activeContext` satisfy **all** permissions required by an endpoint's `@Permissions()` decorator.
-   **`RoleGuard`:** Checks if the user's roles in the `activeContext` include at least one of the roles specified in the `@Roles()` decorator.
-   **`PlatformAdminGuard`:** A specialized guard used with the `@PlatformRoles()` decorator to protect endpoints that should only be accessible to users with specific platform-level roles.

### 3.2. Services and Interceptors

-   **`RequestContext` Service:** A request-scoped injectable service that acts as a container for the current user's identity and authorization context (`userId`, `orgId`, `roles`, `permissions`). This pattern eliminates the need to pass the `request` object down through service layers, leading to cleaner, more maintainable code.
-   **`RequestContextInterceptor`:** A global interceptor that runs after the guards. It populates the `RequestContext` service with the `user` and `activeContext` data from the request object, making the context available for dependency injection.

### 3.3. Reusable Query Utilities
A key feature of this `core` module is its library of reusable data access utilities, designed to standardize and simplify database queries.

-   **`pagination.util.ts`:** Provides helpers like `executePaginatedQuery` that apply consistent pagination logic (skip, take) to a TypeORM `QueryBuilder` instance and format the results into a standard `PaginatedResponseDto`.
-   **`query-builder.util.ts`:** A collection of functions (`applySorting`, `applySearchFilter`, `applyDateRangeFilter`, etc.) that dynamically and safely append `WHERE` and `ORDER BY` clauses to a `QueryBuilder`. This reduces boilerplate code in service repositories and prevents common errors.

### 3.4. Other Core Components
-   **Decorators:** Provides a suite of decorators including `@Permissions`, `@Roles`, `@PlatformRoles`, and custom parameter decorators like `@OrganizationId()` and `@CurrentUserId()` for injecting specific context values directly into controller methods.
-   **Filters:** The `AllExceptionsFilter` is a global catch-all that ensures all errors are logged and formatted into a standardized JSON response.
-   **Pipes:** Includes a global `ValidationPipe` for DTO validation and a custom `LenientUUIDPipe` that allows for non-standard UUID formats during testing.

---

## 4. Authentication & Authorization Flow
For a typical protected endpoint in `api-organizations`, a request is processed in the following sequence:

1.  **`JwtAuthGuard`:** Validates the JWT Bearer token.
2.  **`OrgContextGuard`:** Identifies the `userType` and populates `request.activeContext` with the appropriate context (Platform, Debtor, or Organization).
3.  **`PermissionsGuard` / `RoleGuard`:** These guards check the `activeContext` against the endpoint's decorator metadata (`@Permissions`, `@Roles`).
4.  **`RequestContextInterceptor`:** Populates the injectable `RequestContext` service with the validated user and context data.
5.  **Controller Execution:** The request reaches the controller, and downstream services can now inject `RequestContext` to access user and organization information.

---

## 5. Dependencies & Integrations

### External Dependencies
-   **`@nestjs/passport` & `passport-jwt`:** Used to implement the JWT authentication strategy.
-   **`@verichron/contracts`:** Provides shared types and interfaces, such as `JWTPayload` and the various context interfaces.
-   **`@verichron/enums`:** Provides shared enums for `UserType`, permissions, and roles.
-   **`typeorm`:** The `query-builder.util` is tightly coupled with the TypeORM `QueryBuilder`.

---

## 6. Gaps & Future Work

-   **Authorization Logic:** The `OrgContextGuard` and `PermissionsGuard` contain complex logic for handling different user types and their respective claims. This logic is critical and should be accompanied by a comprehensive suite of unit tests to cover all edge cases, as seen in the test files.
-   **`updatedBy` Fields:** While not a gap in this module itself, services that use this module's `RequestContext` should be updated to leverage it for populating `updatedBy` fields in events and database records, replacing any hardcoded "system user" values.
