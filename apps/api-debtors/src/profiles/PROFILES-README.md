# `profiles` Feature Module

## 1. Overview

The `profiles` module is the central feature module of the `api-debtors` microservice. It is the primary owner of the `DebtorProfile` entity, which represents an organization's specific view of a debtor. This module exposes a comprehensive set of REST API endpoints for the complete management of debtor profiles and their associated contact information (addresses, emails, and phone numbers).

Architecturally, the `ProfilesService` acts as an **orchestrator and a facade**. It handles incoming API requests, enforces organization-level security and access control, and then delegates the detailed business logic to specialized, lower-level services in the `IdentityModule` and `ContactModule`. This design keeps the controller and profile service focused on orchestration and security while encapsulating the core logic for identity and contact management in their respective modules.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Core `DebtorProfile` Entity:** Owns the `DebtorProfileEntity` and its associated contact info entities (`DebtorAddress`, `DebtorEmail`, `DebtorPhone`).
-   **Primary API Surface:** Owns the `ProfilesController`, which exposes all endpoints under the `/debtors` path.
-   **Orchestration Logic:** The `ProfilesService` owns the logic for orchestrating CRUD operations. It validates tenant access and then delegates to other services.
-   **Debtor Invitation Flow:** Owns the business logic and endpoints for inviting individual debtors or entire portfolios of debtors to the platform.
-   **Organization-Scoped Access Control:** Enforces that all data access is strictly scoped to the user's current organization via the `RequestContext`.
-   **Soft Deletion:** Implements the soft-delete pattern for debtor profiles, setting a `deletedAt` timestamp for compliance and audit trails.

### What This Module Does NOT Own

-   **Global Identity Management:** It delegates all de-duplication and global `DebtorIdentity` creation to the `IdentityModule`.
-   **Contact Information CRUD:** It delegates the low-level database operations for addresses, emails, and phones to the services within the `ContactModule`.

---

## 3. Entities

### `DebtorProfileEntity`

The central entity of this module, representing a person's profile within a single organization.

-   **Purpose:** To store the organization-specific PII, status, and contact information for a debtor.
-   **Key Characteristics:**
    -   It is uniquely identified by the combination of `debtorIdentityId` and `organizationId`, preventing a person from having more than one profile in the same organization.
    -   It contains organization-specific data like `status` (e.g., `INVITED`, `ACTIVE`) and `notes`.
    -   It has one-to-many relationships with `DebtorAddress`, `DebtorEmail`, and `DebtorPhone`.

### Contact Entities (`DebtorAddress`, `DebtorEmail`, `DebtorPhone`)

While the CRUD logic for these entities resides in the `ContactModule`, they are conceptually part of the `profiles` domain and are exposed via this module's API. They represent the organization-specific contact points for a debtor.

---

## 4. Endpoints

The module exposes a rich, RESTful API prefixed with `/debtors`. All endpoints require authentication and enforce organization-level tenancy.

### Core Profile Endpoints

-   `GET /`: Lists all debtor profiles for the current organization, with support for filtering and pagination.
-   `POST /`: Creates a new `DebtorProfile`.
-   `GET /:id`: Retrieves a single, detailed `DebtorProfile`.
-   `PUT /:id`: Performs a full update (replacement) of a `DebtorProfile`'s data.
-   `PATCH /:id`: Performs a partial update, modifying only the supplied fields.
-   `DELETE /:id`: Soft-deletes a `DebtorProfile`.

### Invitation Endpoints

-   `POST /:id/invite`: Initiates the user invitation process for a single debtor.
-   `POST /invite-portfolio`: Triggers a bulk invitation process for all eligible debtors within a specified portfolio.

### Contact Info Sub-Resource Endpoints

For each contact type (`addresses`, `emails`, `phones`), the module provides a full suite of nested CRUD endpoints.

-   `GET /:id/{contactType}`: Lists all contacts of that type for the debtor.
-   `POST /:id/{contactType}`: Adds a new contact of that type to the debtor.
-   `GET /:id/{contactType}/:contactId`: Retrieves a single contact record.
-   `PUT /:id/{contactType}/:contactId`: Updates a single contact record.
-   `DELETE /:id/{contactType}/:contactId`: Deletes a single contact record.

---

## 5. Key Concepts & Patterns

### Facade and Orchestration Service

`ProfilesService` is a classic implementation of the Facade pattern. It provides a simple, unified API for the `ProfilesController` while hiding the complexity of the underlying subsystem. For any given operation, it follows a clear pattern:
1.  **Verify Ownership:** Use the `verifyDebtorOwnership` helper method to ensure the requested `debtorId` belongs to the current user's organization.
2.  **Delegate:** Call the appropriate method on a specialized service (`IdentityService`, `AddressService`, `EmailService`, etc.) to perform the core logic.
3.  **Publish Event:** After a successful operation, publish a domain event (`DEBTORS_PROFILE_CREATED`, `DEBTORS_PROFILE_UPDATED`, etc.).

### Strict Organization Scoping

Multi-tenancy is enforced rigorously. The `ProfilesService` retrieves the `organizationId` from the `RequestContext` on nearly every method call and includes it in the `WHERE` clause of its database queries. This ensures that one organization can never see or modify another organization's debtor data.

### Delegation to Specialized Modules

This module's design promotes high cohesion and low coupling by delegating responsibilities:
-   **Identity:** When `POST /debtors` is called, the `ProfilesService` calls `identityService.findOrCreateIdentity()`. It doesn't know *how* identity matching works; it only knows that it will receive a valid `DebtorIdentity` to link to.
-   **Contact:** When `POST /:id/addresses` is called, `ProfilesService` delegates the entire creation logic to `addressService.create()`. This keeps the `ProfilesService` clean and focused on orchestration.

---

## 6. Events

### Published Events

| Event Name | Event Constant | DTO | Topic | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Profile Created** | `DEBTORS_PROFILE_CREATED`| `DebtorProfileCreatedDto`| `debtors-v1` | Published when a new `DebtorProfile` is successfully created. |
| **Profile Updated** | `DEBTORS_PROFILE_UPDATED`| `DebtorUpdatedDto` | `debtors-v1`| Published on any update to a profile, including soft deletion. The payload includes which fields were changed. |
| **Invitation Requested**| `DEBTORS_INVITATION_REQUESTED` | `DebtorInvitationRequestedDto`| `debtors-v1` | Published when a single debtor is invited to create a user account. |
| **Invitation Batch Requested**|`DEBTORS_INVITATION_BATCH_REQUESTED`| `DebtorInvitationBatchRequestedDto`|`debtors-v1`| Published in batches when inviting all debtors from a portfolio. |

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`IdentityModule`:** Crucial for linking profiles to a global identity.
-   **`ContactModule`:** The services from this module are used for all contact information CRUD operations.
-   **`EventsModule`:** Provides the `EventPublisher` for dispatching domain events.
-   **`core` module:** Provides `RequestContext` for tenancy information and guards for security.

### External Integrations

-   **TypeORM / PostgreSQL:** The `DebtorProfileEntity` and its related contact entities are stored in the `debtor-database`.
-   **`@verichron/event-publisher`:** Shared library for publishing events to the message bus.
-   **`@verichron/contracts` & `@verichron/enums`:** Shared libraries for DTO interfaces and common enumerations.
