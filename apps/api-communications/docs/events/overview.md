# API-Communications Microservice: Events Overview

This document details the event architecture, subscribed events, and published events within the `api-communications` microservice. The service is fundamentally event-driven, acting primarily as a reactor to business events from across the platform.

---

## Event Architecture

All events within the Verichron platform follow the **EventEnvelope** pattern from `@verichron/types`:

```typescript
{
  eventId: string;           // UUID
  eventType: string;         // Topic (e.g., 'transactions.payment.succeeded')
  eventSource: string;       // Originating service
  timestamp: string;         // ISO 8601
  schemaVersion: string;
  correlationId?: string;
  data: PayloadType;         // Strongly-typed payload
}
```

---

## Subscribed Events (Core Functionality)

The `api-communications` service is a primary event consumer, subscribing to various business events from other microservices to trigger communication workflows.

### From `api-transactions`
*   `transactions.payment.succeeded` → Triggers sending of payment receipt communication.
*   `transactions.payment.failed` → Triggers sending of payment failure notice communication.
*   `transactions.payment_plan.activated` → Triggers sending of payment plan confirmation communication.
*   `transactions.payment_plan.defaulted` → Triggers sending of payment plan defaulted notice communication.

### From `api-debts`
*   `debts.debtor.information_received` → Triggers sending of account validation email or similar communication.
*   `debts.debt.status_changed` → Triggers sending of debt status update notice communication.

### From `api-users`
*   `users.user.created` → Triggers sending of invitation email with activation link.
*   `users.user.activated` → Triggers sending of welcome email.

---

## Published Events

The `api-communications` service publishes events to provide updates on communication attempts and their outcomes, allowing other services to react accordingly (e.g., for analytics or audit logging).

### `CommunicationDispatched`
*   **Topic**: `communications.dispatched`
*   **Trigger**: Message successfully sent to a third-party gateway (e.g., SendGrid, Twilio).
*   **Payload**: `{ logId, organizationId, debtorId, type, providerMessageId }`
*   **Consumers**: Analytics, audit logging, potentially other services that need to know a communication has been initiated.

### `CommunicationDelivered`
*   **Topic**: `communications.delivered`
*   **Trigger**: Third-party gateway confirms successful delivery of the message via webhook.
*   **Payload**: `{ logId, deliveredAt, provider }`
*   **Consumers**: Engagement analytics, billing (if communication usage is metered).

### `CommunicationFailed`
*   **Topic**: `communications.failed`
*   **Trigger**: Third-party gateway reports a failure (e.g., bounce, invalid number) or an internal dispatch error occurs.
*   **Payload**: `{ logId, failureReason, failedAt, retryable }`
*   **Consumers**: Alerting systems, retry orchestration services (for retryable failures), compliance reporting.

### `CommunicationBlocked`
*   **Topic**: `communications.blocked`
*   **Trigger**: The internal compliance engine prevents a communication from being dispatched due to FDCPA/TCPA rules or debtor preferences.
*   **Payload**: `{ logId, debtorId, reason, attemptedAt }`
*   **Consumers**: Compliance reporting, audit logging, analytics on compliance adherence.

### `EmailOpened`
*   **Topic**: `communications.email_opened`
*   **Trigger**: Recipient opens an email, typically detected via a tracking pixel embedded in the email.
*   **Payload**: `{ logId, openedAt, ipAddress?, userAgent? }`
*   **Consumers**: Engagement analytics, campaign performance tracking.
