# `analytics` Module

## 1. Overview

The `analytics` module is the primary API gateway and orchestrator for all business intelligence (BI) and reporting features within the Verichron platform. It provides a unified set of endpoints for clients to request complex, cross-service data aggregations for features like the main dashboard, recovery trends, portfolio performance, and geographic analysis.

While it exposes the public-facing API, its core responsibility is to initiate complex, event-driven workflows that are handled by a dedicated `event-orchestrator` service, which gathers and processes data from various domain-specific microservices.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **The Public Analytics API:** It owns the REST API contract and endpoints under `/orgs/:orgId/analytics/*`, which serve as the single entry point for all analytics queries.
-   **Orchestration Initiation:** It is responsible for initiating analytics workflows by publishing request events (e.g., `ANALYTICS_DASHBOARD_SUMMARY_REQUESTED`) using the `EventOrchestratorClient`.
-   **Client-Facing Response Management:** It owns the logic for waiting for a final, aggregated response from the orchestrator and returning it to the client that made the initial API request.

### What This Module Does NOT Own

-   **Data Aggregation Logic:** The complex logic for fetching data from multiple services and aggregating it resides in the `event-orchestrator` service, not in this module.
-   **Underlying Business Data:** It is a pure consumer of data. It does not own or store any of the underlying data related to debts, transactions, or users.
-   **Internal Endpoints:** It does not own the internal, HMAC-authenticated endpoints on other services that the `event-orchestrator` calls to fetch data.

---

## 3. Endpoints & Entities

This module does not define or own any database entities. It provides the following public-facing endpoints, which are protected by standard authentication and authorization guards.

**Note on Implementation Status:** As of the current version, only the `/dashboard-summary` endpoint is fully implemented. All other endpoints are defined and have complete DTO contracts but are stubbed to return a `503 Service Unavailable` error, pending implementation.

### Implemented Endpoints
-   `GET /orgs/:orgId/dashboard-summary`: **(Implemented)** - Provides high-level Key Performance Indicators (KPIs) for the main organization dashboard.

### Stubbed Endpoints (Awaiting Implementation)
-   `GET /orgs/:orgId/analytics/recovery-trends`: For time-series analysis of recovery rates.
-   `GET /orgs/:orgId/analytics/portfolio-performance`: For detailed ROI and performance metrics of debt portfolios.
-   `GET /orgs/:orgId/analytics/flow`: For generating Sankey diagram data to visualize debt and payment flows.
-   `/orgs/:orgId/analytics/geographic/*`: A full suite of 8 endpoints for geographic analysis (e.g., by debt age, creditor location, debtor location).

---

## 4. Key Concepts & Patterns

### API Gateway & Orchestrator Pattern
This module functions as an API Gateway specifically for analytics. When it receives a request, it does not perform the complex data aggregation itself. Instead, it validates the request, creates a unique correlation ID, and delegates the entire task to the `event-orchestrator` service by publishing a request event. This architecture keeps the `api-organizations` service lightweight and cleanly separates the API contract from the complex implementation details of cross-service data aggregation.

### Synchronous Communication over an Asynchronous Bus
A key pattern is the use of the `EventOrchestratorClient` to achieve synchronous, request-response style communication over the inherently asynchronous GCP Pub/Sub message bus. The flow is as follows:
1.  The `AnalyticsService` publishes a request event (e.g., `ANALYTICS_DASHBOARD_SUMMARY_REQUESTED`) to a specific topic.
2.  It then dynamically creates a temporary subscription to a "reply" topic, using a unique correlation ID to identify the response.
3.  The service then `await`s a response on this temporary subscription.
4.  The `event-orchestrator` service processes the request and publishes a completion event to the "reply" topic with the same correlation ID.
5.  The `AnalyticsService` receives the response, resolves the `await`, and returns the final aggregated data to the client via the initial HTTP response.

This provides the simple developer experience of a standard API call while retaining the scalability and resilience of a decoupled, event-driven backend.

### The Mapping Strategy for Cross-Context Aggregation
For complex queries like portfolio performance, the `event-orchestrator` employs a clever "mapping strategy" to aggregate data without violating bounded context principles. For example, to get payments per portfolio:
1.  The orchestrator first gets a paginated list of portfolios from `api-debts`.
2.  It then makes a second, lightweight call to `api-debts` to get a simple `{ debtId: portfolioId }` map for **only those specific portfolios**.
3.  Finally, it makes a `POST` request to an internal endpoint on `api-transactions`, sending the mapping in the request body. `api-transactions` can then use this map to aggregate its payment data by portfolio ID, a field it does not natively possess.

---

## 5. Events

### Published Events
This module's primary role is to publish **request** events that trigger orchestration workflows.

| Event Name | Event Constant | Purpose |
| :--- | :--- | :--- |
| **Dashboard Summary Requested** | `ANALYTICS_DASHBOARD_SUMMARY_REQUESTED` | Kicks off the workflow to gather data for the main dashboard. |
| **Recovery Trends Requested** | `ANALYTICS_RECOVERY_TRENDS_REQUESTED`| Triggers the aggregation of time-series recovery data. |
| **Portfolio Performance Requested**|`ANALYTICS_PORTFOLIO_PERFORMANCE_REQUESTED`| Triggers the aggregation of portfolio-level ROI and performance metrics. |
| **...and others** | | Each analytics feature has a corresponding request event. |

### Subscribed Events
The `DebtorProfileCreatedListener` is a minor component of this module that subscribes to `DEBTORS_PROFILE_CREATED` events. For the MVP, it only logs the event, but it is intended to be used in the future to update cached analytics counters.

---

## 6. Dependencies & Integrations

### Internal Dependencies
-   **`events` module:** Provides the crucial `EventOrchestratorClient` for initiating workflows and the standard `EventPublisher`.
-   **`profiles` module:** The service queries the `Organization` repository to verify that the requested organization exists before proceeding.

### Key Downstream Integrations
-   **`event-orchestrator` (Service):** The primary consumer of this module's request events and the engine that performs the actual work.
-   **`api-debts`, `api-transactions`, etc.:** These domain services expose internal, HMAC-authenticated endpoints that the `event-orchestrator` calls to fetch data.

---

## 7. Implementation Status & Future Work

-   **Current State:** Only the `GET /orgs/:orgId/dashboard-summary` endpoint is fully implemented and functional. All other analytics endpoints are defined with complete DTOs but are currently stubbed in the service layer to throw a `503 Service Unavailable` exception.
-   **Proven Architecture:** The successful implementation of the dashboard summary serves as a robust and proven template for implementing the remaining nine analytics features.
-   **Future Work:** The implementation of the remaining analytics features will involve a systematic process for each:
    1.  Defining the corresponding `REQUESTED` and `COMPLETED` events.
    2.  Building the required internal data aggregation endpoints in the relevant domain microservices (e.g., `api-debts`, `api-transactions`).
    3.  Implementing the orchestration handler within the `event-orchestrator` service.
    4.  Removing the stub and enabling the final `orchestratorClient.request()` call in this module's `AnalyticsService`.
-   **Documentation:** This module contains extensive design documents (`analytics-flow-guide.md`, `analytics-portfolio-performance-guide.md`, etc.) that provide detailed blueprints for the implementation of the remaining features.
