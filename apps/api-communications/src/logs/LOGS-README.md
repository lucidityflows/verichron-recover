# `logs` Module

## 1. Overview

The `logs` module is the persistence layer and source of truth for the `api-communications` microservice. It is responsible for creating and managing a durable, append-only, and auditable record of every communication attempt made by the system.

This module uses MongoDB as its data store, a choice made to handle the high volume and semi-structured nature of communication log data efficiently. It provides the foundational data store upon which all tracking, reporting, and auditing features are built.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **The `CommunicationLog` Schema:** It owns the Mongoose schema for `CommunicationLog` documents, which defines the structure for storing all communication data in MongoDB.
-   **Log Persistence Logic:** It owns the business logic for creating new log entries and, crucially, for updating the status of these entries as new events arrive from gateway webhooks.
-   **Status-Change Event Publishing:** It is responsible for publishing granular, specific events (e.g., `CommunicationDelivered`, `EmailOpened`) after a log's status has been successfully updated and persisted.
-   **Query Interface:** It provides a read-only API (`/logs`) and an injectable service for other internal modules to query the communication history.

### What This Module Does NOT Own

-   **Communication Dispatch:** It does not initiate communications; it only records the outcome of dispatches initiated by the `dispatch` module.
-   **Webhook Ingestion:** It does not directly receive webhook events from the internet. The `gateways` module receives and verifies these events, then calls this service to update the logs.

---

## 3. Entities (MongoDB Schemas)

### `CommunicationLog`

This is the primary schema for the module, representing a single communication event and its entire lifecycle journey in a single MongoDB document.

-   **Purpose:** To serve as an immutable and auditable log for every communication attempt. Its append-only design for status updates provides a complete, time-stamped history of each message.
-   **Key Fields:**
    -   `_id` (ObjectId): The unique identifier for the log entry.
    -   `organizationId` (string): The tenant that owns this communication.
    -   `debtorId` (string): The debtor the communication was sent to.
    -   `type` (enum: `CommunicationType`): The channel used (e.g., `EMAIL`, `SMS`).
    -   `status` (enum: `CommunicationStatus`): The *current* status of the communication (e.g., `SENT`, `DELIVERED`, `FAILED`).
    -   `providerMessageId` (string): The unique ID from the third-party gateway (e.g., SendGrid or Twilio). This is a critical field used for looking up logs when processing webhooks.
    -   `content` (object): The actual content that was sent, including the subject and body, for auditing purposes.
    -   `sentAt` / `deliveredAt` / `openedAt` / `clickedAt` (Date): Timestamps for key events in the communication lifecycle.
    -   `failureReason` (string | null): The reason for failure if the status is `FAILED`.
    -   `statusHistory` (array): An append-only array of `StatusHistoryEntry` objects. Each entry contains a status, a timestamp, and associated metadata, creating a complete and immutable audit trail of the communication's journey.

---

## 4. Endpoints

All endpoints are prefixed with `/logs` and are read-only.

### `GET /logs`

-   **Description:** Queries the communication logs with a comprehensive set of filters, including `debtorId`, `status`, `type`, and date ranges. Provides a paginated view of an organization's communication history.
-   **Query Parameters:** `QueryLogsDto`.
-   **Permissions:** Requires JWT authentication and is automatically scoped to the user's organization.

### `GET /logs/:id`

-   **Description:** Retrieves a single, detailed communication log by its MongoDB `_id`.
-   **Parameters:** `id` (string, ObjectId).
-   **Permissions:** Requires JWT authentication and is automatically scoped to the user's organization.

---

## 5. Key Concepts & Patterns

### MongoDB for High-Volume Logging

The choice of MongoDB is deliberate for this module. Its document-based structure is ideal for storing communication logs, which can have varied metadata depending on the provider and event type. It is optimized for the high-volume, write-heavy workload characteristic of logging systems.

### Append-Only Status History

A key design pattern in the `CommunicationLog` schema is the `statusHistory` array. When the status of a communication changes (e.g., from `SENT` to `DELIVERED`), the service does not overwrite the top-level `status` field directly. Instead, it pushes a new `StatusHistoryEntry` object onto the array and then updates the top-level `status` to reflect the latest state. This provides a complete, immutable audit trail of every step in the communication's lifecycle.

### Webhook-Driven Updates

The `updateStatusByProviderMessageId` method is the primary entry point for processing updates from the outside world. The `gateways` module calls this method after receiving and verifying a webhook event. The method uses the unique `providerMessageId` to efficiently find the corresponding log in the database and apply the status update.

### Granular Event Publishing

While the `dispatch` module publishes high-level events, the `LogsService` is responsible for publishing more specific, granular events *after* a status update has been successfully persisted. For example, when a log's status is updated to `DELIVERED`, this service publishes a `CommunicationDelivered` event. This ensures that downstream consumers are reacting to a verified and recorded state change, rather than an in-flight one.

---

## 6. Events

### Published Events

The `LogsService` publishes events when a communication's status is updated via a webhook.

| Event Name | Event Constant | DTO | Trigger |
| :--- | :--- | :--- | :--- |
| **Communication Delivered** | `COMMUNICATIONS_COMMUNICATION_DELIVERED` | `CommunicationDeliveredDto` | Status updated to `DELIVERED`. |
| **Email Opened** | `COMMUNICATIONS_COMMUNICATION_OPENED` | `EmailOpenedDto` | Status updated to `OPENED`. |
| **Communication Clicked** | `COMMUNICATIONS_COMMUNICATION_CLICKED` | `CommunicationClickedDto` | Status updated to `CLICKED`. |
| **Communication Failed** | `COMMUNICATIONS_COMMUNICATION_FAILED` | `CommunicationFailedDto` | Status updated to `FAILED` (e.g., bounce). |
| **Spam Reported** | `COMMUNICATIONS_COMMUNICATION_SPAM_REPORTED` | `CommunicationSpamReportedDto` | Status updated to `FAILED` with a spam report. |

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`@verichron/event-publisher`:** Injected to publish granular status update events to GCP Pub/Sub.
-   **Note:** This module is a foundational dependency for other modules. The `dispatch` and `gateways` modules both inject `LogsService` to create and update log records.

### External Integrations

-   **MongoDB:** The primary database for all communication logs, accessed via the `@nestjs/mongoose` library.

---

## 8. Gaps & Future Work

-   **TTL Index for Archival:** The `CommunicationLogSchema` file contains a commented-out TTL (Time-To-Live) index. This suggests a planned feature to automatically archive or delete logs after a certain period (e.g., 7 years) to manage data retention and comply with regulatory requirements. This is currently not enabled.
