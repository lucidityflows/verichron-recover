# `internal` Module

## 1. Overview

The `internal` module serves as a collection of internal-only-facing features within the `api-transactions` microservice. Its primary sub-module, `analytics`, is designed to provide aggregated transaction and payment plan metrics for other backend services, such as the `event-orchestrator` and `api-collectors`.

These endpoints are not intended for public consumption and are secured for service-to-service communication. The module acts as a specialized data source, encapsulating complex queries and aggregations to support analytics, dashboards, and reporting features across the platform.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Internal API Endpoints:** It owns all endpoints under the `/internal/` path, specifically `/internal/analytics/*`.
-   **Data Aggregation Logic:** It is responsible for the complex SQL/QueryBuilder logic required to efficiently aggregate raw transaction and payment plan data into meaningful metrics (e.g., trends, totals, and statistics).
-   **Data Provision for Internal Services:** Its primary role is to serve this aggregated data to other internal microservices that are responsible for user-facing dashboards and reports.

### What This Module Does NOT Own

-   **Business Entities:** This module is read-only. It does not own or define any of its own database entities but instead queries the tables managed by the `transactions` and `payment-plans` modules.
-   **Data Creation or Modification:** It does not create, update, or delete any records.
-   **User-Facing Presentation:** It is not responsible for the final presentation of analytics. It provides raw, aggregated data to consumer services, which then handle the UI/UX aspects of dashboards and reports.
-   **Cross-Service Joins:** It does not perform joins or queries across different microservice databases. For analytics requiring data from multiple domains (e.g., `api-debts` and `api-transactions`), it relies on the calling service to provide the necessary context (like a `debtToPortfolioMap`).

---

## 3. Endpoints

This module does not define any of its own entities but provides read-only, aggregated data from `TransactionHistory` and `PaymentPlan`. All endpoints are prefixed with `/internal/analytics`.

### `GET /dashboard-summary/:organizationId`

-   **Description:** Provides a high-level summary of transaction analytics for an organization, including collections by quarter and totals for the current day.
-   **Consumer:** `event-orchestrator` (for building main dashboards).

### `GET /recovery-trends/:organizationId`

-   **Description:** Returns time-series data of collected payments, grouped by a specified granularity (daily, weekly, monthly, etc.).
-   **Consumer:** `event-orchestrator` (for building trend charts).

### `POST /portfolio-performance/:organizationId`

-   **Description:** A complex endpoint that calculates performance metrics per portfolio. It requires the calling service to provide a `debtToPortfolioMap` in the request body, as this mapping is owned by `api-debts`.
-   **Consumer:** `event-orchestrator`.

### `GET /flow/:organizationId`

-   **Description:** Provides data grouped by a specific dimension, intended for use in Sankey flow diagrams. The primary supported view is by payment method.
-   **Consumer:** `event-orchestrator`.

### `GET /debtor-focus/:organizationId/:debtorProfileId`

-   **Description:** Gathers all financial activity for a single debtor, including their complete transaction history and the status of all their payment plans.
-   **Consumer:** `event-orchestrator` (for the collector's "debtor focus" view).

### `GET /collector-stats/:organizationId/:collectorUserId`

-   **Description:** Aggregates key performance indicators (KPIs) for a single collector over a specified time period, such as total amount collected and new payment plans created.
-   **Consumer:** `api-collectors`.

### `GET /organization-stats/:organizationId`

-   **Description:** Aggregates performance metrics for all collectors within an organization, sorted by total collections. Used for building leaderboards.
-   **Consumer:** `api-collectors`.

### `GET /collectors/:collectorUserId/dashboard-metrics`

-   **Description:** An optimized endpoint that returns both period-based and "today" metrics for a collector in a single call, designed to improve dashboard loading performance.
-   **Consumer:** `api-collectors`.

---

## 4. Key Concepts & Patterns

### Internal Data Provider

The `InternalAnalyticsService` serves as a classic example of an Internal Data Provider pattern. It encapsulates the domain-specific knowledge of how to query and aggregate transaction data, exposing this knowledge through a clean, internal-facing API. This prevents other services from needing to understand the complex table structures of `api-transactions`.

### Performance-Oriented Aggregation

The service leverages TypeORM's `QueryBuilder` and raw SQL functions (`EXTRACT`, `TO_CHAR`, `SUM`, `COUNT`) extensively. This pattern ensures that all heavy aggregation work is performed at the database level, which is highly efficient and minimizes the memory footprint and processing load on the application service itself.

### Orchestrator-Provided Context

For queries that require data from outside its bounded context (like portfolio information), this module relies on the calling service (the "orchestrator") to provide that context. For example, the `getPortfolioPerformance` endpoint requires a `debtToPortfolioMap`. This maintains service boundaries and avoids direct cross-database queries, a key principle in microservice architecture.

### Optimized, Use-Case-Specific Endpoints

The existence of endpoints like `getCollectorDashboardMetrics` demonstrates a pattern of creating specialized APIs tailored to a specific consumer's need. Instead of forcing the consumer to make multiple calls, this endpoint combines queries to provide a comprehensive payload in a single round-trip, optimizing front-end performance.

---

## 5. Events

This module is a pure data provider via its API endpoints. It does not publish or subscribe to any events on the GCP Pub/Sub message bus.

---

## 6. Dependencies & Integrations

### Internal Dependencies

-   **TypeORM:** Used to create `QueryBuilder` instances for accessing the `TransactionHistory`, `PaymentPlan`, and `PaymentPlanDebt` repositories.
-   **`transactions` & `payment-plans` Modules:** The module implicitly depends on the entities defined within these sibling modules.

### External Consumers (Cross-Service)

-   **`event-orchestrator`:** The primary consumer of this module's endpoints for building organization-level dashboards and analytics.
-   **`api-collectors`:** A key consumer for endpoints related to collector performance, stats, and leaderboards.

### External Integrations

-   **PostgreSQL:** The database from which all data is read and aggregated.

---

## 7. Gaps & Future Work

-   **Incomplete Analytics Views:** The `getFlowAnalytics` endpoint notes that the `PAYMENT_METHOD` view is not fully functional, as it depends on a `payment_method_type` column that needs to be properly populated in the `TransactionHistory` entity.
-   **Dependency on Orchestrator for Full Context:** Several endpoints cannot provide complete metrics on their own. For example, `getPortfolioPerformance` cannot calculate `avgDaysToFirstPayment` because it lacks access to the debt creation date from `api-debts`. This highlights that complex, cross-domain calculations must be completed by the consuming service.
-   **Filter Limitations:** The `getRecoveryTrends` method cannot filter by portfolio or debt category directly because that information is not stored in the `api-transactions` database. This reinforces the pattern where the orchestrator is responsible for pre-filtering a list of relevant IDs before calling this service.
