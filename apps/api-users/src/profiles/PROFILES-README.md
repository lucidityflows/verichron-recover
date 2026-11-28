# `profiles` Module

## 1. Overview

The `profiles` module is the definitive source of truth for all user-centric data within the `api-users` microservice. It manages the complete lifecycle of user accounts, from invitation and activation to updates and deactivation.

This module is responsible for the core user identity, their contact details (emails, addresses, phone numbers), and their memberships within various organizations on the platform. It provides the foundational data upon which the `auth` and `rbac` modules build their authentication and authorization logic.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **User Identity and Profile Data:** It owns the core `UserEntity` and all associated sub-entities for contact information (`UserEmailEntity`, `UserAddressEntity`, `UserPhoneNumberEntity`).
-   **User Lifecycle Management:** It owns the business logic for the entire user lifecycle, including the invitation flow for new users, the activation process, profile updates, and soft deletion (deactivation).
-   **Organization Membership:** It owns the `UserMembershipEntity`, which links users to organizations and their corresponding roles.
-   **User-Related Event Publishing:** It is responsible for publishing key domain events related to the user lifecycle, such as `UserCreated`, `UserActivated`, and `UserStatusChanged`.
-   **Internal Provisioning Logic:** It contains the logic for event-driven user provisioning, such as creating the initial administrator when a new organization is created.

### What This Module Does NOT Own

-   **Authentication:** It does not handle user authentication (e.g., password validation or token issuance). It is called by the `auth` module during the login process to retrieve user data, but the `auth` module orchestrates the authentication flow.
-   **Role & Permission Definitions:** It does not define what roles or permissions exist. It calls the `rbac` module to look up and associate `Role` entities with user memberships.

---

## 3. Entities

### `UserEntity`
The core entity representing a unique person in the platform.
- **Purpose:** Stores the primary identity information, including name, primary email, status, and the password hash.
- **Key Fields:** `id`, `firstName`, `lastName`, `email`, `passwordHash`, `status` (e.g., `PENDING`, `ACTIVE`, `INACTIVE`), `invitationToken`.

### `UserMembershipEntity`
A join entity that links a user to an organization and a role, forming the cornerstone of the platform's multi-tenancy and access control model.
- **Purpose:** To define a user's role within a specific organization. A user can have multiple memberships, allowing them to belong to different organizations with different roles.
- **Key Fields:** `userId`, `organizationId`, `roleId`. The `organizationId` is nullable to support platform-level roles (like `PLATFORM_ADMIN`).

### Sub-Entities
- **`UserEmailEntity`:** Stores additional email addresses for a user.
- **`UserAddressEntity`:** Stores physical addresses for a user.
- **`UserPhoneNumberEntity`:** Stores phone numbers for a user.

Each of these has a one-to-many relationship with `UserEntity` and supports a primary flag (e.g., `isPrimary`).

---

## 4. Endpoints

All endpoints are prefixed with `/users` and are protected by authentication and permission guards.

### User Management
-   `GET /users`: Lists all users, scoped to the caller's organization.
-   `POST /users`: Invites a new user to the organization by creating a `PENDING` user account and triggering an invitation email.
-   `GET /users/:userId`: Retrieves the full profile details for a single user.
-   `PATCH /users/:userId`: Updates a user's core profile information (name, status).
-   `DELETE /users/:userId`: Soft-deletes a user by setting their status to `INACTIVE`.

### User Activation
-   `POST /users/activate`: A public endpoint that allows a new user to activate their account by providing a valid `invitationToken` and setting their password.

### Sub-Resource Management
The module also provides full CRUD endpoints for managing a user's associated contact information under the following paths:
-   `/users/:userId/addresses`
-   `/users/:userId/emails`
-   `/users/:userId/phones`

### Internal Endpoints
-   `POST /users/internal/provision-initial-admin`: A special internal endpoint used by the platform's orchestration logic to create the initial admin user when a new organization is provisioned.

---

## 5. Key Concepts & Patterns

### User Invitation and Activation Lifecycle

The module implements a secure user onboarding flow:
1.  **Invitation:** An administrator calls `POST /users` to invite a new user. The service creates a `UserEntity` with `PENDING` status and generates a unique, single-use `invitationToken` with a 24-hour expiry.
2.  **Event & Email:** A `UserCreated` event is published. The `api-communications` service listens for this event and sends an invitation email containing a link with the activation token.
3.  **Activation:** The new user follows the link and submits their `invitationToken` and desired password to the public `POST /users/activate` endpoint.
4.  **Verification:** The `ProfilesService` validates the token, ensures it has not expired, hashes the user's password, and updates their status to `ACTIVE`. It also nullifies the invitation token to prevent reuse.
5.  **Confirmation:** A `UserActivated` event is published to notify other systems of the account activation.

### Scoped Data Access and Platform Admin Override

All data access is scoped by `organizationId`. The controller methods use the `@OrganizationId()` decorator to get the authenticated user's organization context. Service methods then use this `organizationId` in all database queries to ensure strict data isolation between tenants.

This model includes an explicit override for platform administrators, whose tokens contain a `null` `organizationId`. The service logic detects this and bypasses the `WHERE "organizationId" = :orgId` clause, allowing platform admins to view and manage users across all organizations.

### Transactional Operations

Complex operations that involve multiple database writes, such as `inviteUser` (which creates a `UserEntity` and a `UserMembershipEntity`), are wrapped in a database transaction using TypeORM's `QueryRunner`. This ensures that the operation is atomic: either all records are created successfully, or the entire operation is rolled back, preventing orphaned data.

---

## 6. Events

### Published Events

The `ProfilesService` publishes events to notify other parts of the system about key changes in a user's lifecycle.

| Event Name | Event Constant | Trigger |
| :--- | :--- | :--- |
| **User Created** | `USERS_USER_CREATED` | A new user is invited to the platform. The payload includes the `invitationToken`. |
| **User Activated** | `USERS_USER_ACTIVATED` | A pending user successfully activates their account. |
| **Profile Updated** | `USERS_USER_PROFILE_UPDATED` | A user's profile information (e.g., name) is changed. |
| **Status Changed** | `USERS_USER_STATUS_CHANGED` | A user's status is updated (e.g., to `ACTIVE`, `INACTIVE`, `SUSPENDED`). |

### Subscribed Events

This module also subscribes to events from other services to maintain data consistency.

| Event Name | Consuming Listener | Purpose |
| :--- | :--- | :--- |
| **Organization Name Changed** | `OrganizationNameChangedListener`| Updates the denormalized `organizationName` in the `UserMembershipEntity`. |
| **Organization Suspended**| `OrganizationSuspendedListener`| Sets the status of all users in that organization to `SUSPENDED`. |
| **Debtor Invitation** | `DebtorInvitationRequestedListener`| Creates a provisional user account for a debtor being invited to the portal. |

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`rbac` module:** A critical dependency used to look up `Role` entities when creating or modifying user memberships.
-   **`events` module:** Used to inject the `EventPublisher` for publishing user lifecycle events.
-   **`core` module:** Relies on the guards and decorators from this module to secure its endpoints.

### External Integrations

-   **PostgreSQL:** The primary database where all user, membership, and contact information is stored. The module uses TypeORM for all database interactions.
-   **bcrypt:** The library used for securely hashing and comparing user passwords.
-   **`api-communications`:** A key consumer of the `UserCreated` and other events, which it uses to trigger welcome emails, activation emails, etc.
