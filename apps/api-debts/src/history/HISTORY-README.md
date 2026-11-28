# `history` Feature Module

## 1. Overview

The `history` module is a critical component within the `api-debts` microservice, responsible for providing an immutable, auditable **chain of title** for debt ownership. Its primary purpose is to ensure legal compliance (e.g., FDCPA) and transparency by maintaining a permanent record of every ownership period for each debt.

The module is designed to be **append-only**, meaning records are never updated (except to close an ownership period by setting a `soldDate`) or deleted.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Debt Ownership History Records:** It is the single source of truth for the `DebtOwnershipHistory` entity, which tracks who owned which debt and for what period.
-   **Chain of Title Logic:** It owns the business logic for creating, closing, and querying ownership records, as well as verifying the chronological integrity of the ownership chain.
-   **Portfolio Transfer Event Handling:** It owns the listener that reacts to `PortfolioSold` events to update ownership records.

### What This Module Does NOT Own

-   **Debt or Portfolio Data:** It does not own the core `Debt` or `Portfolio` entities but has a read-only dependency on them (via `TypeOrmModule.forFeature`) to perform validation and authorization checks.
-   **User Permissions:** It relies on the `UserPortfolioPermission` entity from the `portfolios` module to perform Layer 2 authorization checks.
-   **Record Creation Triggers:** This module does **not** decide *when* to create history records. That logic resides in other modules (`imports`, `portfolios`), which call this module's service methods.

---

## 3. Entities

### `DebtOwnershipHistory`

This is the core entity of the module. Each record represents a single, continuous period of ownership for a specific debt by a specific organization.

-   **Purpose:** To serve as a permanent, immutable audit log for legal and compliance purposes.
-   **Key Fields:**
    -   `id` (string, UUID): Primary key.
    -   `debtId` (string, UUID): Foreign key to the `Debt` record.
    -   `organizationId` (string, UUID): The organization that owned the debt during this period.
    -   `acquiredDate` (Date): The date the organization acquired the debt.
    -   `soldDate` (Date | null): The date the organization sold the debt. A `null` value indicates this is the current owner.
    -   `source` (string): A description of how the debt was acquired (e.g., "Initial Import", "Portfolio Transfer").
    -   `createdAt` (Date): An immutable timestamp for when the record was created.
-   **Relations:** This entity has no outgoing relations. It is a terminal record containing foreign keys.

---

## 4. Endpoints

The `history` module exposes a single, read-only endpoint for querying the chain of title.

### `GET /debts/:debtId/ownership-history`

-   **Description:** Retrieves the complete, chronologically ordered ownership history for a single debt.
-   **Parameters:**
    -   `debtId` (string, UUID): The UUID of the debt to query.
-   **Query Parameters:** `QueryHistoryDto`
    -   `order` (enum: `ASC` | `DESC`, optional, default: `ASC`): The sort order for the history records based on `acquiredDate`.
-   **Permissions:** `debt:read`
-   **Authorization Notes:** This endpoint performs a Layer 2 authorization check, ensuring the user has access to the portfolio containing the requested debt.
-   **Responses:**
    -   `200 OK`: Returns a `DebtOwnershipChainResponseDto` containing the `debtId`, a list of `history` records, the `totalTransfers`, and the `currentOwnerId`.
    -   `401 Unauthorized`: Invalid or missing JWT.
    -   `403 Forbidden`: User lacks `debt:read` permission or access to the debt's portfolio.
    -   `404 Not Found`: If the specified `debtId` does not exist in the user's organization.
    -   `500 Internal Server Error`: Triggered if a data integrity violation is found (e.g., a debt has multiple current owners).

---

## 5. Key Concepts & Patterns

### Append-Only Audit Log

The core principle of this module is that `DebtOwnershipHistory` records are immutable. They are never deleted. When an ownership period ends, the existing record is "closed" by setting its `soldDate`, and a new record is created for the new owner. This ensures a permanent, tamper-evident audit trail.

### Service-Oriented Record Creation

The `HistoryController` is read-only. History records are created programmatically by other services:
-   The `Imports` service calls `historyService.bulkCreateHistoryRecords` when a new portfolio is ingested.
-   The `Portfolios` service (via the `PortfolioSoldListener`) calls `historyService.closeOwnershipRecords` and `historyService.bulkCreateHistoryRecords` when a portfolio is transferred.

### Data Integrity Verification

The `historyService.findDebtHistory` method contains a crucial data integrity check. It verifies that a debt has one and only one current owner (i.e., one history record with `soldDate` as `null`). If it finds more than one, it throws a `MultipleCurrentOwnersException` to signal a critical data corruption issue that needs immediate attention.

---

## 6. Events

### Subscribed Events

-   **`debts.portfolio.sold` (`PortfolioSold`):** Handled by `PortfolioSoldListener`. When a portfolio is transferred, this listener is responsible for:
    1.  Calling `historyService.closeOwnershipRecords` to set the `soldDate` for all debts in the portfolio.
    2.  Calling `historyService.bulkCreateHistoryRecords` to create new ownership records for all debts under the new owning organization.

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`debts` module:** Imports the `Debt` entity to validate that a debt exists and to get its `portfolioId` for authorization checks.
-   **`portfolios` module:** Imports the `UserPortfolioPermission` entity to perform Layer 2 authorization checks.
-   **`events` module:** Used to subscribe to the `PortfolioSold` event.

### External Integrations

-   **PostgreSQL:** The primary database for storing `DebtOwnershipHistory` entities.
-   **GCP Pub/Sub:** The message bus from which `PortfolioSold` events are received.

---

## 8. Gaps & Future Work

-   **Disabled Guards:** The `HistoryController` has its `@UseGuards` decorator commented out (`// Uncomment when guards are available`). This is a **critical security gap** and needs to be enabled to enforce authentication and permissions.
-   **Unusual Endpoint Path:** The endpoint is nested under `/debts/:debtId/ownership-history`. While functional, this is a design choice to note, as it logically belongs to the `history` domain but is accessed via a `debt` resource path.
