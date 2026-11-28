# Event-Driven Architecture

This document outlines the principles, patterns, and implementation details of the Event-Driven Architecture (EDA) used within the Verichron platform. EDA is fundamental to achieving decoupling, resilience, and scalability across our microservices.

---

## 1. Core Principles

-   **Asynchronous Communication**: Services communicate primarily through events, avoiding direct synchronous dependencies where possible.
-   **Decoupling**: Services do not need to know about each other's internal implementation details. They only need to agree on event contracts.
-   **Scalability & Resilience**: Events are processed asynchronously, allowing services to handle load independently and providing automatic retry mechanisms for transient failures.
-   **Auditability**: All significant state changes are published as events, creating a natural audit log.
-   **Eventual Consistency**: Data across services is eventually consistent, meaning data might not be immediately synchronized across all services after an event is published. This is an acceptable trade-off for our domain.

## 2. Event Structure: The `EventEnvelope` Pattern

All events follow a standardized `EventEnvelope` pattern, defined in the `@verichron/types` package. This provides consistent metadata wrapping around strongly-typed payloads.

```typescript
// packages/types/src/events/event-envelope.ts
interface EventEnvelope<T> {
  eventId: string;           // Unique event identifier (UUID)
  eventType: string;         // Type of event (e.g., 'users.user.created')
  eventSource: string;       // Service that published the event (e.g., 'api-users')
  timestamp: string;         // ISO 8601 timestamp
  schemaVersion: string;     // Payload version (e.g., 'users-v1')
  correlationId?: string;    // Optional: for tracking request chains across services
  data: T;                   // Strongly-typed event payload
}
```

### Key Event Attributes

-   **`eventId`**: A unique ID for each event instance.
-   **`eventType`**: A string following the convention `domain.entity.action` (e.g., `users.user.created`). These are defined as constants in `@verichron/types`.
-   **`eventSource`**: The microservice that published the event.
-   **`timestamp`**: When the event occurred.
-   **`correlationId`**: An optional ID to link related events across a distributed transaction.

## 3. Event Pattern: "Thin Events"

Our events adhere to the "Thin Events" philosophy:

-   **Content**: Published events contain only essential identifiers, not full data payloads.
    -   **Example**: A `UserCreated` event payload is `{ userId, organizationId }`, not the entire user object with all their profile details.
-   **Consumption**: Consumers must call back to the source service (e.g., `api-users`) via its API to fetch the full, latest data.

**Rationale**:
-   **Ensures Fresh Data**: Consumers always get the latest state from the source of truth. If the user profile changes between event publication and consumption, the consumer sees the current state, not stale event data embedded in the event.
-   **Reduces Event Size**: Keeps event messages small and efficient.
-   **Prevents Data Duplication**: Avoids duplicating potentially large data sets across multiple services.
-   **Maintains Single Source of Truth (SSOT)**: Reinforces the principle that each microservice owns its data and is the SSOT for that data.

## 4. Event Infrastructure: Three-Package Architecture

Our event infrastructure is built around a three-package architecture for clarity, type safety, and separation of concerns:

1.  **`@verichron/types` (Pure Types)**:
    -   **Purpose**: Defines all shared TypeScript types, interfaces, and event constants.
    -   **Content**: `EventEnvelope`, all event payload interfaces (e.g., `UserCreatedPayload`, `OrganizationCreatedPayload`), `EVENT_TOPICS`, `EVENT_TYPES`.
    -   **Characteristics**: Zero dependencies, pure TypeScript. Can be used anywhere (frontend, backend, shared libraries).

2.  **`@verichron/event-publisher` (Infrastructure)**:
    -   **Purpose**: Provides a standardized service for publishing events to GCP Pub/Sub.
    -   **Content**: `EventPublisher` service (for publishing), `EventPublisherModule` (NestJS module).
    -   **Dependencies**: Depends on `@verichron/types`, `@google-cloud/pubsub`, `@nestjs/*`.
    -   **Usage**: Injects `EventPublisher` into domain services to publish events.

3.  **`@verichron/event-subscriber` (Infrastructure)**:
    -   **Purpose**: Provides a standardized, declarative way for microservices to subscribe to events from GCP Pub/Sub.
    -   **Content**: `EventSubscriber` service (for managing subscriptions), `EventSubscriberModule` (NestJS module), `@EventSubscription()` decorator.
    -   **Dependencies**: Depends on `@verichron/types`, `@google-cloud/pubsub`, `@nestjs/*`.
    -   **Usage**: `EventSubscriberModule` discovers handler methods decorated with `@EventSubscription()` and automatically routes incoming messages.

### Package Dependency Graph

```mermaid
graph TD
    A[@verichron/types]
    B[@verichron/event-publisher]
    C[@verichron/event-subscriber]
    D[api-users]
    E[api-organizations]
    F[api-debts]

    B -- depends on --> A
    C -- depends on --> A

    D -- uses --> A
    D -- uses --> B
    D -- uses --> C

    E -- uses --> A
    E -- uses --> B
    E -- uses --> C

    F -- uses --> A
    F -- uses --> B
    F -- uses --> C
```

## 5. Event Publishing Strategy

-   **Within Services**: Domain services (e.g., `api-users`' `ProfilesService`) inject `EventPublisher` and call its `publish()` method after a significant state change.
-   **Event DTOs**: When publishing, services use local Event DTOs (e.g., `UserCreatedDto` in `apps/api-users/src/events/event-dto/`). These DTOs extend the payload interfaces from `@verichron/types` and include `class-validator` decorators for runtime validation of the event payload. This ensures that only valid data is published.

## 6. Event Consumption Strategy

-   **Listeners**: Services define event "listeners" (e.g., `OrganizationCreatedListener` in `api-users`).
-   **`@EventSubscription()` Decorator**: Listener methods are decorated with `@EventSubscription()` from `@verichron/event-subscriber`. This decorator specifies the `topicName`, a unique `subscriptionName`, and optionally `eventType(s)` to filter messages.
-   **Automatic Discovery**: The `EventSubscriberModule` discovers these decorated methods on application startup and manages the Pub/Sub subscriptions.
-   **Error Handling**: Listener methods are wrapped in `try-catch` blocks. If an error is re-thrown from a listener, the message is negatively acknowledged (`nack`), triggering Pub/Sub's retry mechanism.

## 7. Event-Driven Workflows (Orchestration vs. Choreography)

The platform utilizes a combination of choreography (decentralized event reactions) and orchestration (centralized workflow coordination).

### Choreography Example: Data Synchronization

-   `OrganizationNameChanged` event: `api-organizations` publishes this event. `api-users` listens and updates its denormalized `organizationName` field in `user_memberships`.
    -   **Benefit**: Simple, direct reaction, good for data synchronization.

### Orchestration Example: Organization Onboarding

-   When a new organization is created, `api-organizations` publishes an `OrganizationCreated` event.
-   Instead of `api-users` directly listening to this, a dedicated **Event Orchestrator** (a separate microservice, e.g., `event-orchestrator`) listens.
-   The orchestrator then makes synchronous HTTP calls to `api-users` (e.g., to provision the initial admin user), waits for responses, and then publishes subsequent events (`ONBOARDING_COMPLETED`).
    -   **Benefit**: Provides a central point of control for complex, multi-step workflows, clearer error handling, and easier state management.

## 8. Security Considerations for Events

-   **Events Bypass HTTP Guard Chain**: Events do not go through the standard HTTP guard chain (`JwtAuthGuard`, `OrgContextGuard`, `PermissionsGuard`).
-   **Payload Validation**: Event payloads MUST be validated using DTOs (Layer 2 validation) before publishing and upon consumption.
-   **Metadata for Audit**: Events should embed metadata (e.g., `createdBy`, `correlationId`) for auditability and debugging.
-   **Internal Service Tokens**: Consider using internal service tokens for HTTP calls made by orchestrators, rather than user JWTs, to ensure service-to-service authentication.

---

## 9. Next Steps

-   **Refactor `EventPublisher`**: The `EventPublisher` service (currently in `api-users`) needs to be moved to the `@verichron/event-publisher` package.
-   **Implement `DebtorInvited` Event Listener**: A new listener needs to be created in `api-users` to process the `DEBTORS_DEBTOR_INVITED` event and provision debtor user accounts.

---
[Back to Architecture README](../README.md)
