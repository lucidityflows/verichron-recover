# API-Communications: Eventing Design Guide

## 1. Overview

This document defines the event-driven architecture contract for the `api-communications` microservice. It details the events the service subscribes to from other bounded contexts and the events it publishes to the rest of the platform.

The primary roles of this service in the event-driven architecture are:
- **Consumer**: To listen for significant business events (e.g., a payment succeeding, a user resetting their password) and trigger the appropriate, compliant communications.
- **Producer**: To publish a rich stream of events detailing the entire lifecycle of a communication attempt (e.g., dispatched, delivered, failed, opened), providing a full audit trail and enabling other services to react to these outcomes.

This is a living document and should be updated as new communication scenarios are introduced.

---

## 2. Subscribed Events (Inputs)

These are the events that `api-communications` listens for to trigger communication workflows. Event handlers within the service are responsible for processing these events, checking compliance, rendering the correct template, and dispatching the communication.

### From `api-collectors`

#### `COLLECTORS_DEBTOR_CONTACT_ATTEMPTED`
- **Source Service**: `api-collectors`
- **Purpose**: To log manual communication attempts made by collectors for auditing and compliance. This ensures that all contact, whether automated or manual, is tracked in one place.
- **Action / Triggered Communication**: Creates a `CommunicationLog` entry in the database. **Does not** dispatch a new communication, as the contact has already been attempted.
- **Key Payload Fields**:
  - `organizationId: string`
  - `debtorId: string`
  - `collectorUserId: string`
  - `contactType: 'CALL' | 'EMAIL' | 'SMS'`
  - `outcome: string`
  - `contactDate: string` (ISO 8601)

### From `api-transactions`

#### `TRANSACTIONS_TRANSACTION_SUCCEEDED` / `TRANSACTIONS_PAYMENT_RECEIVED`
- **Source Service**: `api-transactions`
- **Purpose**: To provide timely confirmation to a debtor that their payment was successfully processed.
- **Action / Triggered Communication**: Dispatches a **payment-receipt** email.
- **Key Payload Fields**:
  - `organizationId: string`
  - `debtorId: string`
  - `transactionId: string`
  - `amount: number`
  - `currency: string`
  - `transactionDate: string` (ISO 8601)
  - `debtContext: object` (Containing debt-specific details)

#### `TRANSACTIONS_TRANSACTION_FAILED`
- **Source Service**: `api-transactions`
- **Purpose**: To immediately notify a debtor that their payment did not go through, allowing them to take corrective action.
- **Action / Triggered Communication**: Dispatches a **payment-failed** email or SMS.
- **Key Payload Fields**:
  - `organizationId: string`
  - `debtorId: string`
  - `amount: number`
  - `failureReason: string`
  - `transactionDate: string` (ISO 8601)

#### `TRANSACTIONS_REFUND_ISSUED`
- **Source Service**: `api-transactions`
- **Purpose**: To inform a debtor that a refund has been processed and is on its way.
- **Action / Triggered Communication**: Dispatches a **refund-notification** email.
- **Key Payload Fields**:
  - `organizationId: string`
  - `debtorId: string`
  - `refundId: string`
  - `amount: number`
  - `currency: string`
  - `originalTransactionId: string`

### From `api-debts`

#### `DEBTS_DEBT_CREATED`
- **Source Service**: `api-debts`
- **Purpose**: To send the legally required initial debt notification, often called the "validation notice," within the 30-day window mandated by the FDCPA.
- **Action / Triggered Communication**: Dispatches an **initial-debt-notification** email or letter.
- **Key Payload Fields**:
  - `organizationId: string`
  - `debtorId: string`
  - `debtId: string`
  - `originalCreditor: string`
  - `originalAmount: number`
  - `currentBalance: number`

#### `DEBTS_DEBT_STATUS_CHANGED`
- **Source Service**: `api-debts`
- **Purpose**: To notify a debtor of significant changes to their debt's status.
- **Action / Triggered Communication**: The event handler will inspect the `newStatus` field to determine the appropriate template.
  - If `newStatus` is `PAID_IN_FULL`: Dispatches a **debt-paid-off** confirmation email.
  - If `newStatus` is `SETTLED`: Dispatches a **debt-settled** confirmation email.
  - If `newStatus` is `DISPUTED`: Dispatches a **debt-dispute-acknowledged** email.
- **Key Payload Fields**:
  - `organizationId: string`
  - `debtorId: string`
  - `debtId: string`
  - `newStatus: string`
  - `oldStatus: string`

### From `api-debtors`

#### `DEBTORS_PROFILE_INVITED`
- **Source Service**: `api-debtors`
- **Purpose**: To invite a debtor to create an account and access the self-service portal.
- **Action / Triggered Communication**: Dispatches a **debtor-portal-invitation** email or SMS containing a unique registration link/token.
- **Key Payload Fields**:
  - `organizationId: string`
  - `debtorId: string`
  - `email: string`
  - `phone?: string`
  - `invitationToken: string`

#### `DEBTORS_INVITATION_BATCH_SENT`
- **Source Service**: `api-debtors`
- **Purpose**: To process a large number of invitations at once, often from a batch upload.
- **Action / Triggered Communication**: This event contains an array of debtor invitations. The handler will iterate through the array and dispatch a **debtor-portal-invitation** for each one.
- **Key Payload Fields**:
  - `organizationId: string`
  - `batchId: string`
  - `invitations: Array<{debtorId: string, email: string, phone?: string, invitationToken: string}>`

#### `DEBTORS_PROFILE_VERIFICATION_STATUS_CHANGED`
- **Source Service**: `api-debtors`
- **Purpose**: To inform the debtor about the outcome of their identity verification process.
- **Action / Triggered Communication**: Inspects the `verificationStatus` field.
  - If `verificationStatus` is `VERIFIED`: Dispatches a **verification-successful** email.
  - If `verificationStatus` is `REJECTED`: Dispatches a **verification-failed** email with next steps.
- **Key Payload Fields**:
  - `organizationId: string`
  - `debtorId: string`
  - `verificationStatus: 'VERIFIED' | 'REJECTED' | 'PENDING'`
  - `rejectionReason?: string`

### From `api-users`

#### `USERS_AUTH_PASSWORD_RESET_REQUESTED`
- **Source Service**: `api-users`
- **Purpose**: To allow a user to securely reset their password.
- **Action / Triggered Communication**: Dispatches a **password-reset** email with a unique, time-sensitive reset token.
- **Key Payload Fields**:
  - `userId: string`
  - `email: string`
  - `resetToken: string`
  - `organizationId: string`

#### `USERS_DEBTOR_USER_CREATED`
- **Source Service**: `api-users`
- **Purpose**: To welcome a new debtor user who has successfully created their account in the portal.
- **Action / Triggered Communication**: Dispatches a **welcome-email** to the new user.
- **Key Payload Fields**:
  - `userId: string`
  - `email: string`
  - `firstName: string`
  - `organizationId: string`

---

## 3. Published Events (Outputs)

These are the events that `api-communications` publishes to inform the platform about the outcomes of communication attempts. Other services, especially `api-collectors` and analytics systems, will be the primary consumers.

#### `communications.dispatched`
- **Trigger**: After a message is successfully handed off to a gateway (e.g., SendGrid, Twilio).
- **Purpose**: To provide a real-time signal that a communication attempt has started. This is the first step in the audit trail.
- **Key Payload Fields**: `logId`, `organizationId`, `debtorId`, `type`, `provider`, `providerMessageId`, `dispatchedAt`.

#### `communications.delivered`
- **Trigger**: When a webhook from a gateway confirms successful delivery to the recipient's device or mail server.
- **Purpose**: To confirm that the message successfully reached its destination. This is a key metric for deliverability.
- **Key Payload Fields**: `logId`, `organizationId`, `debtorId`, `provider`, `deliveredAt`.

#### `communications.failed`
- **Trigger**: When a webhook from a gateway reports a permanent delivery failure (e.g., invalid email, unreachable number), or if the initial dispatch to the gateway fails.
- **Purpose**: To signal a failed communication attempt, allowing other systems to flag the contact method as invalid or trigger fallback procedures.
- **Key Payload Fields**: `logId`, `organizationId`, `debtorId`, `failedAt`, `reason`, `errorCode`, `isRetryable`.

#### `communications.opened`
- **Trigger**: (Email only) When a webhook from SendGrid reports that the tracking pixel in an email has been fired.
- **Purpose**: To track debtor engagement. This is a powerful signal for `api-collectors` to prioritize follow-ups.
- **Key Payload Fields**: `logId`, `organizationId`, `debtorId`, `openedAt`, `ipAddress`, `userAgent`.

#### `communications.clicked`
- **Trigger**: (Email only) When a webhook from SendGrid reports that a recipient has clicked a tracked link.
- **Purpose**: To track a higher level of debtor engagement. Can be used to measure the effectiveness of calls-to-action.
- **Key Payload Fields**: `logId`, `organizationId`, `debtorId`, `clickedAt`, `url`.

#### `communications.blocked`
- **Trigger**: When the internal `ComplianceService` prevents a dispatch from occurring.
- **Purpose**: To create an explicit audit trail of compliance-related blocks, which is crucial for regulatory reviews.
- **Key Payload Fields**: `logId`, `organizationId`, `debtorId`, `blockedAt`, `reason`, `ruleName` (e.g., `TimeOfDayRule`).

#### `communications.spam_reported`
- **Trigger**: When a webhook from SendGrid indicates a recipient has marked an email as spam.
- **Purpose**: To provide a critical feedback signal for deliverability and list health. This can be used to automatically add the debtor to a "do-not-contact" list.
- **Key Payload Fields**: `logId`, `organizationId`, `debtorId`, `reportedAt`.
