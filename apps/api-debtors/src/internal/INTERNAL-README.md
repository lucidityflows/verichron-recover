# `internal` Feature Module

## 1. Overview

The `internal` module contains features and endpoints that are **not intended for public or external consumption**. These are service-to-service APIs used by other components within the Verichron platform, such as an event orchestrator, to gather aggregated data for building complex UI components like dashboards and analytics visualizations.

Currently, this module contains one primary feature: **Analytics**. The purpose of these endpoints is to provide a coarse-grained, read-only data source for other backend services, abstracting away the data model of `api-debtors` and providing pre-aggregated metrics to improve performance.

---

## 2. Analytics Feature

### Ownership & Boundaries

-   **What This Feature Owns:**
    -   The business logic for **aggregating and summarizing** debtor profile and address data for analytical purposes.
    -   A set of read-only, internal-facing REST endpoints designed specifically to serve data to other backend services (e.g., an orchestrator).

-   **What This Feature Does NOT Own:**
    -   It does not own any entities. It is a **read-only** feature that queries the `DebtorProfileEntity` and `DebtorAddress` entities managed by the `profiles` module.
    -   It does not handle external authentication. It is expected to be called by trusted internal services, likely using an API key or other internal auth mechanism (`X-Internal-API-Key`) handled by a global guard.
    -   It does not own or calculate financial data. It provides debtor counts and demographic data, expecting the consuming orchestrator to merge this with financial data from other services like `api-debts`.

---

## 3. Endpoints

All endpoints are prefixed with `/internal/analytics` and are for internal service-to-service communication only.

### `GET /dashboard-summary/:organizationId`

-   **Description:** Aggregates top-level debtor metrics for an organization's main dashboard.
-   **Parameters:** `organizationId` (string, UUID)
-   **Responses:**
    -   `200 OK`: Returns an `InternalDebtorAnalytics` object containing `totalDebtors`.

### `GET /flow/:organizationId`

-   **Description:** Retrieves debtor data grouped by a specific dimension, intended for building Sankey-style flow diagrams.
-   **Parameters:** `organizationId` (string, UUID)
-   **Query Parameters:** `FlowAnalyticsInternalQueryDto` (specifies the `view` or dimension).
-   **Responses:**
    -   `200 OK`: Returns `FlowAnalyticsDebtorResponseDto` with data grouped by the requested dimension.
-   **Note:** This endpoint currently only supports the `STATE` dimension. It returns an empty array for other dimensions.

### `GET /geographic/debtors/:organizationId`

-   **Description:** Aggregates debtor counts by state for geographic map visualizations.
-   **Parameters:** `organizationId` (string, UUID)
-   **Query Parameters:** `GeographicDebtorsQueryDto` (e.g., filter by `states`, `startDate`).
-   **Responses:**
    -   `200 OK`: Returns a `GeographicDebtorsResponseDto`. This response contains two key parts:
        1.  `states`: An array of state-level data with `debtorCount`. Financial fields like `totalDebtValue` are explicitly set to `0`, as the orchestrator is expected to populate these.
        2.  `debtorStateMapping`: A raw mapping of `debtorProfileId` to `stateCode`. The orchestrator uses this to efficiently join debtor data with financial data from other services.

### `GET /debtor-focus/:organizationId/:debtorProfileId`

-   **Description:** A coarse-grained endpoint that retrieves a complete, detailed view of a single debtor profile, including all associated addresses, emails, and phones.
-   **Parameters:** `organizationId` (string, UUID), `debtorProfileId` (string, UUID).
-   **Responses:**
    -   `200 OK`: Returns a `DebtorFocusProfileResponseDto` containing all the necessary information to build a "Debtor Focus" UI view, avoiding multiple API calls from the frontend or orchestrator.

---

## 4. Key Concepts & Patterns

### Internal-Only API for Orchestration

This module is a clear example of an internal-facing API, a key component in a microservices architecture. It is not designed to be exposed to the public API gateway. Its purpose is to provide an aggregated and specialized data layer for a **backend-for-frontend (BFF)** or an **event orchestrator**. This pattern allows the UI to be powered by a single, coarse-grained API call to the orchestrator, which in turn efficiently gathers data from multiple microservices like this one.

### Data Aggregation and Partial Responsibility

The service's primary pattern is data aggregation. The `InternalAnalyticsService` contains several complex TypeORM queries using `COUNT`, `GROUP BY`, and `INNER JOIN` to transform raw entity data into meaningful analytical metrics.

A key design choice is **partial responsibility**. For example, the `getGeographicDebtors` endpoint calculates the `debtorCount` per state (which `api-debtors` owns) but returns `0` for `totalDebtValue` (which `api-debts` owns). It also provides a `debtorStateMapping` to empower the consuming orchestrator to easily merge the two datasets, ensuring each microservice remains the single source of truth for its own data.

---

## 5. Dependencies & Integrations

### Internal Dependencies

-   **`profiles` module:** Imports the `DebtorProfileEntity` and `DebtorAddress` entities for all its read-only queries.

### External Integrations

-   **Event Orchestrator / BFF:** This module is designed to be called by an internal orchestrator service.
-   **PostgreSQL:** The database from which all data is read.
-   **`@verichron/enums`:** Provides shared enums like `FlowDimension` and state constants for calculations.

---

## 6. Gaps & Future Work

-   **Limited Flow Analytics:** The `getFlowAnalytics` endpoint is minimal and only supports aggregation by `STATE`. Support for other dimensions could be added in the future.
-   **No Financial Data:** As designed, this module does not handle any financial calculations. The consuming service is always responsible for enriching the data provided by these endpoints with financial metrics from `api-debts` or `api-transactions`.
