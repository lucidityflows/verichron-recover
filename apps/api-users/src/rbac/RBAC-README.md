# `rbac` Module

## 1. Overview

The `rbac` module is the central authority for Role-Based Access Control (RBAC) within the Verichron platform. Located in `api-users`, it is the single source of truth for defining roles, permissions, and the relationships between them.

This module provides the necessary tools to manage what users can see and do, forming the backbone of the platform's security and multi-tenancy model. It handles the creation of custom roles, the assignment of permissions to those roles, and the assignment of roles to users.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Role and Permission Definitions:** It owns the `RoleEntity` and `PermissionEntity`, which define the core components of the RBAC system.
-   **Role-to-Permission Mapping:** It owns the `RolePermissionEntity` join table, which links permissions to roles, establishing what each role can do.
-   **RBAC Management Logic:** It owns the business logic for creating, updating, and deleting roles, as well as managing the assignment of permissions to roles and roles to users.
-   **RBAC API Endpoints:** It provides a comprehensive set of API endpoints for managing all aspects of the RBAC system.
-   **Permission Validation Service:** It exposes endpoints for other services to check if a user has a specific permission, centralizing permission validation logic.

### What This Module Does NOT Own

-   **User Profiles:** It does not own user data. It interacts with the `UserMembershipEntity` (owned by the `profiles` module) to assign roles and to check if a role is in use.
-   **Authentication:** It does not handle user authentication. It operates on the assumption that a user has already been authenticated by the `auth` module.
-   **Permission Enforcement:** While it provides a service to check permissions, it does not enforce them. Enforcement is the responsibility of guards (e.g., `PermissionsGuard`) in the `core` module and within each microservice.

---

## 3. Entities

### `PermissionEntity`
The most granular unit of access in the system. Each permission represents a single atomic action that can be performed on a resource.
- **Purpose:** To define a specific capability, like reading a debt or creating a user.
- **Key Fields:**
    - `code` (string): The unique, machine-readable identifier for the permission (e.g., `debt:read`, `user:create`).
    - `resource` (string): The entity the permission applies to (e.g., `debt`).
    - `action` (string): The action that can be performed (e.g., `read`).

### `RoleEntity`
A named collection of permissions. Roles are assigned to users to grant them access to perform actions.
- **Purpose:** To group a set of permissions into a logical job function (e.g., "Collector", "Manager").
- **Key Fields:**
    - `id` (string, UUID): Primary key.
    - `organizationId` (string | null): The organization this role belongs to. A `null` value indicates a platform-level role.
    - `name` (string): The human-readable name of the role.
    - `isSystemRole` (boolean): A flag indicating if the role is a default, system-defined role that cannot be deleted.

### `RolePermissionEntity`
A join table that creates the many-to-many relationship between roles and permissions.
- **Purpose:** To link `PermissionEntity` records to `RoleEntity` records.
- **Key Fields:** `roleId`, `permissionId`.

---

## 4. Endpoints

All endpoints are prefixed with `/rbac` and require authentication and appropriate permissions.

### Role Management
-   `POST /roles`: Creates a new custom role within an organization.
-   `GET /roles`: Lists all roles for an organization (or all roles for platform admins).
-   `GET /roles/:roleId`: Retrieves the details of a single role, including its assigned permissions.
-   `PATCH /roles/:roleId`: Updates the name or description of a role.
-   `DELETE /roles/:roleId`: Deletes a custom role, but only if no users are currently assigned to it.

### Permission Management
-   `GET /permissions`: Lists all available permissions in the system.
-   `GET /permissions/grouped`: Lists all permissions, grouped by their `resource` for easier UI presentation.

### Role-to-Permission Assignment
-   `POST /roles/:roleId/permissions`: Assigns a single permission to a role.
-   `POST /roles/:roleId/permissions/bulk`: Assigns multiple permissions to a role in a single request.
-   `DELETE /roles/:roleId/permissions/:permissionId`: Removes a permission from a role.

### User-to-Role Assignment
-   `POST /users/:userId/roles`: Assigns a role to a user within a specific organization.
-   `DELETE /users/:userId/roles/:roleId`: Removes a role from a user. (Note: This is deprecated in favor of assigning a new role).

### Permission Validation
-   `POST /check-permission`: Checks if a given user has a single, specific permission.
-   `POST /check-permissions`: Checks if a user has all permissions in a given list.

---

## 5. Key Concepts & Patterns

### Role and Permission Model
The system uses a classic RBAC model: Permissions represent individual actions, Roles are collections of permissions, and Users are assigned Roles. This provides a flexible and scalable way to manage access control.

### Platform vs. Organization Roles
A critical architectural concept is the distinction between role scopes:
-   **Organization Roles:** These are tied to a specific `organizationId`. They grant permissions that are only valid within that organization's data scope.
-   **Platform Roles:** These have a `null` `organizationId` and grant permissions across the entire platform. The primary example is `PLATFORM_ADMIN`.

### System Roles & Templates
The module uses a template-based approach for creating default roles. The `role-templates.ts` file defines the structure and default permissions for system roles (`Organization Admin`, `Manager`, etc.). The `RbacService` can then use these templates to provision a standard set of roles for a new organization. Roles marked as `isSystemRole: true` are protected from deletion.

### Centralized Permission Validation
The `/check-permission(s)` endpoints provide a centralized service for permission validation. Instead of each microservice implementing its own complex logic to interpret a user's JWT, they can call this endpoint to get a definitive `true`/`false` answer on whether a user can perform an action. This centralizes RBAC logic and simplifies the security model of other services.

### Event-Driven Auditing
The `RbacService` publishes domain events for all significant changes to the RBAC model, such as `RoleCreated`, `RoleDeleted`, `PermissionsChanged`, and `RoleAssigned`. This creates a comprehensive audit trail and allows other systems to react to changes in user access levels in real-time.

---

## 6. Events

### Published Events
The `RbacService` publishes events to notify the system of changes to roles and permissions.

| Event Name | Event Constant | Trigger |
| :--- | :--- | :--- |
| **Role Created** | `USERS_ROLE_CREATED` | A new role is created. |
| **Role Updated** | `USERS_ROLE_UPDATED` | A role's name or description is updated. |
| **Role Deleted** | `USERS_ROLE_DELETED` | A custom role is successfully deleted. |
| **Permissions Changed** | `USERS_PERMISSIONS_CHANGED` | Permissions are added to or removed from a role. |
| **Role Assigned** | `USERS_ROLE_ASSIGNED` | A user is assigned to a role. |
| **Role Unassigned** | `USERS_ROLE_UNASSIGNED` | A user is unassigned from a role (deprecated). |

---

## 7. Dependencies & Integrations

### Internal Dependencies
-   **`profiles` module:** The `RbacService` queries the `UserMembershipEntity` (owned by the `profiles` module) to determine user counts for roles, which is used to prevent the deletion of roles that are currently in use.
-   **`events` module:** Used to inject the `EventPublisher` for publishing RBAC-related domain events.

### External Integrations
-   **PostgreSQL:** The primary database where the `RoleEntity`, `PermissionEntity`, and `RolePermissionEntity` tables are stored. The module uses TypeORM for database interactions.
