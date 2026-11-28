# Role-Based Access Control (RBAC) - api-organizations

## Overview

The api-organizations service implements a comprehensive RBAC system with two levels of authorization:
1. **Platform-level roles**: Cross-organization administrative access
2. **Organization-level roles**: Within-organization access control

## Authorization Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Request with JWT + x-org-id header                          │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ 1. JwtAuthGuard                                               │
│    - Validates JWT token                                      │
│    - Extracts user payload (sub, username, email, orgRoles)   │
│    - Populates request.user                                   │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ 2. OrgContextGuard (if x-org-id header present)              │
│    - Validates user has access to requested organization      │
│    - Populates request.activeContext with:                    │
│      • orgId                                                  │
│      • roles (user's roles in that org)                       │
│      • permissions (user's permissions in that org)           │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ 3. RoleGuard (checks @Roles() decorator)                      │
│    - Validates user has required organization role            │
│    - Checks request.activeContext.roles                       │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ 4. PermissionsGuard (checks @Permissions() decorator)         │
│    - Validates user has required permissions                  │
│    - Checks request.activeContext.permissions                 │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ 5. PlatformAdminGuard (for platform-level operations)         │
│    - Checks @PlatformRoles() decorator                        │
│    - Validates request.user.platformRoles                     │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
            Controller
```

---

## Platform-Level Roles

Platform roles are assigned to users who need cross-organization access. These are checked via `request.user.platformRoles` from the JWT token.

### PLATFORM_ADMIN
**Description**: Platform super admin with god-mode access
**Use Cases**:
- Onboarding new organizations
- Managing all organizations
- Accessing any organization's data
- System-wide operations

**Example**:
```typescript
@Post('/onboarding')
@UseGuards(PlatformAdminGuard)
@PlatformRoles(PlatformRole.PLATFORM_ADMIN)
async provisionOrganization(...) { }
```

### PLATFORM_SUPPORT
**Description**: Platform support staff with read-only cross-organization access
**Use Cases**:
- Customer support queries
- Troubleshooting issues
- Viewing organization data across tenants

---

## Organization-Level Roles

Organization roles are scoped to a specific organization. These are checked via `request.activeContext.roles` (populated by OrgContextGuard from the x-org-id header).

### ORG_ADMIN
**Description**: Full administrative control over the organization
**Permissions**:
- `orgs:read`
- `orgs:write`
- `orgs:settings:read`
- `orgs:settings:write`
- `users:read`
- `users:write`
- `users:delete`
- `users:roles:assign`
- `analytics:read`

**Use Cases**:
- Managing organization settings
- Managing users and roles
- Viewing all organization data
- Deleting/archiving the organization

**Example**:
```typescript
@Delete(':orgId')
@Roles(OrganizationRole.ORG_ADMIN)
async deleteOrganization(...) { }
```

### ORG_MANAGER
**Description**: Can manage most resources but cannot modify organization settings or manage admins
**Permissions**:
- `orgs:read`
- `users:read`
- `users:write`
- `analytics:read`

**Use Cases**:
- Managing users (but not admins)
- Viewing organization data
- Running reports

**Example**:
```typescript
@Patch(':orgId')
@Roles(OrganizationRole.ORG_ADMIN, OrganizationRole.ORG_MANAGER)
async updateOrganization(...) { }
```

### ORG_AGENT
**Description**: Can view and manage assigned portfolios/debts
**Permissions**:
- `orgs:read`
- `users:read`
- `analytics:read`

**Use Cases**:
- Working on assigned debt portfolios
- Viewing organization information
- Accessing analytics

### ORG_VIEWER
**Description**: Read-only access to organization data
**Permissions**:
- `orgs:read`
- `analytics:read`

**Use Cases**:
- Auditors
- External stakeholders
- Read-only dashboards

---

## Permissions

Permissions provide fine-grained access control beyond role checks.

### Organization Permissions
| Permission | Description |
|-----------|-------------|
| `orgs:read` | View organization profile and settings |
| `orgs:write` | Update organization profile |
| `orgs:delete` | Delete/archive organization |
| `orgs:settings:read` | View organization settings |
| `orgs:settings:write` | Update organization settings |

### User Management Permissions
| Permission | Description |
|-----------|-------------|
| `users:read` | View users in organization |
| `users:write` | Create/update users |
| `users:delete` | Delete users |
| `users:roles:assign` | Assign/remove roles from users |

### Analytics Permissions
| Permission | Description |
|-----------|-------------|
| `analytics:read` | Access analytics dashboards |

### Using Permissions

```typescript
@Patch(':orgId/settings')
@Permissions(
  OrganizationPermission['orgs:settings:write']
)
async updateSettings(...) { }
```

---

## JWT Token Structure

### Organization-scoped User
```json
{
  "sub": "user-uuid",
  "username": "john.doe",
  "email": "john@example.com",
  "orgRoles": {
    "org-123": ["ORG_ADMIN"],
    "org-456": ["ORG_MANAGER"]
  },
  "orgPermissions": {
    "org-123": ["orgs:read", "orgs:write", "users:read"],
    "org-456": ["orgs:read", "users:read"]
  }
}
```

### Platform Admin
```json
{
  "sub": "admin-uuid",
  "username": "platform.admin",
  "email": "admin@platform.com",
  "platformRoles": ["PLATFORM_ADMIN"],
  "orgRoles": {},
  "orgPermissions": {}
}
```

---

## Request Context Service

The `RequestContext` service provides a clean way to access user information throughout the request lifecycle.

### Usage in Services

```typescript
@Injectable()
export class ProfilesService {
  constructor(
    private readonly requestContext: RequestContext,
    // ... other dependencies
  ) {}

  async updateOrganization(orgId: string, dto: UpdateDto) {
    // Get current user's ID for audit trail
    const updatedBy = this.requestContext.getUserId();

    // Check if user has specific role
    if (this.requestContext.hasRole(OrganizationRole.ORG_ADMIN)) {
      // Admin-only logic
    }

    // Get current org ID
    const currentOrgId = this.requestContext.getOrgId();
  }
}
```

### Available Methods
- `getUserId()`: Get current user's ID
- `getUserEmail()`: Get current user's email
- `getUsername()`: Get current user's username
- `getOrgId()`: Get current organization ID (from x-org-id header)
- `getRoles()`: Get user's roles in current organization
- `getPermissions()`: Get user's permissions in current organization
- `getPlatformRoles()`: Get user's platform-level roles
- `hasRole(role)`: Check if user has specific role
- `hasPermission(permission)`: Check if user has specific permission
- `hasPlatformRole(role)`: Check if user has specific platform role

---

## Applying Guards to Endpoints

### Global Guards (Applied to All Routes)
These are configured in `app.module.ts`:
1. **JwtAuthGuard**: Validates JWT token
2. **OrgContextGuard**: Populates org context if x-org-id header present
3. **RoleGuard**: Checks @Roles() decorator

### Endpoint-Specific Guards
Use `@UseGuards()` decorator for additional guards:

```typescript
@Post('/onboarding')
@UseGuards(PlatformAdminGuard)
@PlatformRoles(PlatformRole.PLATFORM_ADMIN)
async provisionOrganization(...) { }
```

### Public Endpoints
Use `@Public()` decorator to bypass authentication:

```typescript
@Get('/health')
@Public()
async healthCheck() { }
```

---

## Best Practices

1. **Use Roles for Broad Access Control**
   - Apply `@Roles()` decorator to restrict endpoints by role
   - Multiple roles = OR logic (user needs ONE of the specified roles)

2. **Use Permissions for Fine-Grained Control**
   - Apply `@Permissions()` decorator for specific permission checks
   - Multiple permissions = AND logic (user needs ALL specified permissions)

3. **Combine Role and Permission Checks**
   ```typescript
   @Patch(':orgId/sensitive-data')
   @Roles(OrganizationRole.ORG_ADMIN)
   @Permissions(
     OrganizationPermission['orgs:write'],
     OrganizationPermission['orgs:settings:write']
   )
   async updateSensitiveData(...) { }
   ```

4. **Always Include x-org-id Header**
   - Organization-scoped endpoints require `x-org-id` header
   - OrgContextGuard validates user has access to that organization

5. **Use RequestContext for Audit Trails**
   - Always inject `RequestContext` service
   - Use `getUserId()` for `updatedBy`, `createdBy` fields
   - Provides clean abstraction over request object

6. **Document Required Roles in OpenAPI**
   - Update `@ApiOperation()` descriptions to mention required roles
   - Helps frontend developers understand authorization requirements

---

## Testing Authorization

### Testing with Roles
```typescript
// Mock JWT with roles
const mockUser = {
  sub: 'user-123',
  username: 'test.user',
  email: 'test@example.com',
  orgRoles: {
    'org-123': ['ORG_ADMIN']
  }
};

// Include x-org-id header
const response = await request(app.getHttpServer())
  .patch('/orgs/org-123')
  .set('Authorization', 'Bearer <jwt>')
  .set('x-org-id', 'org-123')
  .send(updateDto);

expect(response.status).toBe(200);
```

### Testing Platform Admin
```typescript
const mockPlatformAdmin = {
  sub: 'admin-123',
  username: 'platform.admin',
  email: 'admin@platform.com',
  platformRoles: ['PLATFORM_ADMIN']
};

const response = await request(app.getHttpServer())
  .post('/onboarding')
  .set('Authorization', 'Bearer <jwt>')
  .send(provisionDto);

expect(response.status).toBe(201);
```

---

## Future Enhancements

1. **Dynamic Permission Loading**: Load permissions from database instead of hardcoded enum
2. **Permission Caching**: Cache user permissions in Redis for better performance
3. **Role Hierarchy**: Implement role inheritance (ORG_ADMIN inherits from ORG_MANAGER)
4. **Audit Logging**: Log all authorization decisions for compliance
5. **Rate Limiting by Role**: Different rate limits based on user role
6. **Field-Level Permissions**: Control access to specific fields in DTOs based on permissions
