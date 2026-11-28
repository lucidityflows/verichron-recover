# Core Concepts: Authentication & Authorization

This document outlines the fundamental principles, user types, and the Role-Based Access Control (RBAC) model that form the backbone of the Verichron platform's identity and access management system.

## 1. Overview & Design Principles

The Verichron platform uses a **multi-tenant, role-based access control (RBAC)** system.

### Design Principles

-   **Type Safety First**: Discriminated union types prevent mixing platform/org contexts at compile-time.
-   **Defense in Depth**: Layered guard architecture with JWT → OrgContext → Permissions validation.
-   **Fail Secure**: All access is denied by default; explicit grants required.
-   **Audit Trail**: All authorization decisions are logged with full context.
-   **Stateless**: JWT contains all authorization data; no session state required.
-   **Centralized Identity Management**: `api-users` is the single source of truth for user identities, authentication, and core RBAC definitions.
-   **Multi-Tenancy**: Securely isolating data and access for different organizations (tenants). A user can belong to multiple organizations with different roles in each.
-   **Platform-Level Administration**: Supporting "Platform Admins" who can operate across all organizations without being tied to a specific `organizationId`.
-   **Granular Permissions**: Defining fine-grained permissions (`resource:action`) that can be assigned to roles.
-   **Event-Driven Communication**: All inter-service communication related to user and organization state changes is asynchronous via events.
-   **Consistent Enforcement**: Applying a standardized set of guards and decorators across microservices to enforce security policies.

## 2. User Types

The system supports two primary user types, each with distinct characteristics and access patterns.

### 2.1. Platform Admin (`UserType.PLATFORM_ADMIN`)

**Purpose**: System administrators with unrestricted access across all organizations.

**Characteristics**:
-   `organizationId: null` in JWT claims.
-   Bypasses organization context validation.
-   Has platform-level roles and permissions.
-   Can access any organization's resources.
-   Used for system maintenance, onboarding, and cross-tenant operations.

### 2.2. Organization User (`UserType.ORGANIZATION_USER`)

**Purpose**: Regular tenant users with scoped access to their organization. This includes standard organization members, managers, and administrators *within* a specific tenant.

**Characteristics**:
-   `organizationId: <uuid>` in JWT claims.
-   Must match organization context in requests.
-   Has organization-level roles and permissions.
-   Cannot access other organizations' resources.
-   Used for normal business operations within their tenant.

### 2.3. Debtor User (`UserType.DEBTOR`)

**Purpose**: Debtor users who have self-service access to their own debt information across multiple organizations. This is a special type of `ORGANIZATION_USER` with multi-organization access capabilities.

**Characteristics**:
-   `organizationIds: <uuid[]>` in JWT claims (an array, not a single ID).
-   Access is ownership-based (`debtor:self:*` permissions).
-   Can access their data across all organizations that have invited them without explicit context switching.
-   JWT includes `isDebtor: true` flag.

## 3. Roles & Permissions

Roles are collections of permissions, assigned to users to define their access rights. Permissions are granular capabilities within the system.

### 3.1. Platform Roles

These roles are global and grant system-wide capabilities.

**Enum**: `PlatformRole` (in `@verichron/types/src/enums/auth/platform-roles.enum.ts`)

| Role             | Description                     | Typical Use             |
| :--------------- | :------------------------------ | :---------------------- |
| `PLATFORM_ADMIN` | Full system access              | DevOps, support engineers |

**Platform Permissions**: Fine-grained platform-level operations.

Example: `"platform:orgs:create"`, `"platform:users:manage"`.

### 3.2. Organization Roles

These roles are tenant-scoped and grant capabilities within a specific organization.

**Enum**: `OrganizationRole` (in `@verichron/types/src/enums/organizations/organization-roles.enum.ts`)

| Role                    | Description                             |
| :---------------------- | :-------------------------------------- |
| `OWNER`                 | Organization owner                      |
| `ADMIN`                 | Organization administrator              |
| `COLLECTIONS_MANAGER`   | Debt collection management              |
| `ANALYST`               | Read-only analyst                       |
| `MEMBER`                | Basic user                              |
| `DEBTOR`                | Debtor user for self-service portal     |

**Organization Permissions**: Fine-grained organization-level operations.

Example: `"orgs:read"`, `"debts:create"`, `"analytics:view"`.

### 3.3. Debtor Permissions

These are a special set of self-scoped permissions designed specifically for `DEBTOR` users.

Example: `"debtor:self:read"`, `"debtor:self:pay"`. These enforce that a debtor can only perform actions related to their *own* data.
