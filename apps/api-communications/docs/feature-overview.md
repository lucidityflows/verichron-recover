# API-Communications Microservice: Feature Overview and System Context

This document provides a high-level overview of the `api-communications` microservice, detailing its core features and its role within the Verichron SaaS platform.

## Overview

The **api-communications** microservice owns the **Communication & Notification** bounded context within our debt collection SaaS platform. This service is responsible for managing all outbound communications to debtors, including emails, SMS messages, and generated letters. It handles template management, dispatch orchestration, tracking of communication events (delivery, opens, clicks), and enforcement of contact compliance rules.

### Bounded Context

**Clear Ownership**: The api-communications service is the single source of truth for:
- Communication templates (email, SMS, letters)
- The immutable log of all communication attempts and their outcomes
- Debtor-specific communication preferences (e.g., Do Not Call, Email Only)
- Integration with third-party communication gateways (e.g., SendGrid, Twilio)
- Orchestration of message dispatch based on events from other services

**Databases**: 
- **MongoDB** (`communications` database) - High-volume, append-only communication logs
- **PostgreSQL** (`communications_db`) - Structured data (templates, preferences)

**Critical Boundaries**:
- **Does NOT own**: Debtor contact information (received in event payloads or fetched from api-debtors)
- **Does NOT own**: Business logic that triggers communications (reacts to events from api-debts, api-transactions, etc.)
- **Does NOT own**: User identity or profiles (owned by api-users)

---

## Business Context

### Communication Lifecycle

1. **Event Trigger**: Another service publishes a business event (e.g., `api-transactions` publishes `TransactionSucceeded`).

2. **Event Consumption**: The api-communications service subscribes to the event. An event processor (e.g., `PaymentEventProcessor`) is triggered.

3. **Rule & Preference Check**: The compliance engine checks debtor preferences and regulatory rules:
   - Time-of-day restrictions (FDCPA: no contact before 8am or after 9pm)
   - Frequency limits (daily contact caps)
   - Opt-out status (channel-specific or global Do Not Contact)
   - If rules prohibit contact, the process stops and a `BLOCKED` log entry is created.

4. **Template Rendering**: The service fetches the appropriate template (e.g., "payment-receipt-email") and renders it with the provided context using Handlebars templating.

5. **Dispatch via Gateway**: The rendered message is sent to the appropriate third-party gateway (SendGrid for email, Twilio for SMS). A `CommunicationLog` record is created with `SENDING` status.

6. **Status Tracking (via Webhook)**: The gateway sends webhook events back to api-communications to report status (`DELIVERED`, `FAILED`, `OPENED`, `CLICKED`). The service updates the log's status and appends to `statusHistory`.

### Key Design Principles

- **Primarily an Event Subscriber**: The core function is to react to business events from other domains. It is the primary "side-effect" manager of the platform.
- **Template-Driven Content**: Business logic is separated from presentation. All message content is managed via versioned templates.
- **Gateway Abstraction**: All third-party provider logic is isolated in a `gateways` module, allowing for easy provider switching and robust testing.
- **Immutable Communication Logs**: Every communication attempt is an immutable, append-only record in MongoDB, providing a complete audit trail for compliance.
- **Compliance Engine**: Enforces communication rules based on FDCPA/TCPA regulations and debtor preferences.
- **Dual Database Strategy**: MongoDB for high-volume logs (write-heavy, time-series data), PostgreSQL for structured data (templates, preferences).
- **Decoupled from Business Logic**: This service does not decide *when* to send; it decides *how* and *if* (based on compliance rules) to send after being told to do so via an event.
