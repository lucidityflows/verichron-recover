# API-Transactions Microservice

## Overview

The **api-transactions** microservice owns the **Payment Processing** bounded context within our debt collection SaaS platform. This service manages payment plans, individual financial transactions, payment-related documents, and integration with third-party payment gateways.

### Bounded Context

**Clear Ownership**: The api-transactions service is the single source of truth for:
- Payment plan agreements and their lifecycle
- Individual transaction records (payments, refunds)
- Payment-related document generation and storage
- Payment gateway integration and orchestration
- Scheduled payment processing

**Database**: `payments_db` - Single database ownership, no cross-database joins

**Critical Boundaries**:
- **Does NOT own**: Debt account details or debt balances (owned by api-debts)
- **Does NOT own**: Debtor profile information (owned by api-debtors)
- **Does NOT own**: User identity or RBAC (owned by api-users)
- **Does NOT own**: Organization profiles (owned by api-organizations)

---

## Business Context

### Payment Plan & Transaction Lifecycle

#### Payment Plan Lifecycle

1. **Draft (DRAFT status)**: A payment plan is initially created but not yet finalized. This allows collectors or debtors to review terms before commitment.

2. **Pending Approval (PENDING_APPROVAL status)**: If the plan amount exceeds the organization's auto-approval threshold (configured in api-organizations settings), the plan must be reviewed by an admin.

3. **Active (ACTIVE status)**: The plan is approved and scheduled payments are being processed. A `PaymentPlanStatusChanged` event is published.

4. **Completed (COMPLETED status)**: All scheduled payments have been successfully processed. The plan is marked complete.

5. **Canceled (CANCELED status)**: The plan is canceled before completion (by collector or debtor). Any future scheduled payments are stopped.

6. **Defaulted (DEFAULTED status)**: After too many failed payment attempts, the plan is marked as defaulted. A `PaymentPlanStatusChanged` event is published.

#### Transaction Lifecycle

Individual transactions progress through the following status states:

**PENDING** → **PROCESSING** (gateway call initiated) → **SUCCEEDED** → **FAILED**

A **REFUNDED** status can be applied to a **SUCCEEDED** transaction later via a separate refund transaction.

### End-to-End Payment Processing Flow

1. **Initiation**: A user (collector or debtor) initiates a one-time payment via the UI or a scheduled payment is triggered by the background job.

2. **API Request**: UI calls `POST /transactions` with payment details and tokenized payment method.

3. **Gateway Call**: The `gateways.service` makes a call to the payment provider (e.g., Stripe) with an idempotency key.

4. **Transaction Recorded**: A `TransactionHistory` record is created with status `PROCESSING`.

5. **Gateway Response**:
   - **Success**: The gateway confirms the charge. Transaction status is updated to `SUCCEEDED`.
   - **Failure**: The gateway declines the charge. Transaction status is updated to `FAILED` with `failureReason`.

6. **Event Published**: api-transactions publishes a `TransactionSucceeded` or `TransactionFailed` event.

7. **Balance Updated**: api-debts subscribes to `TransactionSucceeded` and updates the `currentBalance` on the corresponding Debt entity.

8. **Notification**: api-communications subscribes to transaction events to send receipts or failure notices to debtors.

### Key Design Principles

- **Immutable Transaction History**: Once a transaction reaches `SUCCEEDED` or `FAILED` status, it is never modified. Refunds and retries create new transaction records.
- **Event-Driven Balance Updates**: api-transactions does NOT call api-debts to update balances. It publishes events. api-debts subscribes and updates its own data. This decouples the services.
- **Gateway Abstraction**: The gateways module isolates all third-party payment provider logic. This allows for easy provider switching and testing without affecting business logic.
- **Tokenized Payment Methods**: api-transactions never handles raw credit card data. The UI tokenizes payment methods directly with the gateway (e.g., Stripe.js), and only tokens are passed to api-transactions.
- **Idempotency for Safety**: Every payment attempt includes a unique idempotency key passed to the gateway to prevent duplicate charges.
- **Multi-Debt Payment Plans**: A single payment plan can consolidate multiple debts, providing debtors with simplified payment management.
- **Configurable Approval Workflows**: Payment plan approval requirements are configured per organization in api-organizations settings.
- **Scheduled Payment Processing**: Background jobs process scheduled payments daily by querying for active plans with due payments.

---

## Architecture

The api-transactions service is organized into **4 feature modules**:

### 1. **Plans Module** (`src/plans/`)
**Purpose**: Manages payment plan agreements and their lifecycle

**Responsibilities**:
- Payment plan CRUD operations
- Payment plan status management and transitions
- Multi-debt plan consolidation
- Approval workflow orchestration
- Scheduled payment generation
- Plan modification and cancellation

**Key Files**:
- `plans.controller.ts` - REST endpoints for payment plan operations
- `plans.service.ts` - Core business logic for plan management
- `plans.module.ts` - Module definition
- `entities/payment-plan.entity.ts` - Payment plan entity definition
- `entities/payment-plan-debt.entity.ts` - Many-to-many join table linking plans to debts
- `dto/create-plan.dto.ts` - Plan creation validation
- `dto/update-plan.dto.ts` - Plan update validation

**PaymentPlan Entity Key Fields**:
- `id` (UUID) - Unique payment plan identifier
- `organizationId` (UUID, FK) - Tenant ownership (denormalized)
- `debtorId` (UUID, FK) - References api-debtors
- `status` (enum) - Current plan status (DRAFT, PENDING_APPROVAL, ACTIVE, COMPLETED, CANCELED, DEFAULTED)
- `totalAmount` (decimal) - Total amount to be paid under the plan
- `numberOfInstallments` (integer) - Number of scheduled payments
- `installmentAmount` (decimal) - Amount per installment
- `frequency` (enum) - Payment frequency (WEEKLY, BI_WEEKLY, MONTHLY)
- `startDate` (date) - Date of first scheduled payment
- `nextPaymentDate` (date) - Date of next scheduled payment (updated after each successful payment)
- `lastPaymentDate` (date, nullable) - Date of most recent payment
- `createdAt`, `updatedAt` - Audit timestamps

**PaymentPlan-Debt Relationship**:
- Many-to-many relationship via `payment_plan_debt` join table
- A single payment plan can consolidate multiple debts
- A debt can only belong to one active plan at a time (enforced by business logic)

**API Endpoints**:
- `GET /plans` - List payment plans (organization-scoped, with filters, pagination)
- `GET /plans/{id}` - Get payment plan details
- `POST /plans` - Create payment plan
- `PUT /plans/{id}` - Update payment plan (DRAFT status only)
- `PATCH /plans/{id}` - Partial update of payment plan
- `DELETE /plans/{id}` - Soft delete payment plan (mark as CANCELED)
- `POST /plans/{id}/approve` - Approve a pending plan (admin only)
- `POST /plans/{id}/cancel` - Cancel an active plan

**Approval Workflow**:

When a payment plan is created:
1. The `plans.service` calculates the `totalAmount`
2. It calls api-organizations to fetch the organization's settings: `GET /organizations/{id}/settings`
3. It reads the `auto_approve_payment_plans_under` threshold
4. If `totalAmount` exceeds the threshold, the plan status is set to `PENDING_APPROVAL`
5. Otherwise, the plan status is set to `ACTIVE`
6. A `PaymentPlanStatusChanged` event is published

**Scheduled Payment Generation**:

A background job (triggered daily by Cloud Scheduler) processes scheduled payments:
1. Query for all `PaymentPlan` records where `nextPaymentDate` is today and `status` is `ACTIVE`
2. For each matching plan:
   - Call `transactions.service.createScheduledPayment(planId, amount)`
   - Update `nextPaymentDate` based on `frequency`
   - If this is the final payment, update plan status to `COMPLETED`

**Failed Payment Handling**:

When a scheduled payment fails:
1. The transaction is marked as `FAILED`
2. A `PaymentFailed` event is published
3. Configurable retry logic is initiated (e.g., retry up to 3 times, every 2 days)
4. If all retries fail, the plan status is updated to `DEFAULTED`
5. A `PaymentPlanStatusChanged` event is published

**Business Rules**:
- **Single Active Plan per Debt**: A debt can only belong to one active payment plan at a time
- **Immutable Active Plans**: For MVP, active plans cannot be modified. The workflow is to cancel and create a new plan.
- **Approval Required**: Plans exceeding the organization's threshold require admin approval before activation
- **Minimum Installments**: Organizations can configure minimum number of installments (e.g., at least 3 payments)

**Design Notes**:
- **Multi-Debt Consolidation**: Critical feature for user experience. Debtors can consolidate multiple debts into one manageable plan.
- **Self-Service Plans**: Both collectors and debtors can create plans. Debtors can propose plans through a self-service portal.
- **Tenant Isolation**: All queries are filtered by `organizationId` to enforce multi-tenancy.

---

### 2. **Transactions Module** (`src/transactions/`)
**Purpose**: Manages individual financial transaction processing and logging

**Responsibilities**:
- One-time payment processing
- Scheduled payment processing (triggered by plans module)
- Refund processing
- Transaction status tracking
- Gateway orchestration via gateways module
- Transaction history querying

**Key Files**:
- `transactions.controller.ts` - REST endpoints for transaction operations
- `transactions.service.ts` - Core business logic for transaction processing
- `transactions.module.ts` - Module definition
- `entities/transaction-history.entity.ts` - Transaction history entity definition
- `dto/create-transaction.dto.ts` - Transaction creation validation
- `dto/query-transaction.dto.ts` - Query and filtering parameters

**TransactionHistory Entity Key Fields**:
- `id` (UUID) - Unique transaction identifier
- `organizationId` (UUID, FK) - Tenant ownership (denormalized)
- `debtId` (UUID, FK)
- `paymentPlanId` (UUID, FK, nullable) - For scheduled payments
- `debtorId` (UUID, FK) - References api-debtors
- `amount` (decimal) - Transaction amount
- `type` (enum) - Transaction type (PAYMENT, REFUND)
- `status` (enum) - Transaction status (PENDING, PROCESSING, SUCCEEDED, FAILED, REFUNDED)
- `paymentMethodToken` (string) - Tokenized payment method reference (not raw card data)
- `gatewayTransactionId` (string, nullable) - External gateway's transaction ID (e.g., Stripe charge ID)
- `failureReason` (string, nullable) - Reason for failure if status is FAILED
- `createdAt`, `updatedAt` - Audit timestamps

**Transaction Types (MVP)**:
- **PAYMENT**: A payment toward a debt (one-off or scheduled)
- **REFUND**: A refund of a previous payment

**Future Types**: FEE, ADJUSTMENT, CHARGEBACK (handled by gateway webhooks)

**API Endpoints**:
- `GET /transactions` - List transactions (organization-scoped, with filters, pagination)
- `GET /transactions/{id}` - Get transaction details
- `POST /transactions` - Create one-time payment
- `POST /transactions/{id}/refund` - Issue a refund for a completed transaction

**Transaction Processing Flow**:

For one-time payment (`POST /transactions`):
1. Validate input (amount, debtId, paymentMethodToken)
2. Verify debt is in an active status (call api-debts for validation)
3. Create `TransactionHistory` record with status `PENDING`
4. Call `gateways.service.processPayment()` with idempotency key
5. Gateway returns response:
   - **Success**: Update transaction status to `SUCCEEDED`, store `gatewayTransactionId`, publish `TransactionSucceeded` event
   - **Failure**: Update transaction status to `FAILED`, store `failureReason`, publish `TransactionFailed` event
6. Generate payment receipt document (call `documents.service`)

For scheduled payment (called by plans module):
1. Plans module calls `transactions.service.createScheduledPayment(planId, amount)`
2. Fetch payment method token from the plan
3. Follow same processing flow as one-time payment

For refund (`POST /transactions/{id}/refund`):
1. Verify original transaction status is `SUCCEEDED`
2. Create new `TransactionHistory` record of type `REFUND`, status `PENDING`
3. Call `gateways.service.processRefund()` with original `gatewayTransactionId`
4. Gateway returns response:
   - **Success**: Update refund transaction to `SUCCEEDED`, publish `RefundIssued` event
   - **Failure**: Update refund transaction to `FAILED`
5. Update original transaction status to `REFUNDED`

**Business Rules**:
- **Immutable History**: Once a transaction reaches `SUCCEEDED` or `FAILED`, it is never modified
- **New Records for Retries**: Failed payment retries create new transaction records
- **Idempotency**: Every payment attempt includes a unique idempotency key to prevent duplicate charges
- **Refunds as New Transactions**: Refunds are separate transactions that reference the original payment

**Design Notes**:
- **Relationship to Debt**: Many-to-one. Many transactions can apply to a single debt.
- **Relationship to PaymentPlan**: Many-to-one. Many transactions are generated by a single payment plan.
- **Gateway Isolation**: Business logic does not call Stripe directly. All gateway calls go through `gateways.service`.
- **Tenant Isolation**: All queries are filtered by `organizationId` to enforce multi-tenancy.

---

### 3. **Documents Module** (`src/documents/`)
**Purpose**: Manages payment-related document generation and storage

**Responsibilities**:
- Auto-generate payment-related documents (PDFs)
- Store document metadata and GCS references
- Associate documents with plans and transactions
- Provide document retrieval and download
- Support document types: agreements, receipts, invoices, offer letters

**Key Files**:
- `documents.controller.ts` - REST endpoints for document operations
- `documents.service.ts` - Business logic for document generation and management
- `documents.module.ts` - Module definition
- `entities/document.entity.ts` - Document metadata entity
- `dto/upload-document.dto.ts` - Document upload validation
- `dto/associate-document.dto.ts` - Document association validation

**Document Entity Key Fields**:
- `id` (UUID) - Unique document identifier
- `organizationId` (UUID, FK) - Tenant ownership (denormalized)
- `debtorId` (UUID, FK) - References api-debtors
- `documentType` (enum) - Document type (PAYMENT_AGREEMENT, PAYMENT_RECEIPT, INVOICE, PAYMENT_OFFER_LETTER)
- `storagePath` (string) - GCS URI (e.g., `gs://payments-docs/org-123/doc-456.pdf`)
- `mimeType` (string) - Document MIME type (e.g., `application/pdf`)
- `associatedPlanId` (UUID, FK, nullable) - Associated payment plan
- `associatedTransactionId` (UUID, FK, nullable) - Associated transaction
- `createdAt`, `updatedAt` - Audit timestamps

**Document Types**:
- **PAYMENT_AGREEMENT**: Generated when a payment plan is activated. Contains plan terms, debtor information, and signature fields.
- **PAYMENT_RECEIPT**: Generated after a successful transaction. Contains transaction details, amount, date, and payment method.
- **INVOICE**: Generated on-demand for outstanding debt balances.
- **PAYMENT_OFFER_LETTER**: Generated by collectors to propose settlement offers.

**API Endpoints**:
- `GET /documents` - List documents (organization-scoped, with filters, pagination)
- `GET /documents/{id}` - Get document metadata
- `GET /documents/{id}/download` - Download document file from GCS
- `POST /documents/generate-agreement` - Generate payment agreement PDF for a plan
- `POST /documents/generate-receipt` - Generate payment receipt PDF for a transaction
- `POST /documents/generate-invoice` - Generate invoice PDF for a debt
- `DELETE /documents/{id}` - Soft delete document

**Document Generation Flow**:

When a payment agreement is needed:
1. Plans module calls `documents.service.generatePaymentAgreement(planId)`
2. Documents service:
   - Fetches plan details from plans module
   - Fetches debtor information from api-debtors
   - Fetches debt details from api-debts
   - Generates PDF using a template library (e.g., PDFKit or Puppeteer)
   - Uploads PDF to GCS bucket
   - Creates `Document` record with metadata and storage path
3. Returns document ID to caller

When a payment receipt is needed:
1. Transactions module calls `documents.service.generatePaymentReceipt(transactionId)`
2. Documents service follows similar flow as agreement generation

**Storage Strategy**:
- **GCS Bucket**: Dedicated bucket for api-transactions documents
- **Path Structure**: `gs://payments-docs/{organizationId}/{documentId}.pdf`
- **Access Control**: Bucket is private. Documents are accessed via signed URLs generated by the service.

**Business Rules**:
- **One Document per Entity**: For simplicity, one document record is tied to one primary entity (one receipt for one transaction)
- **Auto-Generation**: Documents are primarily auto-generated, not user-uploaded
- **Tenant Isolation**: Document storage paths include `organizationId` for data segregation

**Design Notes**:
- **Heuristic for Document Placement**: If the primary purpose of a document is to define, prove, or request a financial arrangement, it belongs in api-transactions. If its purpose is general communication or logging a contact attempt, it belongs in api-communications.
- **Metadata Only**: The Document entity stores metadata and GCS references, not file content.
- **Future Enhancement**: Support for electronic signatures on payment agreements.

---

### 4. **Gateways Module** (`src/gateways/`)
**Purpose**: Isolates and abstracts third-party payment provider integration

**Responsibilities**:
- Payment processing via external gateways (e.g., Stripe)
- Refund processing
- Webhook handling for gateway events
- Provider-specific logic isolation
- Idempotency key management
- Retry logic for transient failures

**Key Files**:
- `gateways.controller.ts` - Webhook endpoints for provider callbacks
- `gateways.service.ts` - Facade for choosing and orchestrating providers
- `gateways.module.ts` - Module definition
- `providers/stripe.service.ts` - All Stripe-specific logic
- `providers/plaid.service.ts` - (Future) Plaid-specific logic for ACH
- `dto/process-payment.dto.ts` - Internal DTO for payment processing

**Gateways Service (Facade Pattern)**:

The `gateways.service` acts as a facade to abstract provider selection:

```typescript
async processPayment(paymentDto: ProcessPaymentDto): Promise<GatewayResponse> {
  // For MVP, Stripe is the only provider
  const provider = 'STRIPE'; // Future: fetch from organization settings

  if (provider === 'STRIPE') {
    return await this.stripeService.charge(paymentDto);
  }
  // Future: else if (provider === 'PLAID') { ... }

  throw new Error('Unsupported payment provider');
}
```

**Stripe Service (`providers/stripe.service.ts`)**:

All Stripe-specific logic is isolated here:
- Charge creation with idempotency keys
- Refund processing
- Customer and payment method management
- Error handling and translation

**API Endpoints**:
- `POST /gateways/stripe/webhooks` - Webhook endpoint for Stripe events (secured with signature verification)

**Webhook Handling**:

Stripe sends webhook events for:
- `charge.succeeded` - Confirms successful payment
- `charge.failed` - Indicates payment failure
- `charge.dispute.created` - Chargeback notification

Webhook processing flow:
1. Verify Stripe signature in `Stripe-Signature` header
2. Parse event payload
3. Based on event type:
   - **charge.succeeded**: Update corresponding transaction to `SUCCEEDED` (if not already updated)
   - **charge.failed**: Update corresponding transaction to `FAILED`
   - **charge.dispute.created**: Create incident record, notify organization
4. Return 200 OK to Stripe

**Idempotency Key Strategy**:

For every payment attempt:
1. Transactions service generates a UUID
2. Passes it to `gateways.service.processPayment()` as `idempotencyKey`
3. Stripe service includes it in the `Idempotency-Key` header
4. If the same request is sent twice (network retry), Stripe returns the original response without charging twice

**Retry Logic**:

For transient network errors (e.g., 502, 503 from Stripe):
- Implement exponential backoff
- Retry up to 3 times
- Log all retry attempts

For business logic errors (e.g., 400-level errors like "card declined"):
- Do NOT retry
- Immediately return failure to caller

**Payment Method Tokenization**:

api-transactions never handles raw credit card data:
1. UI uses Stripe.js to tokenize card information client-side
2. UI receives a token (e.g., `tok_1234` or `pm_5678`)
3. UI sends the token to api-transactions
4. api-transactions stores the token and uses it to create charges

**Security**:
- **Webhook Signature Verification**: Every webhook request must have a valid Stripe signature
- **Credential Management**: Stripe API keys stored in GCP Secret Manager, injected at runtime
- **No Raw Card Data**: api-transactions never sees or stores raw credit card numbers

**Design Notes**:
- **Isolation for Testing**: By isolating gateway logic, we can easily mock `gateways.service` when testing `transactions.service`
- **Provider Flexibility**: Adding a new provider (Plaid, PayPal) only requires creating a new service in `providers/` directory
- **MVP Provider**: Stripe only. Plaid can be added later for ACH verification and bank transfers.
- **No Controller for Business Logic**: The gateways module exposes endpoints only for webhooks, not for direct payment initiation. All payment requests go through the transactions module.

---

## Data Model

### Key Entities

**PaymentPlan**:
- `id` (UUID)
- `organizationId` (UUID, FK) - Denormalized tenant ownership
- `debtorId` (UUID, FK) - References api-debtors
- `status` (enum: DRAFT | PENDING_APPROVAL | ACTIVE | COMPLETED | CANCELED | DEFAULTED)
- `totalAmount` (decimal)
- `numberOfInstallments` (integer)
- `installmentAmount` (decimal)
- `frequency` (enum: WEEKLY | BI_WEEKLY | MONTHLY)
- `startDate` (date)
- `nextPaymentDate` (date)
- `lastPaymentDate` (date, nullable)
- `createdAt`, `updatedAt`

**PaymentPlan-Debt** (Join Table):
- `paymentPlanId` (UUID, FK)
- `debtId` (UUID, FK) - References api-debts
- `createdAt`

**Note**: Many-to-many relationship. A payment plan can consolidate multiple debts.

**TransactionHistory**:
- `id` (UUID)
- `organizationId` (UUID, FK) - Denormalized tenant ownership
- `debtId` (UUID, FK, nullable)
- `paymentPlanId` (UUID, FK, nullable)
- `debtorId` (UUID, FK)
- `amount` (decimal)
- `type` (enum: PAYMENT | REFUND)
- `status` (enum: PENDING | PROCESSING | SUCCEEDED | FAILED | REFUNDED)
- `paymentMethodToken` (string)
- `gatewayTransactionId` (string, nullable)
- `failureReason` (string, nullable)
- `createdAt`, `updatedAt`

**Document**:
- `id` (UUID)
- `organizationId` (UUID, FK) - Denormalized tenant ownership
- `debtorId` (UUID, FK)
- `documentType` (enum: PAYMENT_AGREEMENT | PAYMENT_RECEIPT | INVOICE | PAYMENT_OFFER_LETTER)
- `storagePath` (string) - GCS URI
- `mimeType` (string)
- `associatedPlanId` (UUID, FK, nullable)
- `associatedTransactionId` (UUID, FK, nullable)
- `createdAt`, `updatedAt`

### Relationships

**PaymentPlan ↔ Debt**:
- Many-to-many via `payment_plan_debt` join table
- A plan can consolidate multiple debts
- A debt can belong to only one active plan at a time (enforced by business logic)

**TransactionHistory → Debt**:
- Many-to-one: Many transactions apply to a single debt

**TransactionHistory → PaymentPlan**:
- Many-to-one: Many transactions are generated by a single payment plan

**Document → PaymentPlan**:
- One-to-one (typically): One payment agreement per plan

**Document → TransactionHistory**:
- One-to-one: One receipt per transaction

---

## Events

### Published Events

**`PaymentPlanStatusChanged`**:
- **Trigger**: Fired when a payment plan's status changes
- **Payload**: `{ planId, organizationId, debtorId, oldStatus, newStatus, statusChangedAt }`
- **Consumers**: api-communications (notify debtor of plan activation/defaulted), analytics services

**`TransactionSucceeded`**:
- **Trigger**: Fired when a payment is successfully processed
- **Payload**: `{ transactionId, debtId, amount, succeededAt }`
- **Consumers**: api-debts (update debt balance), api-communications (send payment receipt), analytics services

**`TransactionFailed`**:
- **Trigger**: Fired when a payment fails
- **Payload**: `{ transactionId, debtId, paymentPlanId, failureReason, failedAt }`
- **Consumers**: api-communications (notify debtor of failure), plans module (for retry logic)

**`RefundIssued`**:
- **Trigger**: Fired when a refund transaction is processed successfully
- **Payload**: `{ refundTransactionId, originalTransactionId, debtId, amount, issuedAt }`
- **Consumers**: api-debts (update debt balance), api-communications (send refund confirmation), analytics services

**Event Pattern**: Events use "thin events" with identifiers where possible. Consumers must call back to api-transactions to fetch full data if needed, ensuring they get the latest state from the source of truth.

### Subscribed Events

**None.**

**Rationale**: Like api-debts, api-transactions is a core operational service that acts as a provider, not a reactor. If a debt is settled, api-debts will update its status. Any subsequent attempts to create a payment against that debt in api-transactions will fail at the business logic validation layer ("Cannot create payment for a non-active debt"). This prevents circular dependencies and keeps the service stable.

---

## API Endpoints (High-Level)

### Plans Module
- `GET /plans` - List payment plans (organization-scoped, with filters, pagination)
- `GET /plans/{id}` - Get payment plan details
- `POST /plans` - Create payment plan
- `PUT /plans/{id}` - Update payment plan (DRAFT status only)
- `PATCH /plans/{id}` - Partial update of payment plan
- `DELETE /plans/{id}` - Soft delete (cancel) payment plan
- `POST /plans/{id}/approve` - Approve a pending plan (admin only)
- `POST /plans/{id}/cancel` - Cancel an active plan

### Transactions Module
- `GET /transactions` - List transactions (organization-scoped, with filters, pagination)
- `GET /transactions/{id}` - Get transaction details
- `POST /transactions` - Create one-time payment
- `POST /transactions/{id}/refund` - Issue a refund for a completed transaction

### Documents Module
- `GET /documents` - List documents (organization-scoped, with filters, pagination)
- `GET /documents/{id}` - Get document metadata
- `GET /documents/{id}/download` - Download document file
- `POST /documents/generate-agreement` - Generate payment agreement PDF
- `POST /documents/generate-receipt` - Generate payment receipt PDF
- `POST /documents/generate-invoice` - Generate invoice PDF
- `DELETE /documents/{id}` - Soft delete document

### Gateways Module
- `POST /gateways/stripe/webhooks` - Webhook endpoint for Stripe events (secured)

### Internal/Background Job Endpoints
- `POST /internal/process-scheduled-payments` - Triggered by Cloud Scheduler to process scheduled payments

---

## Technical Stack

- **Framework**: NestJS
- **ORM**: TypeORM
- **Database**: PostgreSQL (`payments_db`)
- **Payment Gateway**: Stripe (MVP)
- **Document Storage**: Google Cloud Storage (GCS)
- **PDF Generation**: PDFKit or Puppeteer
- **Event Queue**: GCP Pub/Sub
- **Scheduled Jobs**: Cloud Scheduler hitting internal endpoint
- **Secret Management**: GCP Secret Manager
- **Deployment**: GCP (Cloud Run or GKE)

---

## Development Status

### Completed
- ✅ Module structure and organization (plans, transactions, documents, gateways)
- ✅ Architectural design and bounded context definition
- ✅ Data model design (PaymentPlan, TransactionHistory, Document entities)

### In Progress
- 🔄 Implementing plans module (CRUD, approval workflow, scheduled payment generation)
- 🔄 Implementing transactions module (payment processing, refunds, gateway orchestration)
- 🔄 Implementing documents module (PDF generation, GCS integration)
- 🔄 Implementing gateways module (Stripe integration, webhook handling)

### Future Work
- ⏳ Define and implement all event publications (PaymentPlanStatusChanged, TransactionSucceeded, TransactionFailed, RefundIssued)
- ⏳ Implement scheduled payment background job with Cloud Scheduler
- ⏳ Implement configurable retry logic for failed payments
- ⏳ Add support for additional payment providers (Plaid for ACH)
- ⏳ Implement electronic signature support for payment agreements
- ⏳ Add support for additional transaction types (FEE, ADJUSTMENT)
- ⏳ Implement chargeback handling workflow
- ⏳ Add audit logging for all payment operations (compliance requirement)

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm --filter @verichron/api-transactions dev

# Run tests
pnpm --filter @verichron/api-transactions test

# Build for production
pnpm --filter @verichron/api-transactions build
```

---

## Critical Architectural Notes

### 1. **Event-Driven Balance Updates**
**api-transactions does NOT call api-debts to update balances.**

- When a payment succeeds, api-transactions publishes a `TransactionSucceeded` event.
- api-debts subscribes to this event and is responsible for updating its own `currentBalance` field.
- **Rationale**: Decoupling. If api-debts is temporarily unavailable, the payment can still succeed. The balance update will happen when api-debts processes the event.

### 2. **Immutable Transaction History**
**Once a transaction reaches SUCCEEDED or FAILED, it is never modified.**

- Refunds create new transaction records of type `REFUND`
- Retries create new transaction records, not updates to failed ones
- **Rationale**: Audit integrity and legal compliance. Every payment attempt must be traceable and immutable.

### 3. **Gateway Abstraction via Facade Pattern**
**All payment provider logic is isolated in the gateways module.**

- The transactions module never calls Stripe directly
- All gateway interactions go through `gateways.service`
- Provider-specific logic lives in `providers/stripe.service.ts`
- **Rationale**: Testability and flexibility. We can mock gateway calls for testing, and adding a new provider only requires creating a new service file.

### 4. **Tokenized Payment Methods**
**api-transactions never handles raw credit card data.**

- The UI tokenizes payment methods directly with Stripe.js
- Only non-sensitive tokens are passed to api-transactions
- **Rationale**: Security and PCI compliance. By never touching raw card data, we avoid complex compliance requirements.

### 5. **Idempotency Keys for Safety**
**Every payment attempt includes a unique idempotency key.**

- Transactions service generates a UUID for each payment
- Passes it to Stripe as `Idempotency-Key` header
- If a request is retried due to network failure, Stripe returns the original response without double-charging
- **Rationale**: Prevents duplicate charges caused by network issues or user double-clicks.

### 6. **Multi-Debt Payment Plans**
**A single payment plan can consolidate multiple debts.**

- Modeled as many-to-many relationship via `payment_plan_debt` join table
- Critical feature for user experience
- **Rationale**: Debtors often have multiple debts with the same organization. Consolidating them into one payment simplifies management and increases likelihood of payment.

### 7. **Configurable Approval Workflows**
**Payment plan approval requirements are organization-specific.**

- Approval thresholds configured in api-organizations settings
- Plans exceeding threshold require admin approval
- **Rationale**: Different organizations have different risk tolerances. A $10,000 plan might be acceptable for one agency but require review for another.

### 8. **Scheduled Payments via Background Job**
**Scheduled payments are processed by a daily background job.**

- Cloud Scheduler hits a secured internal endpoint
- Job queries for plans with `nextPaymentDate` = today
- Calls `transactions.service.createScheduledPayment()` for each
- **Rationale**: Decouples payment scheduling from user-initiated actions. Ensures payments happen reliably even when no users are active.

### 9. **Webhook Security**
**All gateway webhooks verify signatures before processing.**

- Stripe webhooks include a `Stripe-Signature` header
- Service verifies the signature matches the payload
- Requests without valid signatures are rejected
- **Rationale**: Prevents malicious actors from sending fake webhook events.

### 10. **Read-Only Dependencies**
**api-transactions may call other services for read-only data.**

- Calls api-debtors for debtor name/address (for document generation)
- Calls api-organizations for approval threshold settings
- Calls api-debts to validate debt status before payments
- **Rationale**: While we avoid write operations across services, read operations for display or validation purposes are pragmatic and acceptable.

---

## Security & Compliance

- **PCI Compliance**: api-transactions never handles raw credit card data. All payment methods are tokenized client-side via Stripe.js.
- **Tenant Isolation**: All queries are filtered by `organizationId` to enforce multi-tenancy. Denormalized `organizationId` on all entities enables efficient tenant checks.
- **Immutable Financial Records**: Transaction history is append-only. Once recorded, transactions are never modified.
- **Webhook Signature Verification**: All webhook endpoints verify signatures to prevent fake events.
- **Idempotency Keys**: Every payment includes an idempotency key to prevent duplicate charges.
- **Secret Management**: All payment gateway credentials stored in GCP Secret Manager, never in code or environment variables.
- **Document Access Control**: Payment documents stored in private GCS bucket. Access via signed URLs only.
- **Audit Logging**: (Future) All payment operations, plan approvals, and refunds will be logged for compliance.

---

## Glossary

- **Payment Plan**: A structured agreement for a debtor to pay off debt(s) in installments over time
- **Transaction**: An individual financial event (payment, refund) recorded in the system
- **Transaction History**: The immutable record of all financial transactions
- **Payment Gateway**: A third-party service (e.g., Stripe) that processes credit card payments
- **Idempotency Key**: A unique identifier passed to payment gateways to prevent duplicate charges
- **Payment Method Token**: A non-sensitive reference to a payment method (e.g., tokenized credit card) that can be safely stored
- **Installment**: A single scheduled payment within a payment plan
- **Gateway Transaction ID**: The external payment provider's unique identifier for a transaction (e.g., Stripe charge ID)
- **Webhook**: An HTTP callback from a payment gateway to notify our system of events (e.g., payment success)
- **Auto-Approval Threshold**: The maximum payment plan amount that can be automatically approved without admin review
- **Refund**: A reversal of a previous payment, creating a new transaction record
- **Scheduled Payment**: A payment automatically processed by a background job as part of an active payment plan
- **Payment Agreement**: A PDF document outlining the terms of a payment plan
- **Payment Receipt**: A PDF document confirming a successful payment transaction
