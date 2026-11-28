# `demographics` Feature Module

## 1. Overview

The `demographics` module is a specialized, high-security feature responsible for managing sensitive Personally Identifiable Information (PII) for debtors. This includes data such as Social Security Numbers (SSN), income, race, and marital status. The entire module is designed with a security-first approach to meet strict compliance and data protection requirements.

It provides a secure CRUD API, where every operation is subject to elevated permissions and is logged for auditing purposes. The module maintains a strict one-to-one relationship with the `DebtorProfile`, acting as a secure extension for its most sensitive data.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Sensitive Data Storage:** Owns the `DebtorDemographics` entity, which is the single source of truth for a debtor's sensitive demographic data within an organization.
-   **Secure API Endpoints:** Owns the endpoints under `/debtors/:debtorId/demographics`, which are protected with strict permission checks.
-   **SSN Encryption and Hashing:** The `DemographicsService` contains the complete logic for securely handling SSNs. It does not store raw SSNs; instead, it encrypts the full SSN, creates a hash for de-duplication purposes, and stores the last four digits for display.
-   **Audit Logging:** A critical responsibility of this module is to log every access. It automatically updates `lastAccessedAt` and `lastAccessedBy` fields upon any read or write operation.
-   **Event Publishing:** Publishes events for the creation and modification of demographic records for compliance tracking.

### What This Module Does NOT Own

-   **Debtor Profiles:** It does not own the `DebtorProfile`. It depends on the `ProfilesModule` to verify that a user has authorized access to a debtor before any demographic data can be accessed or modified.

---

## 3. Entities

### `DebtorDemographics`

This is the sole entity for this module, designed to securely store sensitive PII.

-   **Purpose:** To isolate and protect a debtor's most sensitive data while linking it to their organization-specific profile.
-   **Key Characteristics:**
    -   Has a strict **one-to-one** relationship with `DebtorProfileEntity`.
    -   Contains fields for `ssnEncrypted`, `ssnHash`, and `ssnLastFour` to handle SSNs securely.
    -   Includes `lastAccessedAt` and `lastAccessedBy` fields to maintain a clear audit trail for every access.
    -   Most data fields are nullable to support cases where demographic information is sparse or unavailable.
    -   Uses a `deletedAt` field for soft deletion.

---

## 4. Endpoints

All endpoints are sub-resources of a debtor, prefixed with `/debtors/:debtorId/demographics`, and require elevated permissions (e.g., `demographics:read`).

### `GET /`

-   **Description:** Retrieves the sensitive demographics record for a single debtor. Every call to this endpoint updates the `lastAccessedAt` and `lastAccessedBy` audit fields.
-   **Permissions:** `demographics:read`
-   **Responses:** `200 OK` with a `DebtorDemographics` object.

### `POST /`

-   **Description:** Creates a new demographics record for a debtor. This operation can only be performed once per debtor profile.
-   **Permissions:** `demographics:create`
-   **Responses:** `201 Created` with the new `DebtorDemographics` object. `409 Conflict` if a record already exists for the debtor.

### `PUT /` & `PATCH /`

-   **Description:** Updates an existing demographics record. `PUT` replaces the entire record with the provided data, while `PATCH` modifies only the supplied fields.
-   **Permissions:** `demographics:update`
-   **Responses:** `200 OK` with the updated `DebtorDemographics` object.

### `DELETE /`

-   **Description:** Performs a **soft delete** of the demographics record by setting its `deletedAt` timestamp. The data is not permanently erased, preserving the audit history.
-   **Permissions:** `demographics:delete`
-   **Responses:** `204 No Content`.

---

## 5. Key Concepts & Patterns

### Security-First Design

This module is built around several key security principles:

1.  **Strict Permissioning:** Every endpoint requires specific `demographics:*` permissions, ensuring that only highly privileged users or services can access this sensitive data.
2.  **Comprehensive Audit Trail:** The `DemographicsService` automatically calls a private `logAccess` method on every successful `findOne` operation, updating the record with who accessed it and when. All write operations (`create`, `update`) also update this audit trail.
3.  **Secure SSN Handling:** Raw SSNs are never stored. The `DemographicsService` uses the Node.js `crypto` library to perform three distinct operations on a provided SSN:
    -   **Encryption (AES-256-GCM):** The full SSN is encrypted and stored in the `ssnEncrypted` field.
    -   **Hashing (SHA-256):** A one-way hash is generated and stored in `ssnHash`. This allows other services (like `IdentityService`) to check for duplicates without needing decryption keys.
    -   **Extraction:** The last four digits are stored unencrypted in `ssnLastFour` for display and verification purposes.

### One-to-One Data Isolation

By enforcing a unique one-to-one relationship between `DebtorProfile` and `DebtorDemographics`, the system ensures that sensitive data is logically and physically separated, allowing for stricter access controls to be applied to just this subset of a debtor's information.

---

## 6. Events

### Published Events

| Event Name | Event Constant | DTO | Topic | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Demographics Created** | `DEBTORS_DEMOGRAPHICS_CREATED`| `DemographicsCreatedDto` | `debtors-v1` | Published when a new demographics record is created for a debtor. |
| **Demographics Updated** | `DEBTORS_DEMOGRAPHICS_UPDATED`| `DemographicsUpdatedDto` | `debtors-v1` | Published when a demographics record is modified or soft-deleted. The payload includes a list of the fields that were changed. |

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`ProfilesModule`:** Used extensively to verify that the requesting user's organization has legitimate access to the debtor profile before any demographics operation is attempted.
-   **`EventsModule`:** Provides the `EventPublisher` for dispatching domain events.
-   **`core` module:** Provides the `RequestContext` service, which is used to retrieve the `organizationId` and `userId` for access control and audit logging.

### External Integrations

-   **`@nestjs/config`:** Used to retrieve the `SSN_ENCRYPTION_KEY` from the environment.
-   **Node.js `crypto`:** Used for all SSN encryption and hashing operations.
-   **TypeORM / PostgreSQL:** For storing the `DebtorDemographics` entity.

---

## 8. Gaps & Future Work

-   **External Audit System:** The `logAccess` method contains a `TODO` to integrate with an external, dedicated audit logging system for enhanced compliance and long-term storage of access records.
-   **Encryption Key Management:** The SSN encryption key is currently managed as an environment variable. For higher security environments, this could be integrated with a dedicated key management service (KMS) like Google Cloud KMS or HashiCorp Vault.
-   **Hard Deletion/Anonymization:** While soft deletion is the default, a future enhancement could involve a separate, highly-privileged administrative process for permanently deleting or anonymizing PII data after a defined retention period to comply with data disposal policies.
