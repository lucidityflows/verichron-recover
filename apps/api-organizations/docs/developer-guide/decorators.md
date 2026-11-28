# Decorators

This document provides an overview of the custom decorators used in the `api-organizations` service. These decorators are fundamental to our authentication, authorization, and request handling strategies.

---

## `@Public()`

- **Purpose:** To exempt an endpoint from the default global authentication requirement.
- **What it Does:** Attaches metadata (`isPublic: true`) to a route handler. The `JwtAuthGuard` reads this metadata and, if present, allows the request to proceed without a valid JWT.
- **What it Doesn't Do:** It does not apply any other security, like rate limiting. It simply bypasses the JWT guard.
- **Primary Consumer:** `JwtAuthGuard`
- **Usage Example:** Used for endpoints that must be accessible to unauthenticated users, such as health checks or service-to-service communication.

```typescript
// In app.controller.ts
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

---

## `@Permissions(...permissions: string[])`

- **Purpose:** To enforce fine-grained, permission-based access control on a specific endpoint.
- **What it Does:** Attaches a list of required permission strings as metadata (e.g., `permissions: ['orgs:create']`) to a route. The `PermissionsGuard` then validates that the authenticated user's JWT contains all of the specified permissions.
- **What it Doesn't Do:** It does not grant permissions to a user. It only declares the permissions *required* for that endpoint. The user must already have the permissions assigned to them.
- **Primary Consumer:** `PermissionsGuard`
- **Usage Example:** Used on protected endpoints to ensure the user has the authority to perform the requested action.

```typescript
// In profiles.controller.ts
@Post()
@Permissions(PLATFORM_PERMISSIONS.ORGS_CREATE)
createOrganization(@Body() createOrganizationDto: CreateOrganizationDto) {
  // ...
}
```

---

## `@Roles(...roles: OrganizationRole[])`

- **Purpose:** To enforce role-based access control (RBAC) for organization-level roles on a specific endpoint.
- **What it Does:** Attaches a list of required organization roles as metadata (e.g., `roles: [OrganizationRole.ORG_ADMIN]`) to a route. The `RoleGuard` then validates that the authenticated user has at least one of the specified roles within their active organization context.
- **What it Doesn't Do:** It does not grant roles. It only declares the roles *required*. It uses OR logic (user needs *any* of the listed roles).
- **Primary Consumer:** `RoleGuard`
- **Usage Example:** Used on endpoints where access is determined by a user's organizational role.

```typescript
// In profiles.controller.ts
@Patch(':orgId')
@Roles(OrganizationRole.ORG_ADMIN)
updateOrganization(@Param('orgId') orgId: string, @Body() updateDto: UpdateOrganizationDto) {
  // ...
}
```

---

## `@PlatformRoles(...roles: PlatformRole[])`

- **Purpose:** To enforce role-based access control (RBAC) for platform-level roles on a specific endpoint.
- **What it Does:** Attaches a list of required platform roles as metadata (e.g., `platformRoles: [PlatformRole.PLATFORM_ADMIN]`) to a route. The `RoleGuard` then validates that the authenticated user has at least one of the specified platform roles.
- **What it Doesn't Do:** Similar to `@Roles`, it does not grant roles, only declares requirements. It uses OR logic.
- **Primary Consumer:** `RoleGuard`
- **Usage Example:** Intended for platform-level administrative endpoints that are not yet implemented.

```typescript
// Example from decorator definition (not currently used in controllers)
// @PlatformRoles(PlatformRole.PLATFORM_ADMIN)
// @Post('/onboarding')
// async provisionOrganization(...) { }
```

---

## `@SkipOrgContext()`

- **Purpose:** To exempt an endpoint from the standard organization context validation, typically for platform-level administrative tasks or endpoints that operate outside a specific organization's scope.
- **What it Does:** Attaches metadata (`skipOrgContext: true`) to a route. The `OrgContextGuard` reads this metadata and, if present, bypasses its organization validation logic.
- **What it Doesn't Do:** It does not bypass authentication (`JwtAuthGuard`) or general permission checks (`PermissionsGuard`). It *only* affects the `OrgContextGuard`.
- **Primary Consumer:** `OrgContextGuard`
- **Usage Example:** Currently, this decorator is defined but not actively applied to any controller endpoints. It is intended for future platform-level features that need to operate without an organization context.

```typescript
// Example from decorator definition (not currently used in controllers)
// @Post('onboarding')
// @SkipOrgContext()
// @Permissions(PLATFORM_PERMISSIONS.ORGS_CREATE)
// async provisionOrganization(@Body() dto: ProvisionOrganizationDto) {
//   return this.onboardingService.provisionOrganization(dto);
// }
```

---

## `@OrganizationId()`

- **Purpose:** To provide convenient and safe access to the current user's validated organization ID from within a route handler.
- **What it Does:** A parameter decorator that extracts the `organizationId` from the user's JWT claims (`request.user[JWT_CLAIMS_NAMESPACE].organizationId`). It guarantees that the value is a non-empty string, throwing an `InternalServerErrorException` if the organization context is missing from the token. This prevents null/undefined checks in every controller method.
- **What it Doesn't Do:** It does not perform any validation against the request body or params. That is the job of the `OrgContextGuard`. This decorator is purely an accessor for data that the `OrgContextGuard` has already validated.
- **Primary Consumer:** Controller methods.
- **Usage Example:** Currently, this decorator is defined but not actively applied to any controller endpoints. Its absence in active use suggests a potential gap in how organization IDs are being extracted and used in controllers, or that a different mechanism is being used.

```typescript
// Example of intended usage (not currently used in controllers)
// @Get(':orgId/users')
// @Permissions('users:read')
// findUsersInOrg(@OrganizationId() organizationId: string) {
//   // ...
// }
```

---

## `@CurrentUserId()`

- **Purpose:** To provide convenient access to the unique ID (`sub` claim) of the currently authenticated user.
- **What it Does:** A parameter decorator that extracts the user ID from the `request.user` object, which was populated by the `JwtAuthGuard`. It intelligently checks `request.user.userId`, `request.user.id`, and `request.user.sub` to find the ID.
- **What it Doesn't Do:** It does not validate the user's existence in the database; it only extracts the ID from the validated token.
- **Primary Consumer:** Controller methods.
- **Usage Example:** Useful for operations that are specific to the user making the request, such as updating their own settings.

```typescript
// In settings.controller.ts
@Patch('me')
updateMySettings(
  @CurrentUserId() currentUserId: string,
  @Body() updateDto: UpdateUserSettingsDto,
) {
  // ...
}
```
