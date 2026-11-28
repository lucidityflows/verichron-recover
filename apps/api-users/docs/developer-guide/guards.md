# Guards

This document provides an overview of the custom guards used in the `api-users` service. These guards are the foundation of the application's security, implementing a layered defense-in-depth strategy.

---

## The Global Security Pipeline

The three primary guards (`JwtAuthGuard`, `OrgContextGuard`, and `PermissionsGuard`) are registered globally and execute in a specific, critical order on every protected endpoint:

1.  **`JwtAuthGuard`**: Runs first. Answers the question: *"Is this user authenticated?"*
    - It validates the JWT and populates `request.user`.

2.  **`OrgContextGuard`**: Runs second. Answers the question: *"Is this user allowed to operate within the requested organization?"*
    - It uses `request.user` to validate organization access and creates a consistent `request.activeContext`.

3.  **`PermissionsGuard`**: Runs last. Answers the question: *"Does this user have the specific permissions required for this action?"*
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

---

## `OrgContextGuard`

- **Purpose:** To enforce organization-level data isolation and to establish a consistent, validated `activeContext` for each request.
- **How it Works:**
    - Runs immediately after `JwtAuthGuard`.
    - It first checks for the `@SkipOrgContext()` decorator. If found, it bypasses all validation, allowing platform-level operations.
    - It inspects the `userType` from `request.user`. If the user is a `PLATFORM_ADMIN`, it grants access and populates `request.activeContext` with platform-level roles and permissions.
    - If the user is a standard `ORGANIZATION_USER`, it compares their `organizationId` from the JWT against the organization being requested (found in the `x-org-id` header, route parameters, or request body).
    - If the IDs match (or if no specific organization was requested), it populates `request.activeContext` with the user's organization-specific roles and permissions.
    - If the IDs **do not** match, it throws a `403 Forbidden` exception to prevent cross-tenant data access.
- **Dependencies:** Relies on `request.user` from `JwtAuthGuard` and the `@SkipOrgContext()` decorator.

---

## `PermissionsGuard`

- **Purpose:** To perform fine-grained, role-based access control (RBAC) by checking for specific permissions required for a route.
- **How it Works:**
    - Runs after `OrgContextGuard` has established a trusted `activeContext`.
    - It reads the list of required permissions from the `@Permissions(...)` decorator on the route handler.
    - It compares this list against the permissions present in `request.activeContext.permissions`.
    - If the user possesses all the required permissions, the request is allowed to proceed to the controller.
    - If any permission is missing, it throws a `403 Forbidden` exception.
- **Dependencies:** Relies on `request.activeContext` from `OrgContextGuard` and the `@Permissions()` decorator.

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
