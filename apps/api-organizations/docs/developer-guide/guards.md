# Guards

This document provides an overview of the custom guards used in the `api-organizations` service. These guards are the foundation of the application's security, implementing a layered defense-in-depth strategy.

---

## The Global Security Pipeline

The primary guards (`JwtAuthGuard`, `OrgContextGuard`, `RoleGuard`, and `PermissionsGuard`) are typically registered globally in `app.module.ts` and execute in a specific, critical order on every protected endpoint:

1.  **`JwtAuthGuard`**: Runs first. Answers the question: *"Is this user authenticated?"*
    - It validates the JWT and populates `request.user`.

2.  **`OrgContextGuard`**: Runs second. Answers the question: *"Is this user allowed to operate within the requested organization?"*
    - It uses `request.user` to validate organization access and creates a consistent `request.activeContext`.

3.  **`RoleGuard`**: Runs third. Answers the question: *"Does this user have the required roles for this endpoint?"*
    - It uses `request.activeContext` to check for organization-level or platform-level roles.

4.  **`PermissionsGuard`**: Runs last. Answers the question: *"Does this user have the specific permissions required for this action?"*
    - It uses `request.activeContext` to check for fine-grained permissions.

If a request fails at any layer, the pipeline is halted, and an appropriate error (e.g., `401 Unauthorized` or `403 Forbidden`) is returned.

---

## `JwtAuthGuard`

- **Purpose:** To handle primary JWT authentication for the entire application.
- **How it Works:**
    - As the first global guard, it intercepts all incoming requests.
    - It checks for the `@Public()` decorator on the route handler. If found, it immediately allows the request to proceed.
    - If the route is not public, it uses the `JwtStrategy` (from Passport.js) to validate the JWT provided in the `Authorization: Bearer ...` header.
    - Upon successful validation, it attaches the decoded JWT payload to the `request.user` object for use by subsequent guards and services.
    - If the token is missing, invalid, or expired, it throws a `401 Unauthorized` exception.
- **Dependencies:** Relies on the `@Public()` decorator to bypass authentication.
- **Usage:** Typically registered globally in `app.module.ts`.

---

## `OrgContextGuard`

- **Purpose:** To enforce organization-level data isolation and to establish a consistent, validated `activeContext` for each request.
- **How it Works:**
    - Runs immediately after `JwtAuthGuard`.
    - It first checks for the `@SkipOrgContext()` decorator. If found, it bypasses all validation, allowing platform-level operations.
    - It inspects the `userType` from `request.user` and handles three distinct user types:
      - **PLATFORM_ADMIN**: Grants platform-wide access and populates `request.activeContext` with platform-level roles and permissions (`type: 'PLATFORM_ADMIN', orgId: null`)
      - **DEBTOR**: Grants multi-org access based on debtor's accepted invitations. Populates `request.activeContext` with `type: 'DEBTOR', userId, organizationIds[]`. Debtors can access their own data across all organizations that invited them.
      - **ORGANIZATION_USER**: Compares their `organizationId` from the JWT against the organization being requested (found in the `x-org-id` header, route parameters, or request body). If the IDs match (or if no specific organization was requested), it populates `request.activeContext` with the user's organization-specific roles and permissions (`type: 'ORGANIZATION_USER', orgId`). If the IDs **do not** match, it throws a `403 Forbidden` exception to prevent cross-tenant data access.
- **Dependencies:** Relies on `request.user` from `JwtAuthGuard` and the `@SkipOrgContext()` decorator.
- **Usage:** Typically registered globally in `app.module.ts`.

---

## `RoleGuard`

- **Purpose:** To perform role-based access control (RBAC) by checking if the authenticated user has the required organization-level or platform-level roles for an endpoint.
- **How it Works:**
    - Runs after `OrgContextGuard` has established a trusted `activeContext`.
    - It reads the required roles from the `@Roles(...)` or `@PlatformRoles(...)` decorators on the route handler.
    - It checks if the user possesses *at least one* of the required roles from `request.activeContext.roles` (for organization roles) or `request.activeContext.platformRoles` (for platform roles).
    - If the user has at least one matching role, the request is allowed to proceed.
    - If no matching roles are found, it throws a `403 Forbidden` exception.
- **Dependencies:** Relies on `request.activeContext` from `OrgContextGuard` and the `@Roles()`, `@PlatformRoles()` decorators.
- **Usage:** Typically registered globally in `app.module.ts`.

---

## `PermissionsGuard`

- **Purpose:** To perform fine-grained permission checking for a specific route.
- **How it Works:**
    - Runs after `RoleGuard` (or `OrgContextGuard` if `RoleGuard` is not present) has established a trusted `activeContext`.
    - It reads the list of required permissions from the `@Permissions(...)` decorator on the route handler.
    - It compares this list against the permissions present in `request.activeContext.permissions`.
    - If the user possesses *all* the required permissions, the request is allowed to proceed to the controller.
    - If any permission is missing, it throws a `403 Forbidden` exception.
- **Dependencies:** Relies on `request.activeContext` from `OrgContextGuard` and the `@Permissions()` decorator.
- **Usage:** Typically registered globally in `app.module.ts`, but can also be applied at the controller or method level using `@UseGuards(PermissionsGuard)` for specific overrides.

---

## `AuthContextTokenGuard`

- **Purpose:** To handle a special, single-use "Authentication Context Token" (ACT). This is a special-purpose guard for actions that require a fresh, one-time verification, such as completing a password reset.
- **How it Works:**
    - This guard is **not** global. It is applied manually to specific routes using `@UseGuards(AuthContextTokenGuard)`.
    - It uses a dedicated Passport.js strategy (`ActStrategy`) to validate the special token.
    - After basic validation, it performs a critical security check: it uses the `RedisService` to verify that the token's unique identifier (`jti`) has not been used before.
    - If the token has already been used, it throws a `403 Forbidden` exception to prevent replay attacks.
    - If the token is valid and has not been used, it allows the request to proceed and implicitly marks the token as used (by storing it in Redis).
- **Dependencies:** `RedisService`, `ActStrategy`.
- **Usage Example:**

```typescript
// In auth.controller.ts
@Post('reset-password/complete')
@UseGuards(AuthContextTokenGuard)
completePasswordReset(@Body() dto: CompletePasswordResetDto) {
  // This code only runs if the single-use token is valid
}
```
