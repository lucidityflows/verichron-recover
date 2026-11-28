# `verifications` Feature Module

## 1. Overview

The `verifications` module is a sophisticated, event-driven system responsible for orchestrating the validation and enrichment of debtor data through third-party providers. It manages the entire lifecycle of a verification request—from initial creation, through asynchronous processing, to the final storage of results.

This module is built on an extensible **provider pattern**, allowing different types of verifications (e.g., address, phone, email, skip tracing) to be handled by dedicated, interchangeable service providers. It exposes a set of API endpoints for requesting verifications and retrieving their history and status, while the actual processing happens asynchronously in the background.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Verification Request Lifecycle:** Manages the `VerificationRequest` entity, which acts as a comprehensive log for every verification attempt, tracking its status, inputs, results, cost, and timestamps.
-   **API Endpoints:** Owns all endpoints under `/debtors/:debtorId/verifications` for requesting verifications and querying their status and results.
-   **Provider Abstraction & Orchestration:** Owns the `IVerificationProvider` interface and the core `VerificationService` logic that selects and invokes the correct provider based on the `verificationType`.
-   **Asynchronous Workflow Management:** Orchestrates an async, state-driven workflow for processing requests (`PENDING` -> `IN_PROGRESS` -> `VERIFIED`/`FAILED`/`ERROR`).
-   **Event Publishing:** Publishes events for key lifecycle moments (`VerificationRequested`, `VerificationCompleted`, `VerificationFailed`).
-   **Retry Logic:** Contains logic to retry verifications that have previously failed.

### What This Module Does NOT Own

-   **Provider Implementations:** While it defines the provider interface, it does not own the specific business logic of the external services (e.g., USPS, Twilio). It simply orchestrates calls to them.
-   **Debtor Profiles:** It depends on the `ProfilesModule` to validate access and to link verification requests to a debtor.
-   **Event Subscription Infrastructure:** It defines an event handler (`VerificationProcessor`) but does not own the Pub/Sub subscription infrastructure itself.

---

## 3. Entities

### `VerificationRequest`

This is the central entity of the module, acting as a ledger for a single verification attempt.

-   **Purpose:** To create a persistent record of a verification request, its status, the data provided, and the results returned by the external provider.
-   **Key Fields:**
    -   `id` (string, UUID): The primary key.
    -   `debtorProfileId` / `organizationId` (string, UUID): Foreign keys for data linkage and tenancy.
    -   `verificationType` (enum: `VerificationType`): The type of check being performed (e.g., `ADDRESS_VERIFICATION`).
    -   `status` (enum: `VerificationRequestStatus`): The current state of the request in its lifecycle.
    -   `inputData` (jsonb): The data sent to the provider for verification.
    -   `result` (jsonb): The structured data returned by the provider.
    -   `provider` (string): The name of the provider that handled the request (e.g., `USPS_STUB`).
    -   `confidenceScore` / `costCents` (number): Key metrics returned by the provider.
    -   `retryCount` (number): Tracks the number of retry attempts.

---

## 4. Endpoints

All endpoints are prefixed with `/debtors/:debtorId/verifications` and require JWT authentication.

### `GET /`

-   **Description:** Retrieves a paginated and filterable list of all verification requests for a specific debtor.
-   **Permissions:** `verification:read`
-   **Responses:** `200 OK` with a `PaginatedVerificationRequestsDto`.

### `POST /`

-   **Description:** Creates and queues a new verification request. This is an **asynchronous** operation. The response indicates that the request was successfully created, not that it has been completed.
-   **Permissions:** `verification:create`
-   **Responses:** `201 Created` with the initial `VerificationRequest` object (status: `PENDING`).

### `GET /:id`

-   **Description:** Retrieves the detailed record of a single verification request, including its current status and the final `result` if completed.
-   **Permissions:** `verification:read`
-   **Responses:** `200 OK` with a `VerificationRequest` object.

### `POST /:id/retry`

-   **Description:** Initiates a retry for a verification that is in a `FAILED` or `ERROR` state. This increments the `retryCount` and resets the status to `PENDING` to re-trigger the processing workflow.
-   **Permissions:** `verification:create`
-   **Responses:** `200 OK` with the updated `VerificationRequest` object.

### `GET /statistics`

-   **Description:** Retrieves aggregated statistics for a debtor's verifications, including total counts and breakdowns by status and type.
-   **Permissions:** `verification:read`
-   **Responses:** `200 OK` with a `VerificationStatisticsDto`.

---

## 5. Key Concepts & Patterns

### Provider Abstraction Pattern

This module is a prime example of the Strategy design pattern.
1.  An `IVerificationProvider` interface defines a common contract (`verify`, `getProviderName`, `getCost`).
2.  Concrete classes (`AddressVerificationProvider`, `EmailVerificationProvider`, etc.) implement this interface for specific verification types.
3.  The `VerificationService` acts as the context. Its `getProvider` method is a factory that resolves the `verificationType` to the correct concrete provider instance at runtime.
This makes the system highly extensible, as adding a new verification type (e.g., for bank accounts) is as simple as creating a new provider class and adding it to the factory method.

### Asynchronous Event-Driven Workflow

The verification process is designed to be fully asynchronous to handle potentially long-running calls to third-party APIs without blocking the main request thread.

1.  **Request:** The `POST /` endpoint creates a `VerificationRequest` record with `status: PENDING`.
2.  **Dispatch:** It immediately fires a `DEBTORS_VERIFICATIONS_VERIFICATION_REQUESTED` event.
3.  **Process (Async):** A separate process (simulated in the MVP, but intended to be a Pub/Sub consumer) listens for this event. The `VerificationProcessor` class demonstrates this. Upon receipt, it calls `verificationService.processVerification()`.
4.  **Execute:** The service updates the request status to `IN_PROGRESS`, calls the appropriate provider's `verify()` method, and awaits the result.
5.  **Complete:** The service updates the request record with the results and a final status (`VERIFIED`, `FAILED`, or `ERROR`).
6.  **Notify:** It publishes a final `...COMPLETED` or `...FAILED` event to notify other parts of the system.

### Stub Providers for Development

The current implementation includes several **stub providers** (`AddressVerificationProvider`, `SkipTraceProvider`, etc.). These stubs do not make real API calls. Instead, they return mock data and simulate network latency with a `delay`. This pattern is crucial for developing and testing the orchestration logic without relying on (and paying for) live third-party services.

---

## 6. Events

### Published Events

| Event Name | Event Constant | DTO | Topic | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Verification Requested** | `DEBTORS_VERIFICATIONS_VERIFICATION_REQUESTED` | `VerificationRequestedDto` | `debtors-v1` | Published when a new verification is requested, initiating the async workflow. |
| **Verification Completed** | `DEBTORS_VERIFICATIONS_VERIFICATION_COMPLETED` | `VerificationCompletedDto` | `debtors-v1` | Published when a verification process finishes, indicating success or failure of the data itself. |
| **Verification Failed** | `DEBTORS_VERIFICATIONS_VERIFICATION_FAILED` | `VerificationFailedDto` | `debtors-v1` | Published when the verification process fails due to a system or provider error. |

### Subscribed Events

The module defines a `VerificationProcessor` class designed to listen for the `DEBTORS_VERIFICATIONS_VERIFICATION_REQUESTED` event and trigger the `VerificationService`.

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`ProfilesModule`:** Used to validate debtor profile access and link verifications correctly.
-   **`EventsModule`:** Provides the `EventPublisher` for dispatching events.
-   **`core` module:** Provides `RequestContext`, guards, and decorators.

### External Integrations

-   **(Conceptual) Third-Party APIs:** The module is designed to integrate with services like:
    -   **Address:** USPS, SmartyStreets, Melissa Data
    -   **Phone:** Twilio Lookup, Telesign
    -   **Email:** ZeroBounce, NeverBounce
    -   **Skip Trace:** TLOxp, LexisNexis, Accurint
-   **TypeORM / PostgreSQL:** For storing `VerificationRequest` entity records.

---

## 8. Gaps & Future Work

-   **Stub Implementations:** All current verification providers are stubs that return mock data. A major work item is to replace these stubs with actual implementations that call real third-party APIs.
-   **Incomplete Provider Coverage:** The `VerificationService`'s `getProvider` method throws a "not yet implemented" error for `SSN_VERIFICATION`, `IDENTITY_VERIFICATION`, and `EMPLOYMENT_VERIFICATION`, indicating these workflows are not yet built.
-   **Event Consumer Not Wired:** The `VerificationProcessor` event handler is defined but is not connected to a live Pub/Sub subscription. The processing is currently triggered by an in-memory `Promise`, which is not robust for production.
-   **Missing Dead-Letter Queue:** The error handling in the `VerificationProcessor` contains a `TODO` to implement a retry mechanism or dead-letter queue for events that repeatedly fail to process.
