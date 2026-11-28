# Guard Architecture: Authentication & Authorization

This document outlines the layered security pipeline implemented using NestJS Guards. These guards form the foundation of our application's defense-in-depth strategy, enforcing authentication and authorization policies at the API boundary.

## 1. The Global Security Pipeline

The three primary guards (`JwtAuthGuard`, `OrgContextGuard`, and `PermissionsGuard`) are registered globally and execute in a specific, critical order on every protected endpoint:

1.  **`JwtAuthGuard`**: Runs first. Answers the question: *"Is this user authenticated and is their token valid?"*
    -   It validates the JWT and populates `request.user`.

2.  **`OrgContextGuard`**: Runs second. Answers the question: *"Is this user allowed to operate within the requested organization or context?"*
    -   It uses `request.user` to validate organization/context access and establishes a consistent `request.activeContext`.

3.  **`PermissionsGuard`**: Runs last. Answers the question: *"Does this user have the specific permissions required for this action?"*
    -   It uses `request.activeContext` to check for fine-grained permissions.

If a request fails at any layer, the pipeline is halted, and an appropriate error (e.g., `401 Unauthorized` or `403 Forbidden`) is returned.

## 2. Guard Implementations

### 2.1. `JwtAuthGuard`

-   **Purpose:** To handle primary JWT authentication for the entire application. It verifies the token's authenticity and expiration.
-   **How it Works:**
    -   As the first global guard, it intercepts all incoming requests.
    -   It checks for the `@Public()` decorator on the route handler. If found, it immediately allows the request to proceed without a JWT.
    -   If the route is not public, it uses the `JwtStrategy` (from Passport.js) to validate the JWT provided in the `Authorization: Bearer ...` header.
    -   Upon successful validation, it attaches the decoded JWT payload to the `request.user` object for use by subsequent guards and services.
    -   If the token is missing, invalid, or expired, it throws a `401 Unauthorized` exception.
-   **Dependencies:** Relies on the `@Public()` decorator to bypass authentication for public endpoints.

### 2.2. `OrgContextGuard`

-   **Purpose:** To enforce organization-level data isolation and to establish a consistent, validated `activeContext` for each request. This is crucial for multi-tenancy.
-   **How it Works:**
    -   Runs immediately after `JwtAuthGuard`.
    -   It first checks for the `@SkipOrgContext()` decorator. If found, it bypasses its validation logic, allowing platform-level operations (e.g., creating a new organization when no context exists yet).
    -   It inspects the `userType` from `request.user`.
        -   If `PLATFORM_ADMIN`, it grants access and populates `request.activeContext` with platform-level roles and permissions, bypassing organization-specific checks.
        -   If `ORGANIZATION_USER`, it compares their `organizationId` from the JWT against the organization being requested (found in the `x-org-id` HTTP header, route parameters like `:orgId`, or the request body).
        -   If `DEBTOR`, it populates `request.activeContext` with the debtor's multi-organization context.
    -   If the organization IDs **do not** match for `ORGANIZATION_USER`s, it throws a `403 Forbidden` exception to prevent cross-tenant data access.
    -   It attaches the validated context to `request.activeContext` for easy access in controllers and services.
-   **Dependencies:** Relies on `request.user` (populated by `JwtAuthGuard`) and the `@SkipOrgContext()` decorator.

### 2.3. `PermissionsGuard`

-   **Purpose:** To perform fine-grained, role-based access control (RBAC) by checking for specific permissions required for a route.
-   **How it Works:**
    -   Runs after `OrgContextGuard` has established a trusted `activeContext`.
    -   It reads the list of required permissions from the `@Permissions(...)` decorator applied to the route handler.
    -   It compares this list against the permissions present in `request.activeContext.permissions` (or `request.activeContext.debtorPermissions` for DEBTOR users).
    -   If the user possesses all the required permissions, the request is allowed to proceed to the controller.
    -   If any permission is missing, it throws a `403 Forbidden` exception.
-   **Dependencies:** Relies on `request.activeContext` (populated by `OrgContextGuard`) and the `@Permissions()` decorator.

### 2.4. `AuthContextTokenGuard`

-   **Purpose:** To handle a special, single-use "Authentication Context Token" (ACT). This is a specialized guard used for sensitive, one-time actions like completing a password reset or the second step of a two-step login.
-   **How it Works:**
    -   This guard is **not** global. It is applied manually to specific routes using `@UseGuards(AuthContextTokenGuard)`.
    -   It uses a dedicated Passport.js strategy (`ActStrategy`) to validate the temporary ACT (typically sent via `HttpOnly` cookie).
    -   After basic validation, it performs a critical security check: it uses a Redis cache to verify that the token's unique identifier (`jti`) has not been used before, preventing replay attacks.
    -   If the token is valid and unused, it allows the request to proceed and implicitly marks the token as used (by storing its `jti` in Redis with a short TTL).
-   **Dependencies:** `RedisService`, `ActStrategy`.
-   **Usage Example:** Protected endpoints for exchanging an ACT for a full JWT (e.g., `POST /auth/token`).
