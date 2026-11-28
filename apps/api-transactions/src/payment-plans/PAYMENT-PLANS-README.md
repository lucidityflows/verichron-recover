# `payment-plans` Feature Module

## 1. Overview

The `payment-plans` module (aliased as `plans`) is a primary feature module within the `api-transactions` microservice. It is responsible for the entire lifecycle of payment plan agreements, which allow debtors to pay off one or more debts in a series of scheduled installments.

This module manages multi-debt consolidation, configurable approval workflows, and the generation of scheduled payments, acting as the central hub for recurring payment logic.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Payment Plan Lifecycle:** It is the single source of truth for the `PaymentPlan` entity and its status state machine (e.g., `DRAFT` → `PENDING_APPROVAL` → `ACTIVE`).
-   **Multi-Debt Consolidation:** It owns the `PaymentPlanDebt` join entity and the business logic for associating multiple debts with a single payment plan.
-   **Approval Workflow Orchestration:** It owns the logic for determining if a plan requires manual approval based on organization-specific thresholds.
-   **Scheduled Payment Generation:** It owns the background processing logic (`processScheduledPayments`) that identifies due plans and triggers the creation of installment transactions.
-   **Failed Payment Handling:** It is responsible for tracking failed payments for a plan and marking the plan as `DEFAULTED` if a failure threshold is exceeded.

### What This Module Does NOT Own

-   **Individual Transaction Processing:** It does not process payments. It calls the `transactions` service to create a scheduled payment transaction, delegating the actual processing to that module.
-   **Debt Data:** It does not own debt data. It must query the `api-debts` microservice to validate debts and fetch their balances when creating a plan.
-   **Organization Settings:** It does not store configuration. It is expected to query the `api-organizations` microservice to retrieve settings like auto-approval thresholds.

---

## 3. Entities

### `PaymentPlan`

This is the primary entity for the module, representing a single, structured payment agreement.

-   **Purpose:** To store all terms, scheduling information, status, and metadata related to a payment plan.
-   **Key Fields:**
    -   `id` (string, UUID): Primary key.
    -   `organizationId` (string, UUID): The tenant that owns this plan. **Denormalized** for performance.
    -   `debtorId` (string, UUID): The debtor associated with the plan.
    -   `status` (enum: `PaymentPlanStatus`): The current lifecycle status (e.g., `DRAFT`, `ACTIVE`, `COMPLETED`).
    -   `totalAmount` (number): The total amount to be paid, calculated as the sum of all consolidated debt balances.
    -   `numberOfInstallments` (number): The total number of payments in the plan.
    -   `installmentAmount` (number): The amount for each scheduled payment (`totalAmount` / `numberOfInstallments`).
    -   `frequency` (enum: `PaymentFrequency`): How often payments are scheduled (e.g., `WEEKLY`, `MONTHLY`).
    -   `startDate` (Date): The date of the first scheduled payment.
    -   `nextPaymentDate` (Date): The date of the next upcoming payment, which is updated after each successful installment.
    -   `paymentMethodToken` (string): The tokenized payment method used for all scheduled payments.
-   **Relations:**
    -   **`debts`**: A one-to-many relationship to the `PaymentPlanDebt` entity, linking the plan to its consolidated debts.

### `PaymentPlanDebt`

This is a join table entity that represents the many-to-many relationship between payment plans and debts.

-   **Purpose:** To create an association between a `PaymentPlan` and a specific `debtId`, and to snapshot the debt's balance at the time of plan creation for auditing.
-   **Key Fields:**
    -   `paymentPlanId` (string, UUID): Foreign key to the `PaymentPlan` entity.
    -   `debtId` (string, UUID): A foreign key reference to a debt managed by `api-debts`.
    -   `debtBalanceAtCreation` (number): A snapshot of the debt's balance when it was added to the plan.
-   **Relations:**
    -   **`paymentPlan`**: A many-to-one relationship back to the `PaymentPlan` entity.

---

## 4. Endpoints

All endpoints are prefixed with `/plans` and require JWT authentication.

### `POST /plans`

-   **Description:** Creates a new payment plan, consolidating one or more debts. The initial status is determined by an organization's auto-approval rules.
-   **Body:** `CreatePlanDto`
-   **Permissions:** `payment_plan:create`
-   **Responses:**
    -   `201 Created`: Returns the newly created `PaymentPlan` object.
    -   `409 Conflict`: If one of the debts is already part of another `ACTIVE` plan.

### `GET /plans`

-   **Description:** Retrieves a paginated list of payment plans, scoped to the user's organization.
-   **Query Parameters:** `QueryPlansDto` (supports filtering by `debtorId`, `status`, date ranges, etc.).
-   **Permissions:** `payment_plan:read`
-   **Responses:**
    -   `200 OK`: Returns a paginated response of payment plans.

### `GET /plans/:id`

-   **Description:** Retrieves detailed information for a single payment plan, including its associated debts.
-   **Parameters:** `id` (string, UUID)
-   **Permissions:** `payment_plan:read`
-   **Responses:**
    -   `200 OK`: Returns the `PaymentPlan` object.
    -   `404 Not Found`: If the plan ID does not exist or is outside the user's organization.

### `PUT /plans/:id` & `PATCH /plans/:id`

-   **Description:** Updates a payment plan. This operation is **only allowed** on plans in `DRAFT` status.
-   **Parameters:** `id` (string, UUID)
-   **Body:** `UpdatePlanDto`
-   **Permissions:** `payment_plan:update`
-   **Responses:**
    -   `200 OK`: Returns the updated `PaymentPlan` object.
    -   `400 Bad Request`: If the plan is not in `DRAFT` status.

### `POST /plans/:id/approve`

-   **Description:** Approves a plan that is in `PENDING_APPROVAL` status, changing its status to `ACTIVE` and enabling scheduled payments.
-   **Parameters:** `id` (string, UUID)
-   **Permissions:** `payment_plan:approve`
-   **Responses:**
    -   `200 OK`: Returns the updated `PaymentPlan` object with `ACTIVE` status.
    -   `400 Bad Request`: If the plan is not in `PENDING_APPROVAL` status.

### `POST /plans/:id/cancel` & `DELETE /plans/:id`

-   **Description:** Cancels an `ACTIVE` or `PENDING_APPROVAL` plan. This is a terminal action that stops all future scheduled payments.
-   **Parameters:** `id` (string, UUID)
-   **Permissions:** `payment_plan:cancel`
-   **Responses:**
    -   `200 OK`: Returns the updated `PaymentPlan` object with `CANCELED` status.

### `POST /plans/internal/process-scheduled-payments`

-   **Description:** An **internal-only** endpoint intended to be called by a cron job (e.g., Cloud Scheduler). It finds all active plans with a due payment and triggers their processing.
-   **Permissions:** Internal service-to-service authentication.
-   **Responses:**
    -   `200 OK`: Returns a summary of processed, completed, and failed payments.

---

## 5. Key Concepts & Patterns

### Payment Plan Lifecycle

A payment plan progresses through a strict state machine defined by `PaymentPlanStatus` and validated by `VALID_PLAN_STATUS_TRANSITIONS`. The typical flow is `DRAFT` → `PENDING_APPROVAL` (if needed) → `ACTIVE` → `COMPLETED`. Terminal states like `CANCELED` and `DEFAULTED` prevent further actions.

### Configurable Approval Workflow

The system supports organization-specific approval rules. When a plan is created, the service is designed to fetch an `approvalThreshold` from `api-organizations`. If the plan's `totalAmount` exceeds this threshold, it enters `PENDING_APPROVAL` status and requires manual intervention via the `/approve` endpoint. Otherwise, it is automatically activated.

### Scheduled Payment Processing

A background job, triggered by an external scheduler (like Cloud Scheduler) calling the internal `/process-scheduled-payments` endpoint, is responsible for all recurring payments. This job queries for all `ACTIVE` plans with a `nextPaymentDate` of today, then calls `transactionsService.createScheduledPayment` for each one. This decouples payment processing from user-facing requests and ensures reliability.

### Failed Payment Handling

The `handleFailedPayment` method is designed to be triggered by a `TransactionFailed` event. It increments a `paymentsFailed` counter on the plan. If this counter reaches a predefined threshold (e.g., 3), the plan's status is automatically moved to `DEFAULTED`, and a `PaymentPlanStatusChanged` event is published.

### Custom Exceptions

The module uses a set of specific exceptions for clear error handling:
-   `PlanNotFoundException` (404)
-   `InvalidPlanStateException` (400): For attempting an action on a plan in the wrong state (e.g., updating an `ACTIVE` plan).
-   `DebtAlreadyInPlanException` (409): If a debt is already in another `ACTIVE` plan.
-   `InvalidStateTransitionException` (400): If a status change violates the defined state machine.

---

## 6. Events

### Published Events

| Event Name | Event Constant | DTO | Description |
| :--- | :--- | :--- | :--- |
| **Plan Status Changed**| `TRANSACTIONS_PAYMENT_PLAN_STATUS_CHANGED` | `PaymentPlanStatusChangedPayload` | Published when a plan's status changes (e.g., to `ACTIVE`, `CANCELED`, `DEFAULTED`). |

### Subscribed Events

-   **`TRANSACTIONS_TRANSACTION_FAILED` (Implicit):** The `handleFailedPayment` service method is designed to consume this event. An event subscriber should be configured to listen for failed scheduled payments and call this method to update the plan's failure count.

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`transactions` module:** Injects `TransactionsService` to create individual transaction records for each scheduled payment. This is a critical dependency.
-   **`@verichron/event-publisher`:** Provides the `EventPublisher` for publishing `PaymentPlanStatusChanged` events.
-   **`core` module:** Relies on `RequestContext` for user and organization context.

### External Dependencies (Implicit)

-   **`api-debts`:** The service requires data from `api-debts` to validate debts and calculate plan totals. These integration points are marked as `TODO`.
-   **`api-organizations`:** The service requires settings from `api-organizations` to determine the auto-approval threshold. This is also marked as `TODO`.
-   **Cloud Scheduler:** An external cron job service is expected to periodically call the `POST /internal/process-scheduled-payments` endpoint.

### External Integrations

-   **PostgreSQL:** The primary database, accessed via TypeORM, for storing `PaymentPlan` and `PaymentPlanDebt` entities.
-   **GCP Pub/Sub:** The underlying message bus for publishing and subscribing to events.

---

## 8. Gaps & Future Work

-   **Cross-Service Integration:** The service contains multiple `TODO` comments indicating that critical cross-service API calls (to `api-debts` for debt balances and `api-organizations` for settings) have not been implemented. The logic currently relies on placeholder values.
-   **Hardcoded Thresholds:** The auto-approval threshold (`1000.00`) and the failed payment threshold (`3`) are hardcoded. These should be fetched from organization-specific settings.
-   **Event Subscriber Implementation:** While the `handleFailedPayment` method exists, the event subscriber that listens for `TransactionFailed` events and triggers this handler needs to be implemented.
-   **Incomplete Data Population:** The `create` method uses a placeholder for `debtorId`. This needs to be fetched from `api-debts` along with the debt details.
