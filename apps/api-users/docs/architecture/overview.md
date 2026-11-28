# API-Users Microservice: Architectural Overview

This document provides a high-level overview of the `api-users` microservice's internal architecture, module structure, and critical design decisions.

---

## 1. Module Structure and Organization

The `api-users` service is organized into three distinct feature modules, promoting clear separation of concerns:

### 1.1. Auth Module (`src/auth/`)
-   **Purpose**: User authentication, session management, and scoped-token generation.
-   **Responsibilities**: Two-step authentication, scoped JWT generation, context switching, token refresh, JWT & ACT validation strategies.
-   **Key Files**: `auth.controller.ts`, `auth.service.ts`, `strategies/jwt.strategy.ts`, `strategies/act.strategy.ts`, `guards/act.guard.ts`, `dto/`.

### 1.2. Profiles Module (`src/profiles/`)
-   **Purpose**: User profile and contact information management.
-   **Responsibilities**: User CRUD, user profile data, contact information (addresses, emails, phone numbers), user invitation and activation workflows, user status management.
-   **Key Files**: `profiles.controller.ts`, `profiles.service.ts`, `profiles.module.ts`, `entities/`, `dto/`.

### 1.3. RBAC Module (`src/rbac/`)
-   **Purpose**: Role-Based Access Control management.
-   **Responsibilities**: Role CRUD, Permission CRUD, role-permission mapping, user-role assignment, tenant-scoped role management, default role provisioning.
-   **Key Files**: `rbac.controller.ts`, `rbac.service.ts`, `rbac.module.ts`, `entities/`.

---

## 2. Critical Architectural Notes

-   **Foundational Provider Service**: `api-users` acts as a central identity provider and does NOT call other services. This prevents circular dependencies and ensures IAM stability.
-   **Tenant-Scoped RBAC**: Roles are organized per-tenant, allowing organizations to customize their access control. Permissions are platform-wide.
-   **Two-Layered Authorization**: `api-users` provides general capability checks (via JWT permissions); resource ownership checks occur in the owning service.
-   **User-Organization Membership Patterns**: The `user_memberships` table supports many-to-many relationships, enabling various access patterns (e.g., multi-org for debtors, single-org for regular users). For a detailed explanation of the different user types (Platform Admins, Organization Users, and Debtor Users), see [User Types in the Verichron Platform](user-types.md).
-   **Permissions Embedded in JWT**: Full permission lists are embedded in JWTs for performance and reduced coupling.
-   **Thin Events**: Events contain only identifiers, requiring consumers to fetch full data from `api-users` for the latest state.
-   **Event-Driven Admin Provisioning**: Initial admin user creation is asynchronous, triggered by `OrganizationCreated` events, replacing synchronous HTTP calls for better decoupling and retry mechanisms.
-   **Exception: Denormalized Organization Name**: `organizationName` is denormalized in `user_memberships` for performance during login, kept in sync via `OrganizationNameChanged` events.
-   **DEBTOR Multi-Org Access Pattern**: Debtors receive JWTs with an `organizationIds[]` array for seamless cross-org access to their own data, balancing UX, security, and compliance.
