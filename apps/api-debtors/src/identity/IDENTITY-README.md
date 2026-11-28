# `identity` Feature Module

## 1. Overview

The `identity` module is the architectural cornerstone for managing personhood within the Verichron platform. Its single responsibility is to manage the **`DebtorIdentity`**, which represents a unique, real-world individual—the "golden record"—independent of any organization.

This module is responsible for the critical task of **de-duplication**. Through a multi-tiered matching strategy, it ensures that each person is represented by only one `DebtorIdentity`, even if they exist as a debtor in multiple client organizations. The module is service-only and does not expose any direct API endpoints; its logic is consumed by other modules, primarily `profiles` and `imports`, and by event listeners that react to user creation events.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **CRUD Operations for `DebtorIdentity`:** Manages the lifecycle of the `DebtorIdentityEntity`.
-   **Identity De-duplication Logic:** Owns the `findOrCreateIdentity` workflow, which implements the core matching strategy.
-   **Multi-Tiered Matching Strategy:** Enforces a strict, ordered matching logic to find existing identities:
    1.  `userId` (most reliable)
    2.  `ssnHash` (highly reliable)
    3.  `email` (least reliable)
-   **User Account Linking:** Manages the association (`linkUserToIdentity`) and disassociation (`unlinkUserFromIdentity`) of a platform `userId` with a global `DebtorIdentity`.
-   **Secure Hashing:** Owns the `generateSsnHash` utility, which creates a secure SHA-256 hash of a Social Security Number for matching without storing PII.
-   **Idempotency Key Generation:** Provides `generateDebtorKey` for use in batch import processes, ensuring that the same debtor record always produces the same key.

### What This Module Does NOT Own

-   **API Endpoints:** This is a "headless" module with no controllers. Its services are invoked internally.
-   **Debtor Profiles:** It does not own `DebtorProfile` data but queries related entities (`DebtorDemographics`, `DebtorEmail`) to perform its matching logic.
-   **Organization Context:** The `DebtorIdentity` is organization-agnostic. The module relies on consumers to provide organization context when needed (e.g., for publishing a complete `DEBTORS_USER_LINKED` event).

---

## 3. Entities

### `DebtorIdentityEntity`

This is the primary and only entity managed by this module. It represents the "golden record" of a unique person across the entire platform.

-   **Purpose:** To serve as the single, global anchor for an individual.
-   **Key Characteristics:**
    -   A person has exactly one `DebtorIdentity` record.
    -   It is organization-agnostic.
    -   It contains an optional, unique `userId` field, which links the identity to a registered platform user.
    -   It has a one-to-many relationship with `DebtorProfileEntity`, linking it to all the organization-specific profiles associated with that person.

---

## 4. Endpoints

This module **does not expose any API endpoints**. Its functionality is accessed exclusively through its exported services and event listeners.

---

## 5. Key Concepts & Patterns

### Global Identity vs. Local Profile

This module implements a fundamental architectural pattern of the platform: the separation of a global identity from local, organization-specific profiles.

-   **`DebtorIdentity` (Global):** Represents "Diana Prince" as a unique person in the world. There is only one.
-   **`DebtorProfile` (Local):** Represents "Diana Prince" *within Stark Industries* and "Diana Prince" *within Wayne Enterprises*. She has two profiles, one for each organization she is a debtor in, but both profiles link back to her single `DebtorIdentity`.

This separation is critical for data integrity, multi-tenancy, and compliance.

### Multi-Tiered Matching Strategy

To prevent duplicate identities, `findOrCreateIdentity` uses a strict, ordered matching cascade implemented in `findIdentityByMatchingCriteria`:

1.  **Match by `userId`:** The service first checks for an existing `DebtorIdentity` with a matching `userId`. This is the most definitive match.
2.  **Match by `ssnHash`:** If no `userId` match is found, it looks for a `DebtorDemographics` record with a matching `ssnHash`. If found, it traverses the relationship to the associated `DebtorIdentity`.
3.  **Match by `email`:** If the above fail, it looks for a `DebtorEmail` record with a matching normalized email address and traverses to its `DebtorIdentity`.
4.  **Create New:** If no matches are found, a new `DebtorIdentity` is created.

### Event-Driven User Linking

The module handles linking platform users to debtor identities in an event-driven way.
-   `linkUserToIdentityWithProfile` is the preferred method for linking, as it accepts an `organizationId`. This allows it to find the correct `debtorProfileId` and publish a complete `DEBTORS_USER_LINKED` event with full context.
-   `DebtorUserCreatedListener` and `DebtorUserCreatedBatchListener` are provided by this module to consume events from other parts of the system (e.g., user registration, batch invitations) and trigger the user-linking logic.

### Secure & Idempotent Operations

-   **SSN Hashing:** The `generateSsnHash` method uses Node.js's `crypto` library to create a one-way SHA-256 hash of a debtor's SSN. This allows for reliable de-duplication without ever storing the raw SSN in the `DebtorDemographics` table.
-   **Idempotency Keys:** The `generateDebtorKey` method creates a deterministic key from debtor data (e.g., org ID + email or org ID + hashed name/DOB). This is essential for the `ImportsModule` to safely retry failed batch operations without creating duplicate records.

---

## 6. Events

### Published Events

| Event Name | Event Constant | DTO | Topic | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Identity Created** | `DEBTORS_IDENTITY_CREATED` | `DebtorIdentityCreatedDto` | `debtors-v1` | Published when a new, unique `DebtorIdentity` is created. |
| **User Linked** | `DEBTORS_USER_LINKED` | `DebtorUserLinkedDto` | `debtors-v1` | Published by `linkUserToIdentityWithProfile` when a `userId` is successfully associated with an identity in a specific organization's context. |

### Subscribed Events

This module provides listeners that subscribe to user creation events (the specific event names are defined in the consuming modules/packages).

-   **`DebtorUserCreatedListener`:** Handles single user creation events (e.g., from an invitation flow) and calls `DebtorIdentityService` to link the new user to an identity.
-   **`DebtorUserCreatedBatchListener`:** Handles events signifying that a batch of users has been created, linking each one.

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`profiles` module:** For the `DebtorProfileEntity`, which is the bridge between a global identity and an organization.
-   **`demographics` module:** For the `DebtorDemographics` entity, used to match by `ssnHash`.
-   **`contact` module:** (Implicitly) For the `DebtorEmail` entity, used to match by email.
-   **`events` module:** For publishing events and providing listeners.

### External Integrations

-   **TypeORM / PostgreSQL:** The `identity` module relies on TypeORM to interact with the `debtor-database`.
-   **`@verichron/event-publisher`:** The shared library used to publish events to GCP Pub/Sub.
-   **Node.js `crypto`:** Used for generating secure SHA-256 hashes.

---

## 8. Gaps & Future Work

-   **Exact Matching Only:** The current `findOrCreateIdentity` logic relies on exact matches for `userId`, `ssnHash`, or `email`. The service's source code explicitly notes a future enhancement to implement fuzzy matching (e.g., using a combination of name, date of birth, and address) to catch near-matches and further improve de-duplication accuracy.
