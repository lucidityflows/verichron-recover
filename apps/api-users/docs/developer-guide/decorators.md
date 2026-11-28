# Decorators

This document provides an overview of the custom decorators used in the `api-users` service. These decorators are fundamental to our authentication, authorization, and request handling strategies.

---

## `@Public()`

- **Purpose:** To exempt an endpoint from the default global authentication requirement.
- **What it Does:** Attaches metadata (`isPublic: true`) to a route handler. The `JwtAuthGuard` reads this metadata and, if present, allows the request to proceed without a valid JWT.
- **What it Doesn't Do:** It does not apply any other security measures like rate limiting. It simply bypasses the JWT authentication check.
- **Primary Consumer:** `JwtAuthGuard`
- **Usage Example:** Used for endpoints that must be accessible to unauthenticated users, such as login, registration, or public health checks.

```typescript
// In auth.controller.ts
@Public()
@Post('login')
handleLogin(@Body() loginDto: LoginDto) {
  // ...
}
```

---

## `@Permissions(...permissions: string[])`

- **Purpose:** To enforce fine-grained, permission-based access control on a specific endpoint.
- **What it Does:** Attaches a list of required permission strings as metadata (e.g., `permissions: ['user:create', 'user:read']`) to a route. The `PermissionsGuard` then validates that the authenticated user's JWT contains all of the specified permissions.
- **What it Doesn't Do:** It does not grant permissions to a user. It only declares the permissions *required* for that endpoint. The user must already have the permissions assigned to them.
- **Primary Consumer:** `PermissionsGuard`
- **Usage Example:** Used on almost every protected endpoint to ensure the user has the authority to perform the requested action.

```typescript
// In rbac.controller.ts
@Post('roles')
@Permissions('role:create')
createRole(@Body() createRoleDto: CreateRoleDto) {
  // ...
}
```

---

## `@OrganizationId()`

- **Purpose:** To provide convenient and safe access to the current user's validated organization ID from within a route handler.
- **What it Does:** A parameter decorator that extracts the `organizationId` from the user's JWT claims (`request.user[JWT_CLAIMS_NAMESPACE].organizationId`). It guarantees that the value is a non-empty string, throwing an `InternalServerErrorException` if the organization context is missing from the token. This prevents null/undefined checks in every controller method.
- **What it Doesn't Do:** It does not perform any validation against the request body or params. That is the job of the `OrgContextGuard`. This decorator is purely an accessor for data that the `OrgContextGuard` has already validated.
- **Primary Consumer:** Controller methods.
- **Usage Example:** Used in any controller method that needs to operate within the context of a user's organization.

```typescript
// In profiles.controller.ts
@Get()
@Permissions('user:read')
getUsers(@OrganizationId() organizationId: string) {
  return this.profilesService.getUsersInOrganization(organizationId);
}
```

---

## `@CurrentUserId()`

- **Purpose:** To provide convenient access to the unique ID (`sub` claim) of the currently authenticated user.
- **What it Does:** A parameter decorator that extracts the user ID from the `request.user` object, which was populated by the `JwtAuthGuard`. It intelligently checks `request.user.userId`, `request.user.id`, and `request.user.sub` to find the ID.
- **What it Doesn't Do:** It does not validate the user's existence in the database; it only extracts the ID from the validated JWT.
- **Primary Consumer:** Controller methods.
- **Usage Example:** Useful for operations that are specific to the user making the request, such as updating their own profile.

```typescript
// In profiles.controller.ts
@Patch('me')
@Permissions('user:update')
updateCurrentUser(
  @CurrentUserId() currentUserId: string,
  @Body() updateDto: UpdateUserDto,
) {
  return this.profilesService.updateUser(currentUserId, updateDto);
}
```

---

## `@SkipOrgContext()`

- **Purpose:** To exempt an endpoint from the standard organization context validation, typically for platform-level administrative tasks.
- **What it Does:** Attaches metadata (`skipOrgContext: true`) to a route. The `OrgContextGuard` reads this metadata and, if present, bypasses its logic. This is essential for platform admins who do not operate within a single organization and need to perform system-wide actions.
- **What it Doesn't Do:** It does not bypass authentication (`JwtAuthGuard`) or permission checks (`PermissionsGuard`). It *only* affects the `OrgContextGuard`.
- **Primary Consumer:** `OrgContextGuard`
- **Usage Example:** While not currently used in the application, it is designed for future platform-level features.

```typescript
// Hypothetical example for a future platform admin feature
@Get('platform/users')
@SkipOrgContext()
@Permissions('platform:users:read')
listAllUsersInSystem() {
  // ... logic to fetch all users across all organizations
}
```
