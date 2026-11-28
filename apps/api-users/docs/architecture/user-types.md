# User Types in the Verichron Platform

This document provides a comprehensive overview of the three primary user types within the Verichron platform: Platform Users, Organization Users, and Debtor Users. Understanding these categories is fundamental to grasping the platform's multi-tenancy, security, and operational model.

For more granular details on the authentication and authorization mechanisms, please refer to the main [Auth Architecture Documentation](../../../architecture/auth/README.md) and the [RBAC Overview](../../../architecture/auth/concepts.md#3-roles--permissions).

---

## 1. Platform Users (`PLATFORM_USER`)

Platform Users are the super-users and support staff of the Verichron platform. They operate at the SaaS level and are organization-agnostic.

*   **Provisioning**: The initial Platform User (Admin) is seeded into the system in advance by the SaaS operations team. This root account is required to bootstrap the platform and onboard the first organizations.
*   **Roles**:
    *   **PLATFORM_ADMIN**: Full system access across all organizations. Can onboard new organizations and manage platform-wide settings.
    *   **PLATFORM_SUPPORT**: Limited system access to assist with support requests.
*   **Authentication Scope**: Platform users operate without a specific `organizationId` (it is `null` in their JWT). Their access across organizations is governed by platform-level permissions.

---

## 2. Organization Users (`ORG_USER`)

Organization Users are individuals who belong to and operate within a specific client organization (e.g., a collection agency). Their access and permissions are strictly scoped to their tenant.

*   **Provisioning**: The first Organization User for a new tenant is the `ORG_ADMIN`, created during the onboarding process. Subsequent users (Managers, Collectors, Viewers) are invited by an existing admin.
*   **Authentication Scope**: When an `ORG_USER` logs in, they are issued an organization-scoped JSON Web Token (JWT). This token restricts all actions to the context of their single, specific organization. Users belonging to multiple organizations must use "context switching" to act within a different organization scope.
*   **Standard Roles**:
    *   **ORG_ADMIN**: Full administrative control over organization configuration, users, and data.
    *   **ORG_MANAGER**: Management of multiple teams and performance tracking.
    *   **ORG_TEAM_LEAD**: Oversight of specific team goals and member performance.
    *   **ORG_COLLECTOR**: Operational focus on assigned work queue items.
    *   **ORG_VIEWER**: Read-only access to organization metrics.

---

## 3. Debtor Users (`DEBTOR_USER`)

Debtor Users are the end-customers—the individuals whose debts are being managed on the platform. Their accounts allow them to view and manage their own financial obligations.

*   **Provisioning Lifecycle**:
    1.  **Identity Creation**: Triggered by portfolio imports in `api-debts` and `api-debtors`.
    2.  **Invitation**: An `ORG_ADMIN` invites a debtor to manage their accounts via `api-users`.
    3.  **Activation**: The debtor registers and activates their account, becoming a full `DEBTOR_USER`.
*   **Authentication Scope**: Debtor Users have a "multi-org" scope. Their JWT contains an `organizationIds` array representing every tenant where they have an active debt profile. This allows a seamless experience across multiple collection agencies within a single session while maintaining strict per-tenant data isolation.