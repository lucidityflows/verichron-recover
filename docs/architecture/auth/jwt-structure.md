# JWT Structure: Authentication & Authorization

This document provides a detailed breakdown of the JSON Web Token (JWT) structure used within the Verichron platform, focusing on both standard claims and our custom application-specific claims.

## 1. JWT Payload Format

Our JWTs follow a standard structure with additional custom claims designed for our multi-tenant, RBAC system.

```typescript
interface JWTPayload {
  // Standard JWT claims
  sub: string;                    // User ID (Subject)
  iat: number;                    // Issued at (Unix timestamp)
  exp: number;                    // Expiration (Unix timestamp)

  // Verichron custom claims
  userType: UserType;             // PLATFORM_USER | ORG_USER | DEBTOR_USER. Crucial for differentiating authorization flows.

  // Custom claims namespace to prevent collisions with standard JWT claims
  [JWT_CLAIMS_NAMESPACE]: CustomJWTClaims;
}

const JWT_CLAIMS_NAMESPACE = "https://verichroninc.com/claims"; // A unique URI for our custom claims

interface CustomJWTClaims {
  // --- Common to all User Types ---
  // The primary identifier for the current organization context.
  // This is null for PLATFORM_USERs.
  organizationId?: string | null;

  // --- Platform User Specific Fields (present when userType is PLATFORM_USER) ---
  platformRoles?: PlatformRole[];
  platformPermissions?: PlatformPermission[];

  // --- Organization User Specific Fields (present when userType is ORG_USER) ---
  roles?: OrganizationRole[];
  permissions?: OrganizationPermission[];

  // --- Debtor Specific Fields (present when userType is DEBTOR_USER) ---
  organizationIds?: string[];     // Array of organization UUIDs the debtor is linked to.
  debtorPermissions?: string[];   // Self-scoped permissions for debtor actions (e.g., 'debtor:self:read').
  isDebtor?: boolean;             // Flag to explicitly identify a debtor user.
}
```

## 2. Examples of JWT Claims

### 2.1. Platform User JWT Claims

Platform User tokens reflect system-level access and do not have a specific `organizationId`.

```json
{
  "sub": "platform-admin-uuid",
  "userType": "PLATFORM_USER",
  "iat": 1678886400,
  "exp": 1678887300,
  "https://verichroninc.com/claims": {
    "organizationId": null, // Indicates platform-level context
    "platformRoles": ["PLATFORM_ADMIN"],
    "platformPermissions": [
      "platform:orgs:create",
      "platform:orgs:read",
      "platform:users:manage"
    ]
  }
}
```

### 2.2. Organization User JWT Claims

Organization User tokens are scoped to a single organization (`organizationId`) and contain organization-specific roles and permissions.

```json
{
  "sub": "user-uuid",
  "userType": "ORG_USER",
  "iat": 1678886400,
  "exp": 1678887300,
  "https://verichroninc.com/claims": {
    "organizationId": "org-uuid-123",
    "roles": ["ORG_ADMIN", "ORG_MANAGER"],
    "permissions": [
      "orgs:read",
      "debtors:read",
      "goals:read"
    ]
  }
}
```

### 2.3. Debtor User JWT Claims

Debtor User tokens are designed for multi-organization access to their own data. They include an array of `organizationIds` and `debtorPermissions`.

```json
{
  "sub": "debtor-user-uuid",
  "userType": "DEBTOR_USER",
  "iat": 1678886400,
  "exp": 1678887300,
  "https://verichroninc.com/claims": {
    "organizationIds": ["org-uuid-1", "org-uuid-2", "org-uuid-3"], // Array for multi-org access
    "debtorPermissions": ["debtor:self:read", "debtor:self:pay"], // Self-scoped permissions
    "isDebtor": true // Explicit flag for debtor users
  }
}
```

## 3. Active Context Type

The `OrgContextGuard` populates `request.activeContext` as a **discriminated union** in NestJS, ensuring type-safe access to context information downstream.

```typescript
type ActiveContext = PlatformUserContext | OrganizationUserContext | DebtorUserContext;

interface PlatformUserContext {
  type: 'PLATFORM_USER';              // Discriminator for type narrowing
  orgId: null;
  roles: PlatformRole[];
  permissions: PlatformPermission[];
}

interface OrganizationUserContext {
  type: 'ORG_USER';           // Discriminator
  orgId: string;
  roles: OrganizationRole[];
  permissions: OrganizationPermission[];
}

interface DebtorUserContext {
  type: 'DEBTOR_USER';                      // Discriminator
  orgId: null;                         // Debtors don't operate within a *single* org context for access
  organizationIds: string[];           // All orgs the debtor is associated with
  permissions: string[];               // Consolidates debtorPermissions for PermissionsGuard
  isDebtor: true;
}
```

**TypeScript Narrowing Example**:
```typescript
if (request.activeContext.type === 'PLATFORM_USER') {
  // TypeScript knows this is PlatformUserContext
  const platformPerms = request.activeContext.permissions;
} else if (request.activeContext.type === 'ORG_USER') {
  // TypeScript knows this is OrganizationUserContext
  const orgId = request.activeContext.orgId;
} else {
  // TypeScript knows this is DebtorUserContext
  const debtorOrgs = request.activeContext.organizationIds;
}
```