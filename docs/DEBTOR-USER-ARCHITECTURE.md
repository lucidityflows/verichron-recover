# Debtor User Architecture Strategy

**Version**: 1.0
**Status**: Proposed
**Author**: Gemini, Technical Architect Partner

## 1. Overview

This document outlines the architectural strategy for integrating a new `DEBTOR_USER` type into the Verichron platform. The introduction of this user type, who is the end-customer, represents a significant evolution from our current operator-focused model (`PLATFORM_ADMIN`, `ORGANIZATION_USER`).

The primary architectural challenge is to evolve our authentication and authorization system from a **single-tenant context** model to one that supports **multi-tenant data aggregation** for debtors, while also gracefully handling users who possess dual roles (e.g., an employee of an organization who is also a debtor).

This strategy prioritizes a seamless user experience, maintains our strict security posture, and builds upon the existing strengths of our event-driven, decoupled microservice architecture.

---

## 2. Current Architecture Summary

Our current system is built on a robust and secure foundation designed for multi-tenant B2B operations.

-   **User Types**: The platform supports `PLATFORM_ADMIN` (system-level, cross-tenant access) and `ORGANIZATION_USER` (scoped to a single organization at a time).

-   **Single-Context Authentication**: An `ORGANIZATION_USER` authenticates via a two-step flow:
    1.  `POST /auth/login`: Credentials are exchanged for a temporary Authentication Context Token (ACT) and a list of the user's associated organizations.
    2.  `POST /auth/token`: The user selects a single organization, and the ACT is exchanged for a JWT that is cryptographically scoped to that one organization.

-   **Authorization Enforcement**: Authorization is handled by a layered guard chain in each microservice. The `OrgContextGuard` is central to this, enforcing that the `x-org-id` header present in API requests matches the single `organizationId` claim within the JWT.

-   **Service Boundaries**: The architecture enforces a strict separation of concerns. `api-users` is the foundational source of truth for all Identity and Access Management (IAM) and depends on no other service. `api-organizations` manages tenant data and communicates with other services, including `api-users`, via asynchronous events.

---

## 3. New Debtor User Requirements

The `DEBTOR_USER` introduces several new requirements that challenge our existing model.

1.  **Multi-Organization Context**: Unlike an `ORGANIZATION_USER` who operates within one organization's dashboard at a time, a `DEBTOR_USER` must be able to see their debt information from **all organizations that they are associated with, simultaneously**, in a single, unified debtor portal.

2.  **Dual Identity**: A single person may be both an `ORGANIZATION_USER` (using a work email like `employee@acme.com`) and a `DEBTOR_USER` (associated with a personal email like `my.name@gmail.com`). The system must handle this duality without forcing the user to manage two completely separate accounts and passwords.

3.  **Conditional Access**: A debtor can only be invited to the platform by an organization that owns one of their debts.

4.  **Distinct Experience**: The Debtor User accesses a separate, purpose-built debtor portal, not the organization-level dashboard. Their permissions are limited to actions on their own data (viewing debts, making payments, updating their profile).

---

## 4. Proposed Architectural Strategy

To meet these new requirements, we will evolve our architecture around a central principle: **separating a user's single identity from their multiple, distinct operational contexts.**

### A. Unified Identity Model (`api-users`)

We will stop treating an email as the primary user identifier and instead treat it as a context-specific contact method pointing to a single user identity.

1.  **Single User Record**: The `users` table in `api-users` will continue to represent a single person with a unique `userId` and one master password hash. The `userType` column will be deprecated from this table, as a user's type is now determined by their roles/associations.

2.  **Contextual Email Management**: The `user_emails` table becomes a critical part of our identity model. It will be enhanced to link multiple emails to a single `userId`, with each email being tagged for its specific context.

    ```sql
    -- Proposed evolution of user_emails table
    CREATE TABLE user_emails (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      email VARCHAR(255) NOT NULL UNIQUE, -- Must be unique system-wide
      is_verified BOOLEAN NOT NULL DEFAULT false,
      context_type VARCHAR(50) NOT NULL, -- 'ORGANIZATION' or 'DEBTOR'
      -- The specific organization this email is tied to for an org context
      organization_id UUID
    );
    ```

3.  **Debtor Associations**: A new table, `debtor_organization_associations`, will be created in `api-users` to explicitly link a `userId` to the organizations they have a debtor relationship with. This table will be populated via event listeners.

### B. Evolved Authentication Flow (`api-users`)

The login process will be enhanced to discover and offer all available contexts to the user.

**Step 1: `POST /auth/login` (Context Discovery)**
The user authenticates with any of their verified emails and their single master password. The `api-users` service, upon successful authentication, queries all association tables (`user_memberships`, `debtor_organization_associations`) and returns a list of available context *types*.

**Proposed `/auth/login` Response:**
```json
{
  "availableContexts": [
    {
      "type": "ORGANIZATION",
      "organizations": [
        { "id": "org-acme-uuid", "name": "Acme Inc." }
      ]
    },
    {
      "type": "DEBTOR",
      "description": "Access your personal debt dashboard"
    }
  ]
}
```

**Step 2: `POST /auth/token` (Explicit Context Selection)**
The UI presents the available contexts. The user's choice is sent to the `/auth/token` endpoint, which now generates one of two mutually exclusive JWTs.

**Proposed `/auth/token` Request Body:**
```json
{
  "contextType": "DEBTOR", // User chose to enter the debtor portal
  "organizationId": null // Not needed for debtor context
}
```

### C. The "Account Linking" Flow

To solve the dual-email problem, we will introduce an account linking and merging workflow.

1.  **Invitation & Activation**: When a user is invited as a debtor via their personal email, they are guided through activation.
2.  **Proactive Linking**: During activation, the UI will prompt the user: **"Do you already use our platform for work? Log in to link your accounts."**
3.  **Merge Logic**: If the user authenticates with their existing work credentials, `api-users` will perform a merge operation: the new `user_emails` entry and debtor associations are linked to the existing `userId`, and the temporary user record is discarded.
4.  **Corrective Merge Feature**: If a user declines to link and creates a separate account, they are not blocked. The system functions with two separate accounts. To resolve this, we will provide an **"Account Merge"** feature in the user settings page, allowing them to authenticate with their other account and trigger the same merge logic at any time.

### D. Multi-Context Authorization Model

We will introduce a new JWT structure for debtors and evolve our guards to handle it, ensuring strict permission separation.

1.  **Mutually Exclusive JWTs**:
    *   **`ORGANIZATION_USER` JWT (Existing)**: Contains `userType: "ORGANIZATION_USER"` and a single `organizationId` string.
    *   **`DEBTOR_USER` JWT (New)**: Contains `userType: "DEBTOR_USER"` and an `organizationIds` array of strings. Permissions will be self-scoped (e.g., `debt:read:own`).

2.  **Evolved `OrgContextGuard`**:
    *   The guard's logic will branch based on the `userType` claim.
    *   If `userType` is `DEBTOR_USER`, it will bypass the `x-org-id` header check and populate `request.activeContext` with a new `DebtorContext` containing the `organizationIds` array.
    *   This enables downstream services like `api-debts` to perform multi-tenant queries for that user: `... WHERE organization_id IN (:...orgIds)`.

---

## 5. How This Strategy Solves Our Problems

This architecture directly addresses our new requirements while reinforcing existing principles.

-   **Solves the Dual Identity Problem**: The Unified Identity Model with the "Account Linking" flow allows one person with multiple emails and roles to have a single, secure account with one password, providing a seamless user experience.

-   **Enables Multi-Org Aggregation**: The new `DEBTOR_USER` JWT structure and the evolved `OrgContextGuard` provide a secure mechanism for the debtor portal to query and display data from multiple organizations in a single view.

-   **Maintains Strict Security**: By issuing mutually exclusive, context-specific JWTs, we guarantee that a user operating in an `ORGANIZATION` context can never access `DEBTOR` functionality or data, and vice-versa. The permission boundaries are airtight.

-   **Future-Proofs the Architecture**: This context-based authentication model is highly extensible. If a new user type (e.g., "Partner") is needed in the future, we can add a new context type, a new JWT variant, and new guard logic without a complete overhaul of the authentication system.

---

## 6. Definition of Done & Testing Requirements

### Definition of Done

The implementation will be considered complete when the following are delivered:

-   [ ] **Data Model**: Migrations for `api-users` are created and applied to enhance the `user_emails` table and create the `debtor_organization_associations` table.
-   [ ] **Authentication Service**: The `AuthService` in `api-users` is updated to support the new context-discovery and dual-JWT generation logic.
-   [ ] **Authorization Guard**: The `OrgContextGuard` is updated in all relevant microservices to handle the new `DebtorContext`.
-   [ ] **Account Linking UI**: The user-facing activation flow is built to include the account linking prompt.
-   [ ] **Account Merge Feature**: The backend logic and a simple UI for the post-login "Merge Accounts" feature are implemented in the user settings area.
-   [ ] **Event Listeners**: All necessary event listeners for invitation and profile creation are implemented and tested.

### Testing Requirements

To prove the success and security of this implementation, the following E2E tests must be added to our test suite, following the principles in `TESTING-PHILOSOPHY.md`.

1.  **E2E Journey: The Unified User**:
    *   A test that simulates a user being invited as an `ORGANIZATION_USER`, activating, and later being invited as a `DEBTOR_USER` via a different email.
    *   The test must validate the "Account Linking" flow during the second activation.
    *   It must then prove the user can log in with either email (and the same password) and successfully switch between the `ORGANIZATION` and `DEBTOR` contexts.

2.  **E2E Journey: The Corrective Merge**:
    *   A test that simulates a user *declining* to link accounts, resulting in two separate user records.
    *   The test must then log in to one account, navigate to settings, and successfully execute the "Merge Accounts" flow.
    *   It must validate that the secondary user record is deleted and all associations are correctly migrated to the primary account.

3.  **E2E Journey: Debtor Data Aggregation**:
    *   A test that sets up a `DEBTOR_USER` associated with two different organizations.
    *   The test will log in to the debtor context, acquire the multi-org JWT, and make an API call to a downstream service (e.g., `GET /my-debts` on `api-debts`).
    *   It must assert that the service receives the `organizationIds` array and correctly returns data from both organizations and no others.

4.  **E2E Security: Strict Context Enforcement**:
    *   A test that acquires an `ORGANIZATION_USER` JWT and attempts to call a debtor-only API endpoint, asserting that it receives a `403 Forbidden` error.
    *   A test that acquires a `DEBTOR_USER` JWT and attempts to call an organization-only endpoint (which requires the `x-org-id` header), asserting that it also receives a `403 Forbidden` error.
