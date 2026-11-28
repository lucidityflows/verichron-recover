# `internal` Module

## 1. Overview

The `internal` module within the `api-communications` microservice provides aggregated communication metrics and historical data to other backend services. Its primary component, the `analytics` sub-module, acts as a specialized data source for building features like the "debtor focus" communication timeline and collector performance dashboards.

These endpoints are strictly for internal service-to-service use, are not exposed to the public, and are secured accordingly. This module encapsulates the complex queries required to derive meaningful insights from the raw communication logs stored in MongoDB.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Internal Analytics Endpoints:** It owns all endpoints under the `/internal/analytics` path, which are designed to be called by other microservices.
-   **Data Aggregation Logic:** It is responsible for the MongoDB Aggregation Framework queries used to efficiently calculate communication statistics, such as counts by type, open rates, and unique contacts.
-   **Data Provision for Internal Services:** Its core responsibility is to serve this aggregated data to consumers like the `event-orchestrator` and `api-collectors`.

### What This Module Does NOT Own

-   **Data Storage:** This module is read-only. It queries the `communication_logs` collection but does not own the schema or have write access. The `CommunicationLog` schema is owned by the `logs` module.
-   **User-Facing UI:** It is not responsible for the presentation of analytics. It provides the raw data that other services use to build dashboards and reports.
-   **Business Logic for Sending Communications:** It does not send emails or SMS messages; it only reports on the outcomes of communications sent by other modules.

---

## 3. Endpoints

This module does not define any of its own database schemas. It provides read-only, aggregated data from the `CommunicationLog` schema. All endpoints are prefixed with `/internal/analytics`.

### `GET /debtor-focus/:organizationId/:debtorProfileId`

-   **Description:** Retrieves the complete, chronologically sorted communication history for a single debtor.
-   **Consumer:** `event-orchestrator` (for building the "debtor focus" communication timeline).
-   **Returns:** A list of all communications and aggregated stats like total emails, total SMS, and last contact date.

### `GET /collector-stats/:organizationId/:collectorUserId`

-   **Description:** Aggregates communication performance metrics for a single collector over a specified time period.
-   **Consumer:** `api-collectors` (for individual performance dashboards).
-   **Returns:** Metrics such as total calls, emails, SMS, unique accounts contacted, and email open rate.

### `GET /organization-stats/:organizationId`

-   **Description:** Gathers communication statistics for all collectors within an organization, sorted for leaderboard purposes.
-   **Consumer:** `api-collectors` (for building leaderboards).
-   **Returns:** An array of `CollectorCommunicationStatsDto`, one for each collector.

### `GET /collectors/:collectorUserId/dashboard-metrics`

-   **Description:** An optimized endpoint that provides a comprehensive set of metrics for a collector's dashboard. It returns statistics for both a requested time period and for "today" in a single response to improve front-end loading performance.
-   **Consumer:** `api-collectors`.
-   **Returns:** `CollectorDashboardMetricsDto` containing both period-based and today's stats.

---

## 4. Key Concepts & Patterns

### Internal Data Provider Role

Architecturally, this module serves as an Internal Data Provider. It exposes a well-defined API for other backend services to query communication data without needing to know the underlying database technology (MongoDB) or schema details. This encapsulates the data-access logic and promotes a clean separation of concerns between services.

### MongoDB Aggregation Framework

The service heavily utilizes the MongoDB Aggregation Framework (via Mongoose's `.aggregate()` method) to perform all calculations. It uses pipeline stages like `$match`, `$group`, `$sum`, and `$addToSet` to run complex aggregations efficiently at the database level. This approach is highly performant, as it avoids fetching and processing large volumes of log documents within the application's memory.

### Optimized Dashboard Endpoints

The `getCollectorDashboardMetrics` endpoint is a prime example of a use-case-specific, optimized query. By fetching both historical period data and "today's" data in parallel using `Promise.all` and returning them in a single response, it significantly reduces the number of network round-trips required to render a collector's dashboard, leading to a much faster user experience.

---

## 5. Events

This module is a pure data provider and does not publish or subscribe to any events on the GCP Pub/Sub message bus.

---

## 6. Dependencies & Integrations

### Internal Dependencies

-   **`logs` module:** The service depends on the `CommunicationLog` Mongoose schema, which is defined and owned by the `logs` module. It uses this schema model to perform all its database queries.

### External Consumers (Cross-Service)

-   **`event-orchestrator`:** A primary consumer that calls the `/debtor-focus` endpoint to construct the communication timeline for a given debtor.
-   **`api-collectors`:** The main consumer of the `/collector-stats`, `/organization-stats`, and `/dashboard-metrics` endpoints, which it uses to power collector performance dashboards and leaderboards.

### External Integrations

-   **MongoDB:** The database where the `communication_logs` collection is stored. This service performs all its read and aggregation queries against this database.
