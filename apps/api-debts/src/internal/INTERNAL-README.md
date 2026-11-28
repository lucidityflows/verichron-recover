# `internal` Feature Module

## 1. Overview

The `internal` module contains features and endpoints that are **not intended for public or external consumption**. These are service-to-service APIs used by other components within the Verichron platform, such as the event orchestrator, to gather aggregated data for building complex UI components like dashboards and analytics visualizations.

Currently, this module contains one primary feature: **Analytics**.

---

## 2. Analytics Feature

### Ownership & Boundaries

-   **What This Feature Owns:**
    -   The business logic for **aggregating and summarizing** debt and portfolio data for analytical purposes.
    -   A set of read-only, internal-facing REST endpoints designed specifically to serve data to other backend services.

-   **What This Feature Does NOT Own:**
    -   It does not own any entities. It is a **read-only** feature that queries the `Debt` and `Portfolio` entities managed by the `debts` and `portfolios` modules, respectively.
    -   It does not handle external authentication. It is expected to be called by trusted internal services, potentially using an API key or other internal auth mechanism.

### Entities

This feature module does not define or own any database entities.

---

## 3. Endpoints

All endpoints are prefixed with `/internal/analytics` and are for internal service-to-service communication only.

### `GET /dashboard-summary/:organizationId`

-   **Description:** Aggregates a wide range of debt and portfolio metrics to build a summary for the main manager dashboard.
-   **Parameters:** `organizationId` (string, UUID)
-   **Responses:**
    -   `200 OK`: Returns an `InternalDebtAnalytics` object containing `totalPortfolios`, `totalDebts`, `totalOutstanding`, `statusCounts`, and `topPortfolios`.

### `GET /recovery-trends/:organizationId`

-   **Description:** Retrieves debt data grouped by time period (e.g., daily, weekly, monthly) to build recovery trend charts.
-   **Parameters:** `organizationId` (string, UUID)
-   **Query Parameters:** `RecoveryTrendsInternalQueryDto` (includes `startDate`, `endDate`, `granularity`, `groupBy`, etc.)
-   **Responses:**
    -   `200 OK`: Returns `RecoveryTrendsDebtResponseDto` with an array of debt data points over time.

### `GET /portfolio-performance/:organizationId`

-   **Description:** Retrieves debt statistics for each portfolio, used for portfolio performance analytics.
-   **Parameters:** `organizationId` (string, UUID)
-   **Query Parameters:** `PortfolioPerformanceInternalQueryDto` (includes `startDate`, `endDate`, `portfolioTag`, etc.)
-   **Responses:**
    -   `200 OK`: Returns `PortfolioPerformanceDebtResponseDto` with an array of metrics for each portfolio.

### `GET /flow/:organizationId`

-   **Description:** Retrieves debt data grouped by a specific dimension, designed for building Sankey flow diagrams.
-   **Parameters:** `organizationId` (string, UUID)
-   **Query Parameters:** `FlowAnalyticsInternalQueryDto` (specifies the `view` or dimension, e.g., `DEBT_CATEGORY`, `PORTFOLIO`).
-   **Responses:**
    -   `200 OK`: Returns `FlowAnalyticsDebtResponseDto` with data grouped by the requested dimension.
-   **Note:** This endpoint currently only handles `DEBT_CATEGORY` and `PORTFOLIO` dimensions. It returns an empty array for other dimensions, assuming they are handled by other microservices.

### `GET /debt-portfolio-map/:organizationId`

-   **Description:** A lightweight, high-performance endpoint that returns a simple map of debt IDs to their corresponding portfolio IDs. This is used by the event orchestrator to efficiently link data from different services (e.g., payments from `api-transactions`) to a portfolio without needing to query the full debt object.
-   **Parameters:** `organizationId` (string, UUID)
-   **Query Parameters:** `portfolioIds` (string, optional, comma-separated): Filters the map to specific portfolios.
-   **Responses:**
    -   `200 OK`: Returns a JSON object `Record<string, string>` where the key is a `debtId` and the value is its `portfolioId`.

### `GET /geographic/debts-by-state/:organizationId`

-   **Description:** Aggregates financial metrics for debts based on the debtor's state. Used for geographic map visualizations.
-   **Parameters:** `organizationId` (string, UUID)
-   **Query Parameters:** `GeographicDebtsQueryDto` (includes `states`, `portfolioId`, etc.)
-   **Responses:**
    -   `200 OK`: Returns `GeographicDebtsResponseDto` containing total debt value and an array of metrics per debtor profile. The orchestrator is expected to join this with address data from `api-debtors` to get the final state-by-state aggregation.

### `GET /geographic/creditors/:organizationId`

-   **Description:** Intended to aggregate creditor and debt data by the original creditor's location.
-   **Parameters:** `organizationId` (string, UUID)
-   **Query Parameters:** `GeographicCreditorsQueryDto`
-   **Responses:**
    -   `200 OK`: Returns `GeographicCreditorsResponseDto`.
-   **Gap:** This endpoint is currently **non-functional and returns placeholder data**. The implementation is blocked pending schema updates to link debts to creditor entities and to store creditor addresses.

### `GET /debtor-focus/:organizationId/:debtorProfileId`

-   **Description:** Retrieves all debts and aggregated totals for a single debtor profile. Used to build the "Debtor Focus" view for collectors.
-   **Parameters:** `organizationId` (string, UUID), `debtorProfileId` (string, UUID)
-   **Responses:**
    -   `200 OK`: Returns `DebtorFocusDebtsResponseDto` with a list of all debts and summary totals.

---

## 4. Key Concepts & Patterns

### Internal-Only API

This module is a clear example of an internal-facing API. It is not designed to be exposed to the public API gateway. Its purpose is to provide a coarse-grained, aggregated data source for other backend services, abstracting away the complexities of querying the `debts` and `portfolios` tables directly. This pattern is essential for building performant and maintainable UI orchestrators.

### Data Aggregation

The primary pattern in this module is data aggregation. The `InternalAnalyticsService` contains numerous complex TypeORM queries that use `SUM`, `AVG`, `COUNT`, and `GROUP BY` to transform raw entity data into meaningful analytical metrics.

---

## 5. Dependencies & Integrations

### Internal Dependencies

-   **`debts` module:** Imports the `Debt` entity for all its queries.
-   **`portfolios` module:** Imports the `Portfolio` entity for its queries.

### External Integrations

-   **PostgreSQL:** The database from which all data is read.

---

## 6. Gaps & Future Work

-   **Approximated "Top Portfolios" Logic:** The `getTopPortfolios` method in the service calculates `totalCollected` using a "rough approximation" based on debt status and principal vs. current balance. This is a **TODO** and should be updated to aggregate actual transaction data from the `api-transactions` service for accuracy.
-   **Non-Functional `getGeographicCreditors` Endpoint:** As noted in the code and endpoint list, this endpoint is a placeholder and does not work. It requires schema changes to `Debt` (to add `originalCreditorId`) and a way to look up creditor addresses.
-   **Incomplete Debtor Focus Data:** The `getDebtorDebts` method for the Debtor Focus view returns `null` for several key fields (`delinquentDate`, `chargeOffDate`, `lastPaymentAmount`) with `TODO` comments, as these fields are not yet on the `Debt` entity.
-   **Disabled Guards:** The `InternalAnalyticsController` does not have its `@UseGuards` decorator enabled. While the controller description mentions an `X-Internal-API-Key` check, the implementation is commented out, representing a **potential security gap** if this service is ever exposed, even internally.
