# `imports` Feature Module

## 1. Overview

The `imports` module is a critical backend processing engine within the `api-debtors` microservice. It has the single responsibility of processing debtor data originating from large-scale portfolio imports. This module is entirely event-driven, with no direct API endpoints. It acts as an orchestrator, consuming batches of debtor data, coordinating with other internal services to create the necessary identity and profile records, and publishing the results for other microservices to consume.

The core of this module is the `DebtorImportProcessor`, which is designed for resilience and idempotency, ensuring that even massive import jobs are handled reliably and without data duplication.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Event Listeners:** Owns the listeners (`PortfolioDebtorBatchReadyListener`) that subscribe to events from other services (like `api-debts`) to initiate the import process.
-   **Batch Orchestration:** The `DebtorImportProcessor` owns the high-level logic for iterating through batches of debtor data.
-   **Service Orchestration:** Manages the sequence of calls to other services required to process a single debtor:
    1.  `DebtorIdentityService` (to find or create a global identity).
    2.  `ProfilesService` (to find or create an organization-specific profile).
    3.  `ContactModule` services (to add contact info for new profiles).
-   **Error Handling and Retry Logic:** Owns the logic for catching errors during the processing of a single debtor, logging them, and allowing the rest ofthe batch to continue. It also determines if a failure is transient and should be retried.
-   **Result Aggregation and Publishing:** Responsible for publishing the `DEBTORS_IMPORT_BATCH_COMPLETED` event, which contains the mapping of original debtor data to newly created system IDs.

### What This Module Does NOT Own

-   **API Endpoints:** This module is "headless" and exposes no REST API.
-   **Database Entities:** It does not define or own any database entities; it is a pure-service module that orchestrates other data-access modules.
-   **Core Business Logic:** It does not implement the logic for creating identities, profiles, or contacts. It delegates these tasks to the specialized services that own that logic.
-   **Initial File Parsing:** It does not parse the original import file (e.g., a CSV). It expects to receive structured debtor data via events from the service that does (i.e., `api-debts`).

---

## 3. Entities & Endpoints

This module does not define any database entities and does not expose any API endpoints.

---

## 4. Key Concepts & Patterns

### Event-Driven Architecture

The entire import process is asynchronous and event-driven. This decouples `api-debtors` from the service initiating the import (`api-debts`) and allows for scalable, resilient processing.

1.  **Initiation:** `api-debts` parses an import file and publishes a `DEBTS_PORTFOLIO_DEBTOR_BATCH_READY` event containing a small batch of debtor records.
2.  **Consumption:** The `PortfolioDebtorBatchReadyListener` in this module subscribes to and receives this event.
3.  **Processing:** The listener passes the batch to the `DebtorImportProcessor`.
4.  **Orchestration:** The processor iterates through each debtor record, calling the `IdentityService`, `ProfilesService`, and `ContactModule` in sequence.
5.  **Notification:** After processing the entire batch, the processor publishes a `DEBTORS_IMPORT_BATCH_COMPLETED` event containing the results.
6.  **Upstream Consumption:** `api-debts` consumes this completion event to associate the newly created `debtorProfileId`s with its own debt records.

### Idempotent and Resilient Batch Processing

-   **Idempotency:** The incoming data from `api-debts` includes a `debtorKey`, a unique string generated from the debtor's PII. This key is used throughout the process to ensure that if a batch is processed more than once (e.g., due to a Pub/Sub retry), it will not create duplicate identity or profile records.
-   **Resilience:** The `DebtorImportProcessor` wraps each debtor's processing logic in a `try...catch` block. If a single record fails (e.g., due to invalid data), the error is logged, and the processor moves on to the next record. This prevents a few bad records from halting the entire import job. The `shouldRetry` logic further enhances this by flagging transient errors (like network timeouts) as retryable.

### Dynamic Batch Sizing

The `DebtorImportProcessor` includes a `calculateBatchSize` method that determines an optimal batch size based on the total number of debtors in an import. This strategy aims to balance throughput and resource consumption, using smaller batches for small jobs and larger batches for massive ones.

### All-or-Nothing Transactional Integrity

-   The `ImportsProcessor` performs all database write operations (creating `Portfolio`, `Debt`, `DebtDebtor`, `DebtOwnershipHistory`) within a single database transaction using TypeORM's `QueryRunner`.
-   If any step fails (e.g., a database error), the entire transaction is rolled back. This prevents partially imported, corrupt portfolios and ensures data consistency.

### Batch Processing & Transactional Isolation

The `PortfolioDebtorBatchReadyListener` uses a specific architectural pattern to handle high-volume event processing safely:

1.  **Singleton Listener**: The listener itself is a Singleton, required by the `@verichron/event-subscriber` discovery mechanism.
2.  **Request-Scoped Processor**: The `DebtorImportProcessor` is Request-Scoped to ensure each batch of 30-100 debtors is processed in a completely isolated environment (e.g., its own DB transaction context).
3.  **Dynamic Resolution**: To bridge these two scopes, the listener uses `ModuleRef.resolve()` with `ContextIdFactory` to spin up a fresh processor instance for every incoming event. This prevents state leakage between batches and ensures thread safety during parallel processing.

### Custom Exceptions

The module defines a set of custom exceptions in the `/errors` directory for clear and specific error handling:

---

## 5. Events

### Published Events

| Event Name | Event Constant | DTO | Topic | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Import Batch Completed** | `DEBTORS_IMPORT_BATCH_COMPLETED`| `ImportBatchCompletedDto` | `debtors-v1`| Published after a single batch of debtors has been processed. Contains the mappings and any errors. |

### Subscribed Events

| Event Name | Event Constant | Listening Class | Topic | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Debtor Batch Ready** | `DEBTS_PORTFOLIO_DEBTOR_BATCH_READY` | `PortfolioDebtorBatchReadyListener` | `debts-v1`| Triggers the processing of a batch of debtor records sent from `api-debts`. |

---

## 6. Dependencies & Integrations

### Internal Dependencies

-   **`IdentityModule`:** Used to find or create the global `DebtorIdentity` for each record.
-   **`ProfilesModule`:** Used to find or create the organization-specific `DebtorProfile`.
-   **`ContactModule`:** Used to create `DebtorAddress`, `DebtorEmail`, and `DebtorPhone` records for newly created profiles.
-   **`EventsModule`:** (A required TODO) Provides the `EventPublisher` for publishing completion events.

### External Integrations

-   **`api-debts` (via Pub/Sub):** The `imports` module is a direct consumer of events published by `api-debts` and publishes events that `api-debts` consumes, forming a tight, asynchronous integration for portfolio imports.
-   **GCP Pub/Sub:** The underlying message bus for all event communication.

---

## 8. Gaps & Future Work

-   **Sequential Batch Processing:** The documentation mentions parallel processing of batches as a post-MVP goal. The current implementation processes batches sequentially as they are received by the listener.
-   **Missing EventsModule Dependency:** The `imports.module.ts` file has a `TODO` to properly import the `EventsModule`, which is required for the `EventPublisher` to function.
