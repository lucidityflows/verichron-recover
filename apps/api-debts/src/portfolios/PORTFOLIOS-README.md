# `portfolios` Feature Module

## 1. Overview

The `portfolios` module is a core feature module within the `api-debts` microservice. It is responsible for managing debt portfolios, which are logical groupings of debt accounts. This module also owns the critical **Layer 2 authorization** mechanism for the entire `api-debts` service, controlling which internal users can access which debts.

## 2. Ownership & Boundaries

### What This Module Owns

-   **Portfolio CRUD Operations:** The complete lifecycle management for `Portfolio` entities.
-   **Portfolio Status Management:** Enforcing the portfolio lifecycle via a status state machine (e.g., `PROVISIONING` -> `ACTIVE` -> `SOLD`).
-   **User-Portfolio Access Control (Layer 2 Auth):** Manages the `UserPortfolioPermission` records, which grant specific users access to all debts within a specific portfolio.
-   **Portfolio Transfers:** Owns the logic for transferring a portfolio's ownership from one organization to another, a critical business operation representing a sale.
-   **Portfolio Metrics:** Aggregates metrics for portfolios, such as total debt count and total current balance.

### What This Module Does NOT Own

-   **Individual Debt Records:** It does not own the `Debt` entities themselves but has a read-only dependency on them to calculate metrics.
-   **User Identity (Layer 1 Auth):** It does not manage users. It relies on `RequestContext` to get the `userId` and permissions from a validated JWT.
-   **Event Infrastructure:** It uses the shared `@verichron/event-publisher` package to publish events but does not own the event bus itself.

---

## 3. Entities

### `Portfolio`

The primary entity of this module, representing a collection of debt accounts.

-   **Purpose:** To group debts for management, assignment, and authorization purposes.
-   **Key Fields:**
    -   `id` (string, UUID): Primary key.
    -   `organizationId` (string, UUID): The tenant organization that owns the portfolio.
    -   `name` (string): A human-readable name for the portfolio.
    -   `status` (enum: `PortfolioStatus`): The current lifecycle status (`PROVISIONING`, `ACTIVE`, `CLOSED`, `SOLD`).
    -   `purchaseDate` (Date): The date the portfolio was acquired.
    -   `purchasePrice` (string): The amount paid for the portfolio.
    -   `totalPrincipal` (string): The sum of all debt principal amounts in the portfolio, set during import.
    -   `portfolioTags` (string[]): User-defined tags for filtering and organization.
-   **Relations:**
    -   **`userPermissions`**: A one-to-many relationship to the `UserPortfolioPermission` entity.

### `UserPortfolioPermission`

A critical entity that forms the basis of Layer 2 authorization for the entire `api-debts` service.

-   **Purpose:** To create an explicit link between a user and a portfolio, granting that user access to all debts within that portfolio.
-   **Key Fields:**
    -   `userId` (string, UUID): Foreign key to a user record managed by `api-users`.
    -   `portfolioId` (string, UUID): Foreign key to the `Portfolio` entity.
-   **Relations:**
    -   **`portfolio`**: A many-to-one relationship back to the `Portfolio` entity.

---

## 4. Endpoints

All endpoints are prefixed with `/portfolios` and require JWT authentication.

### `POST /portfolios`

-   **Description:** Creates a new portfolio record, typically with a `PROVISIONING` status.
-   **Body:** `CreatePortfolioDto`
-   **Permissions:** `portfolio:create`
-   **Responses:**
    -   `201 Created`: Returns the newly created `PortfolioResponseDto`.
    -   `400 Bad Request`: For validation errors.

### `GET /portfolios`

-   **Description:** Retrieves a paginated list of portfolios for the organization, including aggregated metrics like `debtCount` and `totalCurrentBalance`.
-   **Query Parameters:** `QueryPortfoliosDto` (includes filters for status, price, search, and pagination).
-   **Permissions:** `portfolio:read`
-   **Responses:**
    -   `200 OK`: Returns a `PaginatedPortfolioResponseDto`.

### `GET /portfolios/:id`

-   **Description:** Retrieves a single, detailed portfolio record by its UUID, including aggregated metrics.
-   **Parameters:** `id` (string, UUID)
-   **Permissions:** `portfolio:read`
-   **Responses:**
    -   `200 OK`: Returns a `PortfolioResponseDto`.
    -   `404 Not Found`: If the portfolio is not found in the user's organization.

### `PATCH /portfolios/:id`

-   **Description:** Updates mutable fields on a portfolio record, such as its name or status.
-   **Parameters:** `id` (string, UUID)
-   **Body:** `UpdatePortfolioDto`
-   **Permissions:** `portfolio:update`
-   **Responses:**
    -   `200 OK`: Returns the updated `PortfolioResponseDto`.
    -   `400 Bad Request`: For invalid status transitions.
    -   `404 Not Found`: If the portfolio is not found.

### `DELETE /portfolios/:id`

-   **Description:** Intended to soft-delete a portfolio.
-   **Permissions:** `portfolio:delete`
-   **Note:** This endpoint is **not fully implemented in the MVP**. The controller comment recommends using a status transition to `CLOSED` instead.

### `POST /portfolios/:id/users`

-   **Description:** Assigns a user to a portfolio, granting them access to its debts (creates a `UserPortfolioPermission` record).
-   **Parameters:** `id` (string, UUID, portfolioId)
-   **Body:** `AssignUserDto` (`userId`)
-   **Permissions:** `portfolio:assign`
-   **Responses:**
    -   `201 Created`: On successful assignment.
    -   `409 Conflict`: If the user is already assigned to the portfolio.

### `DELETE /portfolios/:id/users/:userId`

-   **Description:** Revokes a user's access from a portfolio (deletes a `UserPortfolioPermission` record).
-   **Parameters:** `id` (string, UUID, portfolioId), `userId` (string, UUID)
-   **Permissions:** `portfolio:assign`
-   **Responses:**
    -   `204 No Content`: On successful revocation.
    -   `404 Not Found`: If the user does not have access to the portfolio.

### `GET /portfolios/:id/users`

-   **Description:** Retrieves a list of all users who have been granted access to a specific portfolio.
-   **Parameters:** `id` (string, UUID, portfolioId)
-   **Permissions:** `portfolio:read`
-   **Responses:**
    -   `200 OK`: Returns an array of `PortfolioUserAccessDto` objects.

### `POST /portfolios/:id/transfer`

-   **Description:** A critical operation to transfer ownership of a portfolio to another organization.
-   **Parameters:** `id` (string, UUID, portfolioId)
-   **Body:** `TransferPortfolioDto` (`newOrganizationId`, `transferDate`, etc.)
-   **Permissions:** `portfolio:transfer`
-   **Responses:**
    -   `200 OK`: Returns the updated `PortfolioResponseDto` with a `SOLD` status.
    -   `403 Forbidden`: If the transfer is not allowed (e.g., portfolio already sold).

---

## 5. Key Concepts & Patterns

### Layer 2 Authorization Hub

This module is the heart of the "Layer 2" authorization model. While other modules like `debts` *enforce* the check, this module *manages* the permissions. The `user_portfolio_permission` table is the source of truth for determining if an internal user (like a collector) can access a specific debt. All access is granted at the portfolio level for scalability.

### Portfolio Lifecycle & State Machine

Portfolios follow a strict lifecycle enforced by the `isValidPortfolioStatusTransition` helper function in `portfolios.service.ts`. The valid transitions are:
-   `PROVISIONING` -> `ACTIVE`
-   `ACTIVE` -> `CLOSED` or `SOLD`

Any attempt to make an invalid transition (e.g., from `SOLD` back to `ACTIVE`) will be rejected with an `InvalidPortfolioStatusTransitionException`.

### Portfolio Transfer Workflow

The `transfer` method orchestrates a complex business process representing the sale of a portfolio. It validates the transfer, updates the portfolio's `organizationId` and `status`, and then publishes a `PortfolioSold` event. It crucially does **not** update the debts or history records itself; it relies on other modules to subscribe to this event and handle those downstream effects, ensuring a decoupled architecture.

---

## 6. Events

### Published Events

The `portfolios.service.ts` publishes the following events after successful database operations:
-   `DEBTS_PORTFOLIO_CREATED`: After a new portfolio is created.
-   `DEBTS_PORTFOLIO_UPDATED`: After any update to a portfolio's metadata.
-   `DEBTS_PORTFOLIO_STATUS_CHANGED`: When a portfolio's status changes (e.g., to `ACTIVE`, `CLOSED`, or `SOLD`).
-   `DEBTS_PORTFOLIO_SOLD`: A specific, critical event published when a portfolio is transferred to a new organization.
-   `DEBTS_PORTFOLIO_USER_ACCESS_GRANTED`: When a user is assigned to a portfolio.
-   `DEBTS_PORTFOLIO_USER_ACCESS_REVOKED`: When a user's access is revoked.

### Subscribed Events

This module does not currently subscribe to any events.

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`debts` module:** Imports the `Debt` entity to perform aggregations for metrics (e.g., `debtCount`, `totalCurrentBalance`).
-   **`core` module:** Uses `RequestContext` for contextual data like `organizationId` and `userId`.
-   **`@verichron/event-publisher`:** The shared package for publishing domain events.

### External Integrations

-   **PostgreSQL:** The primary database for storing `Portfolio` and `UserPortfolioPermission` entities.
-   **GCP Pub/Sub:** The message bus where portfolio-related events are published.

---

## 8. Gaps & Future Work

-   **Disabled Guards:** The `PortfoliosController` has its `@UseGuards` decorator commented out. This is a **critical security gap** and needs to be enabled to enforce authentication and permissions.
-   **Unimplemented `remove` Endpoint:** The `DELETE /portfolios/:id` endpoint is a placeholder and has not been fully implemented. The current recommendation is to use a status transition to `CLOSED` instead of soft-deleting.
-   **Boolean-Only Access:** The `UserPortfolioPermission` entity currently only grants boolean (all or nothing) access. The `README` for the entity notes that a future enhancement could be to add a `permission_level` enum for more granular control (e.g., `READ_ONLY` vs. `COLLECTOR`).
