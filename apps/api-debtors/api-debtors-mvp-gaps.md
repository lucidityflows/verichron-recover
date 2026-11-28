# API-Debtors MVP Implementation Gaps

**Status**: Temporary Document - To be deleted upon MVP completion.

This document aggregates the identified implementation gaps (unimplemented features, TODOs, and stubbed functionalities) that are required for the Minimum Viable Product (MVP) of the `api-debtors` microservice.

**Important Note**: When an item listed below is implemented, the corresponding annotation in its respective documentation (e.g., `apps/api-debtors/docs/architecture/overview.md`, `apps/api-debtors/docs/events/overview.md`, or relevant code comments) **must be removed or updated** to reflect its completed status.

---

## Recent Completions (2025-11-26)

✓ **Debtor Invitation Flow** - Complete end-to-end implementation:
- Portfolio-level batch invitation processing
- Event-driven architecture with batch publishing (100 invitations per batch)
- User creation and deduplication in api-users
- User-to-identity linking with complete `DEBTORS_USER_LINKED` event publishing
- Status lifecycle tracking with `DebtorProfileStatus` enum

✓ **Event Publishing Enhancement**:
- New `linkUserToIdentityWithProfile()` method created (apps/api-debtors/src/identity/identity.service.ts:254)
- Complete event payload now includes all required fields: debtorIdentityId, debtorProfileId, userId, organizationId, linkedAt
- Idempotency support for duplicate user linking events
- Organization-scoped profile lookup for accurate event data

---

## Identified Gaps

### Architectural Gaps (from `apps/api-debtors/docs/architecture/overview.md`)

*   **DocumentsModule - GCS Client Integration**: The `DocumentsModule` handles document metadata and references files to be stored in GCS. However, the direct GCS client integration is currently stubbed (`@google-cloud/storage` package commented out, `this.storage`/`this.bucket` are null) and pending full implementation in `documents.service.ts`.
    *   **Status**: NOT IMPLEMENTED (Required for MVP - file upload/download functionality).

### Feature Implementation Gaps

*   **Debtor Invitation Flow** ✓ **IMPLEMENTED**
    *   **Description**: Portfolio-level batch invitation of debtors to become debtor users, with event-driven user creation and identity linking.
    *   **Components**:
        *   `POST /debtors/invite-portfolio` endpoint (apps/api-debtors/src/profiles/profiles.controller.ts:303)
        *   Batch invitation processing with status tracking (PENDING_INVITATION → INVITED → ACTIVE)
        *   Event publishing: `DEBTORS_INVITATION_BATCH_SENT` (100 invitations per batch)
        *   Event consumption: `USERS_DEBTOR_USER_CREATED_BATCH` listener
        *   User-to-identity linking via `DebtorIdentity.userId`
        *   `DebtorProfileStatus` enum with 5 states
    *   **Status**: COMPLETED (2025-11-26).



### E2E Test Scenarios for MVP Confidence

To gain confidence in the `api-debtors` microservice for MVP, the following E2E test scenarios are crucial:

*   **Scenario: Portfolio Import - Debtor Creation and Linking** ✓ **PARTIALLY COVERED**
    *   **Description**: Verify that importing a new portfolio containing new debtors correctly creates `DebtorIdentity` and `DebtorProfile` records, links them, and associates contact information within the correct organization.
    *   **Key Modules/Features Tested**: `ImportsModule`, `IdentityModule`, `ProfilesModule`, `ContactModule` (create operations), eventing for `DEBTS_PORTFOLIO_DEBTOR_BATCH_READY` → `DEBTORS_IDENTITY_CREATED`, `DEBTORS_PROFILE_CREATED`.
    *   **Current Status**: Batch processing logic implemented and unit tested; E2E test coverage should be verified.

*   **Scenario: Portfolio Import - Existing Debtor Update** ✓ **PARTIALLY COVERED**
    *   **Description**: Verify that importing a portfolio with existing debtors (matching via SSN or email) correctly updates their `DebtorProfile` within an organization without creating duplicate `DebtorIdentity` records.
    *   **Key Modules/Features Tested**: `ImportsModule`, `IdentityModule` (deduplication logic via SSN hash and email matching), `ProfilesModule` (update operations).
    *   **Current Status**: Identity matching logic implemented in `IdentityService.findOrCreateIdentity()`; E2E test coverage should be verified.

*   **Scenario: Multi-Organization Debtor Representation ("Diana Prince" Scenario)**
    *   **Description**: Verify that a single `DebtorIdentity` can have multiple `DebtorProfile` records across different organizations, with data isolated correctly per organization.
    *   **Key Modules/Features Tested**: `IdentityModule`, `ProfilesModule` (multi-tenancy, data isolation).

*   **Scenario: Debtor Profile CRUD (API-driven)**
    *   **Description**: Verify the basic CRUD operations (`create`, `read`, `update`, `delete` (soft)) for a `DebtorProfile` directly via the API, ensuring organization-scoping and permissions.
    *   **Key Modules/Features Tested**: `ProfilesModule`, `RequestContext`, Authorization.

*   **Scenario: Right-to-be-Forgotten (Soft Delete)**
    *   **Description**: Verify that initiating a "right-to-be-forgotten" request for a specific `DebtorProfile` correctly triggers a soft delete (e.g., `deletedAt` timestamp set) without affecting the `DebtorIdentity` or other `DebtorProfile`s in different organizations.
    *   **Key Modules/Features Tested**: `ProfilesModule` (soft delete), data isolation, compliance.

*   **Scenario: User Linking to Debtor Identity** ✓ **IMPLEMENTED**
    *   **Description**: Verify that when a user registers (simulated via `api-users` event or direct call), their `userId` is correctly linked to an existing `DebtorIdentity`, and that this linkage is reflected in relevant lookups.
    *   **Key Modules/Features Tested**: `IdentityModule` (user linking), event consumption (if `UserRegistered` event is implemented and consumed).
    *   **Implementation**: `DebtorUserCreatedBatchListener` consumes `USERS_DEBTOR_USER_CREATED_BATCH` events and links userIds to DebtorIdentity via `IdentityService.linkUserToIdentity()`. Publishes `DEBTORS_USER_LINKED` events.
    *   **Status**: COMPLETED (2025-11-26).

*   **Scenario: Document Upload and Signed URL Download**
    *   **Description**: Verify that a document can be uploaded for a `DebtorProfile`, its metadata stored, and a time-limited signed URL can be generated for secure download. (This will be dependent on GCS integration being functional).
    *   **Key Modules/Features Tested**: `DocumentsModule`, GCS integration (once functional).

*   **Scenario: Demographics PII Access and Audit**
    *   **Description**: Verify that demographics data can be accessed, and that this access is logged for audit purposes. (This depends on SSN encryption implementation being correctly handled for PII).
    *   **Key Modules/Features Tested**: `DemographicsModule` (access control, audit logging), SSN encryption (once functional).

*   **Scenario: Verification Request and Status Tracking**
    *   **Description**: Verify that a verification request can be initiated for a `DebtorProfile`, its status tracked (`PENDING` -> `IN_PROGRESS` -> `VERIFIED`/`FAILED`), and relevant events are published.
    *   **Key Modules/Features Tested**: `VerificationModule`, event publishing.

---

This temporary document will serve as our consolidated checklist for MVP completion.
