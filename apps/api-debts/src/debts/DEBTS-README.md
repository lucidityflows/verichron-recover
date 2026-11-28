# `debts` Feature Module

## 1. Overview

The `debts` module is the core feature module within the `api-debts` microservice. It is responsible for the entire lifecycle, business logic, and data management of individual debt accounts. It also manages the many-to-many relationship between debts and debtors and includes a high-performance read model for debtor-specific queries.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **CRUD Operations for Debts:** Complete create, read, update, and delete (soft delete) logic for debt records.
-   **Debt State Management:** Enforcing the debt lifecycle via a status state machine (e.g., `IMPORTED` -> `ACTIVE`).
-   **Debt-Debtor Associations:** Managing the link between a debt and one or more debtor profiles.
-   **Business Rule Enforcement:** Validating immutable fields, uniqueness constraints (e.g., `accountNumber`), and status transitions.
-   **CQRS Read Model:** Owns the Redis-based read model for fast queries of a debtor's own debts (`/my-debts` endpoint).

### What This Module Does NOT Own

-   **Portfolio Management:** It depends on the `portfolios` module for portfolio information and Layer 2 authorization checks.
-   **Debtor Profiles:** It does not own debtor profile data. It only stores a `debtorProfileId` (UUID) as a foreign key reference to a record managed by `api-debtors`.
-   **User/Organization Context:** It relies on `RequestContext` (provided globally) to get the `organizationId`, `userId`, roles, and permissions for authorization and data scoping.

---

## 3. Entities

### `Debt`

This is the primary entity for the module, representing an individual debt account.

-   **Purpose:** To store all financial details, status, and metadata related to a single debt.
-   **Key Fields:**
    -   `id` (string, UUID): Primary key.
    -   `organizationId` (string, UUID): The tenant that owns this debt. **Denormalized** for performance and security.
    -   `portfolioId` (string, UUID): The portfolio this debt belongs to.
    -   `accountNumber` (string): The original creditor's account number. **Unique within an organization.**
    -   `principalAmount` (string): The original debt amount. **Immutable.**
    -   `interestAmount` (string): Accrued interest.
    -   `feesAmount` (string): Additional fees.
    -   `currentBalance` (string): The current outstanding balance, calculated by the service.
    -   `status` (enum: `DebtStatus`): The current lifecycle status of the debt.
    -   `originalDebtDate` (Date): The date the original debt was incurred. **Immutable.**
-   **Relations:**
    -   **`debtorLinks`**: A one-to-many relationship to the `DebtDebtor` entity, linking this debt to potentially multiple debtor profiles.

### `DebtDebtor`

This is a join table entity representing the many-to-many relationship between debts and debtors.

-   **Purpose:** To create an association between a `Debt` and a `debtorProfileId`.
-   **Key Fields:**
    -   `debtId` (string, UUID): Foreign key to the `Debt` entity.
    -   `debtorProfileId` (string, UUID): Foreign key reference to a debtor profile managed by `api-debtors`.
-   **Relations:**
    -   **`debt`**: A many-to-one relationship back to the `Debt` entity.

---

## 4. Endpoints

All endpoints are prefixed with `/debts` and require JWT authentication.

### `POST /debts`

-   **Description:** Creates a new debt record. Primarily used by the bulk import process.
-   **Body:** `CreateDebtDto`
-   **Permissions:** `debt:create`
-   **Responses:**
    -   `201 Created`: Returns the newly created `DebtResponseDto`.
    -   `400 Bad Request`: If input data fails validation (e.g., non-positive `principalAmount`).
    -   `409 Conflict`: If a debt with the same `accountNumber` already exists in the organization.

### `GET /debts`

-   **Description:** Retrieves a paginated list of debts. Results are automatically filtered based on the user's organization and their access to specific portfolios (Layer 2).
-   **Query Parameters:** `QueryDebtsDto`
    -   `page` (number, optional, default: 1)
    -   `pageSize` (number, optional, default: 20)
    -   `orderBy` (enum: `DebtSortField`, optional, default: `created_at`)
    -   `order` (enum: `SortOrder`, optional, default: `DESC`)
    -   `status` (enum[]: `DebtStatus`, optional)
    -   `portfolioId` (string, optional)
    -   `minBalance` / `maxBalance` (number, optional)
    -   `search` (string, optional): Searches `accountNumber` and `originalCreditorName`.
    -   `debtorProfileId` (string, optional)
-   **Permissions:** `debt:read`
-   **Responses:**
    -   `200 OK`: Returns a `PaginatedDebtResponseDto`.

### `GET /debts/my-debts`

-   **Description:** A special, high-performance endpoint for **DEBTOR users only** to view their own debts within a specific organization.
-   **Query Parameters:**
    -   `pageSize` (number, optional, default: 100)
    -   `offset` (number, optional, default: 0)
-   **Headers:**
    -   `x-org-id` (string, **required**): Specifies the organization context to view debts for.
-   **Permissions:** `debtor:self:read`
-   **Responses:**
    -   `200 OK`: Returns a `PaginatedDebtResponseDto` containing debt summaries.
-   **Note:** This endpoint is powered by the **Redis Read Model** for fast responses.

### `GET /debts/:id`

-   **Description:** Retrieves a single, detailed debt record by its UUID.
-   **Parameters:** `id` (string, UUID)
-   **Permissions:** `debt:read`
-   **Responses:**
    -   `200 OK`: Returns a `DebtResponseDto`.
    -   `403 Forbidden`: If the user lacks access to the debt's portfolio (Layer 2 failure).
    -   `404 Not Found`: If the debt ID does not exist or is outside the user's organization.

### `PATCH /debts/:id`

-   **Description:** Updates mutable fields on a debt record. Access to specific fields is permission-based.
-   **Parameters:** `id` (string, UUID)
-   **Body:** `UpdateDebtDto`
-   **Permissions:**
    -   `debt:update:notes`: Allows updating `notes` and `status`.
    -   `debt:update`: Allows updating `notes`, `status`, `interestAmount`, and `feesAmount`.
-   **Responses:**
    -   `200 OK`: Returns the updated `DebtResponseDto`.
    -   `400 Bad Request`: For invalid status transitions or attempts to modify immutable fields.
    -   `404 Not Found`: If the debt ID does not exist.

### `DELETE /debts/:id`

-   **Description:** Performs a "soft delete" by changing the debt's status to `CHARGED_OFF`. Debts are never permanently deleted to maintain an audit trail.
-   **Parameters:** `id` (string, UUID)
-   **Permissions:** `debt:delete`
-   **Responses:**
    -   `204 No Content`: On successful archival.
    -   `404 Not Found`: If the debt ID does not exist.

---

## 5. Key Concepts & Patterns

### Two-Layer Authorization

This module is a primary enforcer of the system's two-layer authorization model for internal users (Collectors, Managers, etc.):
-   **Layer 1 (Global):** The `@Permissions` decorator on each endpoint checks for general capabilities (e.g., `debt:read`). This is handled by a global guard.
-   **Layer 2 (Instance-Level):** Inside the service methods (`findOne`, `update`, `remove`), a call to `checkPortfolioAccess` verifies that the user has been explicitly granted access to the specific portfolio the debt belongs to. This prevents a user with `debt:read` from reading debts in portfolios they are not assigned to.

### CQRS & Redis Read Model

-   **Purpose:** To provide a highly performant read path for the `GET /my-debts` endpoint, used by DEBTOR users.
-   **Mechanism:**
    1.  The `debt-index.service.ts` manages denormalized indexes in Redis.
    2.  The `debtor-user-linked.listener.ts` subscribes to the `DebtorUserLinked` event from `api-debtors` to build the initial index for a user.
    3.  The `debt-created.listener.ts` subscribes to local `DebtCreated` events to incrementally update the index.
-   **Fallback:** If the Redis index is not yet built, the `findMyDebts` service method currently returns an empty array. **(See Gaps section).**

### Immutable Fields

To ensure data integrity and a clear audit trail, the following fields on the `Debt` entity are **immutable** after creation:
-   `principalAmount`
-   `originalDebtDate`
-   `accountNumber`
-   `organizationId`
-   `portfolioId` (requires a special transfer process, not a simple update)

Attempts to modify these via the `PATCH` endpoint are blocked and will result in an error.

### Custom Exceptions

The module defines a set of custom exceptions in the `/errors` directory to provide clear, specific error responses:
-   `DebtNotFoundException` (404)
-   `DuplicateAccountNumberException` (409)
-   `ImmutableFieldModificationException` (400)
-   `InvalidStatusTransitionException` (400)
-   `PortfolioAccessDeniedException` (403)

---

## 6. Events

### Published Events

-   `DEBTS_DEBT_CREATED`: Published via `EventPublisher` in `debts.service.ts` after a new debt is successfully created and committed to the database. The payload includes key identifiers like `debtId`, `debtorIdentityId`, and `organizationId`.
-   `DEBTS_DEBT_UPDATED`: Published after any successful update to a debt.
-   `DEBTS_DEBT_STATUS_CHANGED`: Published only when a debt's `status` field is successfully changed.

### Subscribed Events

-   `DEBTORS_IMPORT_BATCH_COMPLETED` (from `api-debtors`): Handled by `debtor-import-batch-completed.listener.ts` to create the `DebtDebtor` associations after debtor profiles have been created by `api-debtors`.
-   `DEBTORS_USER_LINKED` (from `api-debtors`): Handled by `debtor-user-linked.listener.ts` to trigger the initial build of the Redis read model for a DEBTOR user.
-   `DEBTS_DEBT_CREATED` (local): Handled by `debt-created.listener.ts` to incrementally update the Redis read model.

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`portfolios` module:** The `debts` module imports the `UserPortfolioPermission` entity from the `portfolios` module to perform Layer 2 authorization checks.
-   **`core` module:** Relies on `RequestContext` for user/org context and `addCurrency` for safe financial calculations.
-   **`events` module:** Imports `EventPublisher` and event DTOs/constants.
-   **`redis` module:** Injects `RedisService` for the CQRS read model implementation.

### External Integrations

-   **PostgreSQL:** The primary write-model database, accessed via TypeORM.
-   **Redis:** The read-model database for the CQRS pattern.
-   **GCP Pub/Sub:** Used for publishing and subscribing to events (via `@verichron/event-publisher` and `@verichron/event-subscriber`).

---

## 8. Gaps & Future Work

-   **Redis Fallback Incomplete:** The `findMyDebts` method currently returns an empty array if a user's debts are not found in the Redis cache. The "slow path" fallback to query PostgreSQL is not fully implemented, as it would require a synchronous call to another service (`api-debtors`) to map `userId` to `debtorProfileId`, which would violate the desired asynchronous, event-driven architecture.
-   **Hardcoded Currency:** The `DebtCreated` event payload currently hardcodes the currency as 'USD'. This should be made dynamic, likely sourced from the `CreateDebtDto` or organization-level configuration.
-   **Approximate Pagination Total:** The paginated response for `findMyDebts` returns `debts.length` as the `total`, which is only the total for the current page. An exact total would require a separate `ZCARD` query to Redis.
