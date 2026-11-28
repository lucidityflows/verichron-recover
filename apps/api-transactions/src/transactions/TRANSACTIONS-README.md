# `transactions` Feature Module

## 1. Overview

The `transactions` module is a cornerstone of the `api-transactions` microservice, responsible for managing the entire lifecycle of individual financial transactions. It handles one-time payments, processes scheduled payments triggered by payment plans, and manages refunds.

This module maintains an immutable, auditable log of every transaction, orchestrates calls to payment gateways, and publishes critical financial events used by other services across the platform.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Immutable Transaction History:** It is the single source of truth for the `TransactionHistory` entity, which serves as a permanent, append-only log of all payments and refunds.
-   **Transaction Lifecycle Management:** It owns the state machine for a transaction's status (e.g., `PENDING` → `PROCESSING` → `SUCCEEDED` / `FAILED`).
-   **Payment and Refund Orchestration:** It owns the core business logic for initiating payments and refunds, coordinating with the `gateways` and `documents` modules to complete the workflow.
-   **Event Publishing:** It is responsible for publishing key domain events such as `TransactionSucceeded`, `TransactionFailed`, and `RefundIssued`.

### What This Module Does NOT Own

-   **Payment Gateway Logic:** It does not interact directly with external payment providers. It delegates all gateway-specific communication to the `gateways` module.
-   **Document Generation:** It does not create PDF files. It requests document generation from the `documents` module after a transaction is successful.
-   **Payment Plan Logic:** It does not manage payment plans. It provides an internal endpoint for the `plans` module to call when processing a scheduled payment.
-   **Debt or Debtor Data:** It only stores foreign key references (`debtId`, `debtorId`) to entities managed by other microservices.

---

## 3. Entities

### `TransactionHistory`

This is the primary entity for the module, representing a single, immutable financial event.

-   **Purpose:** To serve as a permanent, tamper-evident audit log for every payment attempt, success, failure, or refund. Once a record reaches a terminal state (`SUCCEEDED`, `FAILED`, `REFUNDED`), it is never modified.
-   **Key Fields:**
    -   `id` (string, UUID): Primary key.
    -   `organizationId` (string, UUID): The tenant that owns this transaction. **Denormalized** for performance and security.
    -   `debtId` (string, UUID): The debt this transaction is applied to.
    -   `paymentPlanId` (string, UUID | null): The payment plan that generated this transaction (for scheduled payments).
    -   `amount` (number): The value of the transaction.
    -   `type` (enum: `PaymentType`): The type of transaction, either `PAYMENT` or `REFUND`.
    -   `status` (enum: `PaymentStatus`): The current lifecycle status of the transaction (e.g., `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `REFUNDED`).
    -   `paymentMethodToken` (string): The non-sensitive, tokenized reference to the payment method.
    -   `gatewayTransactionId` (string | null): The unique ID provided by the external payment gateway (e.g., a Stripe charge ID).
    -   `failureReason` (string | null): A detailed message if the transaction's status is `FAILED`.
    -   `idempotencyKey` (string, UUID): A unique key passed to the payment gateway to prevent duplicate operations.
    -   `originalTransactionId` (string, UUID | null): For `REFUND` transactions, this field references the original `PAYMENT` transaction being refunded.
-   **Relations:** This entity has no outgoing TypeORM relations. It is a terminal record containing foreign keys to other entities.

---

## 4. Endpoints

All endpoints are prefixed with `/transactions` and require JWT authentication.

### `POST /transactions`

-   **Description:** Creates and initiates a one-time payment. The API returns immediately with the transaction in a `PENDING` state, while processing occurs asynchronously.
-   **Body:** `CreateTransactionDto`
-   **Permissions:** `payment:create`
-   **Responses:**
    -   `201 Created`: Returns the newly created `TransactionHistory` object in `PENDING` status.
    -   `400 Bad Request`: If the request body fails validation.

### `GET /transactions`

-   **Description:** Retrieves a paginated and filterable list of transactions. Results are automatically scoped to the user's organization.
-   **Query Parameters:** `QueryTransactionsDto` (supports filtering by status, type, date range, and associated entity IDs).
-   **Permissions:** `payment:read`
-   **Responses:**
    -   `200 OK`: Returns a paginated list of transactions.

### `GET /transactions/:id`

-   **Description:** Retrieves detailed information for a single transaction by its UUID.
-   **Parameters:** `id` (string, UUID)
-   **Permissions:** `payment:read`
-   **Responses:**
    -   `200 OK`: Returns the `TransactionHistory` object.
    -   `404 Not Found`: If the transaction ID does not exist or is outside the user's organization.

### `POST /transactions/:id/refund`

-   **Description:** Initiates a full or partial refund for a previously `SUCCEEDED` payment. This creates a new `REFUND` transaction and marks the original as `REFUNDED`.
-   **Parameters:** `id` (string, UUID of the original payment transaction).
-   **Body:** `ProcessRefundDto`
-   **Permissions:** `payment:create`
-   **Responses:**
    -   `201 Created`: Returns the newly created `REFUND` transaction in `PENDING` status.
    -   `400 Bad Request`: If the refund is not allowed (e.g., original transaction not `SUCCEEDED`, refund amount exceeds original).
    -   `404 Not Found`: If the original transaction ID does not exist.

### `POST /transactions/internal/scheduled-payment`

-   **Description:** An **internal-only** endpoint designed to be called by the `plans` module to process scheduled payments. This endpoint is not exposed via the public API Gateway and should be secured with service-to-service authentication.
-   **Body:** `CreateScheduledPaymentDto`
-   **Permissions:** Internal service-level authentication.
-   **Responses:**
    -   `201 Created`: Returns the newly created scheduled payment transaction.

---

## 5. Key Concepts & Patterns

### Immutable Transaction History

The `TransactionHistory` entity is append-only, forming an immutable ledger. A transaction, once it reaches a terminal state (`SUCCEEDED`, `FAILED`), is never modified. Any subsequent actions, such as refunds or retries, generate new transaction records that reference the original. This ensures a complete and auditable trail for every financial operation.

### Asynchronous Processing

When a payment or refund is initiated, the service creates a record with `PENDING` status and returns an immediate `201` response. The actual interaction with the payment gateway occurs in a separate, asynchronous method (`processPaymentAsync`). This makes the API highly responsive. While currently processed inline, this pattern is designed to be offloaded to a message queue in a production environment for enhanced reliability.

### Service Orchestration

The `TransactionsService` acts as a central orchestrator. For a single payment request, it performs a sequence of actions:
1.  Creates a `TransactionHistory` record in the database.
2.  Calls the `GatewaysService` to process the payment with an external provider.
3.  Updates the transaction's status based on the gateway's response.
4.  Publishes a `TransactionSucceeded` or `TransactionFailed` event.
5.  Calls the `DocumentsService` to generate a payment receipt upon success.

### Event-Driven Decoupling

This module is a primary event publisher. By emitting events like `TransactionSucceeded`, it decouples itself from consumers. For example, `api-debts` can subscribe to this event to update a debt's balance, and `api-communications` can subscribe to send a receipt, all without `api-transactions` needing to know about their existence.

### Custom Exceptions

The module provides clear, domain-specific error handling through custom exceptions:
-   `TransactionNotFoundException` (404)
-   `InvalidTransactionStateException` (400): For attempting an action in the wrong state (e.g., refunding a `FAILED` payment).
-   `RefundNotAllowedException` (400): For violating business rules (e.g., refund amount > original amount).
-   `PaymentProcessingException` (500): For internal errors during payment processing.

---

## 6. Events

### Published Events

These events are published to the `transactions-v1` topic for other services to consume.

| Event Name | Event Constant | DTO | Description |
| :--- | :--- | :--- | :--- |
| **Transaction Succeeded** | `TRANSACTIONS_TRANSACTION_SUCCEEDED` | `TransactionSucceededPayload` | Published when a payment transaction is successfully processed. |
| **Transaction Failed** | `TRANSACTIONS_TRANSACTION_FAILED` | `TransactionFailedPayload` | Published when a payment transaction fails for any reason. |
| **Refund Issued** | `TRANSACTIONS_REFUND_ISSUED` | `RefundIssuedPayload` | Published when a refund transaction is successfully processed. |

### Subscribed Events

This module does not subscribe to any domain events.

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`gateways` module:** The `TransactionsService` injects the `GatewaysService` to handle all communication with external payment providers.
-   **`documents` module:** Injects `DocumentsService` to request the generation of payment receipts after successful transactions.
-   **`@verichron/event-publisher`:** Provides the `EventPublisher` for publishing domain events to GCP Pub/Sub.
-   **`core` module:** Relies on `RequestContext` for user and organization context.

### External Integrations

-   **PostgreSQL:** The primary database, accessed via TypeORM, for storing `TransactionHistory` records.
-   **GCP Pub/Sub:** The underlying message bus used for publishing all domain events.

---

## 8. Gaps & Future Work

-   **Asynchronous Processing Simulation:** The `processPaymentAsync` and `processRefundAsync` methods are currently awaited inline. A `TODO` in the code notes that this workflow should be offloaded to a dedicated message queue and worker for true asynchronous processing and improved fault tolerance in a production environment.
-   **Missing Cross-Service Validation:** The service contains `TODO` comments indicating the need for validation calls to other services, such as verifying a debt is in an "active" state with `api-debts` before attempting a payment.
-   **Duplicate Refund Prevention:** A `TODO` in the `processRefund` method highlights the need to implement logic to prevent a single payment from being refunded multiple times.
-   **Incomplete Data for Scheduled Payments:** The `createScheduledPayment` method has a `TODO` to fetch full details from the `plans` module to correctly populate fields like `debtorId` and `debtId` on the transaction record.
