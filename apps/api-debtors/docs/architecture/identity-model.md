# Debtor Identity Strategy: `debtorId` vs. `debtorProfileId`

**Status**: Implemented
**Author**: Verichron Engineering Team

---

## 1. Executive Summary

This document details the **implemented** strategy for managing debtor identity within our multi-tenant platform. The **previous** implementation faced a critical architectural conflict that prevented the system from correctly handling debtors who existed across multiple organizations. This conflict was the root cause of **initial** E2E seeding failures.

The **implemented** solution adopts a standard identity management pattern by separating the concept of a unique person (**Debtor Identity**) from their specific profile within an organization (**Debtor Profile**). This document details the **implemented** strategy, highlights the resolved gaps in our previous system, and outlines the actual changes and their impact on seeding.

## 2. The Desired State: A Scalable Identity Model

To properly support multi-tenancy, compliance, and scalability, we **now** model debtor identity as two distinct concepts:

### A. Debtor Identity (`debtorId`)

*   **Concept**: Represents a unique real-world person, regardless of how many organizations they are associated with. This is the "golden record" for an individual.
*   **Attributes**: Contains globally unique identifiers for the person, such as a master `debtorId` (UUID) and potentially a linked `userId` from `api-users` if they have registered.
*   **Relationship**: One `DebtorIdentity` record exists per person. It has a one-to-many relationship with `DebtorProfile`.

### B. Debtor Profile (`debtorProfileId`)

*   **Concept**: Represents a person's specific data and context *within a single organization*.
*   **Attributes**: Contains an `organizationId`, contact information (emails, phones, addresses), notes, and other data relevant only to that specific tenant. It would be linked back to the master `DebtorIdentity` record via `debtorId`.
*   **Relationship**: A person can have multiple `DebtorProfile` records—one for each organization they are a debtor in. The unique key for this entity would be a composite of `(debtorId, organizationId)`.

### Benefits of This Strategy

*   **Solves Multi-Tenancy:** Perfectly models the "Diana Prince" scenario, where she can have a distinct, isolated profile for Stark Industries and another for Wayne Enterprises, all while being recognized as the same unique person.
*   **Ensures Compliance:** Makes fulfilling "Right to be Forgotten" requests simple and safe. If a user asks to be deleted from Stark Industries, we can delete only their Stark-specific `DebtorProfile` without affecting their data in Wayne Enterprises.
*   **Prevents Data Leakage:** Guarantees that information from one organization's profile (e.g., notes, contact info) cannot accidentally leak into another's.
*   **Aligns with Existing Patterns:** This model mirrors how `user_memberships` in `api-users` works, creating a consistent architectural pattern across the platform.
*   **Scalability:** Avoids the "shared profile" problem and the immense data duplication that would come from creating entirely new, unlinked debtor records for every debt.

## 3. The Current State: System Gaps & Contradictions

Our **previous** system, as implemented in `apps/api-debtors/src/profiles/entities/debtor.entity.ts`, **did not** follow this model, leading to a fundamental conflict.

### The Core Problem

1.  **The `organizationId` Column:** The `Debtor` entity has a non-nullable `organizationId`, correctly tying a profile to a single tenant.
2.  **The `user_id` `unique` Constraint:** The same `Debtor` entity enforces a `unique: true` constraint on the `user_id` column.

**This creates a logical contradiction:** The schema demands that a user can only be linked to **one** debtor profile across the entire system, but it also demands that every debtor profile belong to **one** specific organization. It is therefore impossible for the system to represent a single registered user who is a debtor in multiple organizations.

The statement "One Debtor Profile Per Person" found in the **old** `api-debtors/README.md` was correct in spirit but **was not** achievable with the **previous** schema if that person was a debtor for multiple tenants.

## 4. Implemented Architectural Details

To implement this strategy, the following high-level changes **were made**:

### A. Schema Changes

1.  **Create a `DebtorIdentity` Entity:**
    *   A new table (e.g., `debtor_identities`) would be created.
    *   Columns: `id` (PK, this becomes the global `debtorId`), `user_id` (FK to `api-users`, nullable, unique), `created_at`, `updated_at`.
2.  **Refactor the `Debtor` Entity to `DebtorProfile`:**
    *   The existing `debtors` table would be conceptually renamed to `debtor_profiles`.
    *   **Remove** the `unique: true` constraint from the `user_id` column (this column might be removed entirely in favor of the link through `DebtorIdentity`).
    *   Add a `debtor_identity_id` column (FK to the new `debtor_identities` table).
    *   Add a composite `unique` constraint on `(debtor_identity_id, organization_id)`.

### B. Logic Changes

*   **`api-debts` (Import Workflow):** The import processor must be updated to first search for or create a `DebtorIdentity` record based on the person's details. It would then use that global `debtorId` to create or update the organization-specific `DebtorProfile`.
*   **`api-debtors` (Services):** All services would need to be updated to work with the two-entity model.
*   **Eventing & Redis Read Model:** The `DebtorUserLinked` event and the `api-debts` listeners would need to be updated to traverse the new relationship (`DebtorProfile` -> `DebtorIdentity` -> `User`) to correctly build the Redis indexes.

## 5. Impact on E2E Seeding

**The previous seeding script could not be fixed in a logically sound way until these architectural changes were made.**

The `duplicate key` error was not a bug in the seeding script's logic; it was a direct consequence of the script correctly trying to implement a business requirement that the **previous** database schema incorrectly forbade.

Any attempt to "fix" the seeding at that time would have been a temporary patch that masked the underlying problem and would have led to incorrect or incomplete data. For example:
*   The workaround of setting the second `user_id` to `null` would have allowed the seeding to pass but would have broken the Redis Read Model, as the second profile could not be linked to the user.
*   Reusing the first profile for the second organization's debts would have violated data tenancy rules and caused failures in application logic.

Consequently, the **seeding of multi-organization debtors was blocked** until this identity vs. profile architecture **was correctly implemented**. The implementation of this architecture has successfully unblocked the creation of realistic and functional E2E test data.
