# `events` Module

## 1. Overview

The `events` module is the event-driven backbone of the `api-users` microservice. It is responsible for both publishing events about changes within the user domain and subscribing to events from other microservices to react to platform-wide changes.

This module contains all the listener logic for processing incoming events from services like `api-organizations` and `api-debtors`, as well as the Data Transfer Objects (DTOs) that define and validate the data contracts for every event `api-users` publishes or consumes.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Event Infrastructure Configuration:** It owns the setup and configuration of the `@verichron/event-publisher` and `@verichron/event-subscriber` modules, connecting the service to the GCP Pub/Sub message bus.
-   **Event Listeners:** It owns all the listener classes (e.g., `OrganizationSuspendedListener`, `DebtorInvitationRequestedListener`) that are decorated with `@EventSubscription` and contain the logic for handling specific incoming events.
-   **Event DTOs:** It defines the comprehensive set of DTOs used to validate the payloads of all events this service publishes or consumes, ensuring type safety and runtime data integrity.
-   **Event-to-DTO Mapping:** It maintains the `EVENT_DTO_MAP`, a crucial constant that maps event type strings to their corresponding DTO validation classes.

### What This Module Does NOT Own

-   **Business Logic:** This module acts as a trigger and adapter layer. It does not contain the core business logic itself but instead calls services from other modules (like `ProfilesService` and `RbacService`) to execute business logic in response to an event.
-   **Event Publishing:** While it configures the publisher, the actual act of publishing events is performed by the service where the business action occurs (e.g., `ProfilesService` publishes `UserCreated`, `AuthService` publishes `TokenIssued`).

---

## 3. Endpoints & Entities

This module is purely event-driven and does not expose any API endpoints or define any of its own database entities.

---

## 4. Key Concepts & Patterns

### Event-Driven Workflows
This module enables `api-users` to be a reactive service. Instead of requiring direct API calls to stay in sync with the rest of the platform, it listens for events. For example, when `api-organizations` publishes an `ORGANIZATIONS_ORGANIZATION_SUSPENDED` event, the `OrganizationSuspendedListener` automatically suspends all users associated with that organization, ensuring data consistency across service boundaries.

### Listeners as Event Handlers
Each `*.listener.ts` file encapsulates the logic for handling events from a specific domain. The `@EventSubscription` decorator from `@verichron/event-subscriber` declaratively wires up a handler method to a specific GCP Pub/Sub topic and event type, abstracting away the underlying message bus implementation.

### Robust Payload Validation
Every listener uses the `validateEventPayload` utility before processing an event. This utility leverages the `EVENT_DTO_MAP` to find the correct DTO for the incoming event type and uses `class-validator` to ensure the payload is well-formed. This is a critical pattern for resilience, as it prevents malformed event data from causing runtime errors and allows invalid messages to be safely acknowledged and discarded.

### Idempotent Service Logic
The listeners are designed to call service methods that are idempotent. For example, the `OrganizationCreatedListener` calls `profilesService.provisionInitialAdmin`, which is designed to be safe to run multiple times with the same input without creating duplicate users. This is crucial for "at-least-once" delivery systems like GCP Pub/Sub, where a message may occasionally be delivered more than once.

---

## 5. Event Reference

### Published Events
`api-users` is a major event publisher. These events are published by the `auth`, `profiles`, and `rbac` services.

| Event Domain | Event Name | Event Constant |
| :--- | :--- | :--- |
| **Auth** | Login Success | `USERS_AUTH_LOGIN_SUCCESS` |
| | Login Failed | `USERS_AUTH_LOGIN_FAILED` |
| | Token Issued | `USERS_AUTH_TOKEN_ISSUED` |
| | Context Switched | `USERS_AUTH_CONTEXT_SWITCHED` |
| | Password Reset Requested | `USERS_AUTH_PASSWORD_RESET_REQUESTED` |
| **Users** | User Created | `USERS_USER_CREATED` |
| | User Activated | `USERS_USER_ACTIVATED` |
| | User Profile Updated | `USERS_USER_PROFILE_UPDATED`|
| | User Status Changed | `USERS_USER_STATUS_CHANGED` |
| | Debtor User Batch Created|`USERS_DEBTOR_USER_CREATED_BATCH`|
| **RBAC** | Role Created | `USERS_ROLE_CREATED` |
| | Role Updated | `USERS_ROLE_UPDATED` |
| | Role Deleted | `USERS_ROLE_DELETED` |
| | Role Assigned | `USERS_ROLE_ASSIGNED` |
| | Permissions Changed | `USERS_PERMISSIONS_CHANGED` |

### Subscribed Events
This module subscribes to events from other microservices to trigger actions within `api-users`.

| Event Name | Event Constant | Topic | Consuming Listener | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Org Created** | `ORGANIZATIONS_ORGANIZATION_CREATED` | `organizations` | `OrganizationCreatedListener`| **(Disabled for MVP)** To provision the initial admin user. |
| **Org Name Changed** | `ORGANIZATIONS_ORGANIZATION_NAME_CHANGED` | `organizations` | `OrganizationNameChangedListener`| To update the denormalized `organizationName` on user memberships. |
| **Org Suspended** | `ORGANIZATIONS_ORGANIZATION_SUSPENDED` | `organizations` | `OrganizationSuspendedListener`| To cascade suspend all users in the affected organization. |
| **Debtor Invitation**| `DEBTORS_INVITATION_REQUESTED` | `debtors` |`DebtorInvitationRequestedListener` | To create a provisional user account for a single invited debtor. |
| **Debtor Invite Batch**|`DEBTORS_INVITATION_BATCH_REQUESTED`| `debtors` |`DebtorInvitationBatchRequestedListener`| To process a batch of invitations and create multiple provisional user accounts. |

---

## 6. Dependencies & Integrations

### Internal Dependencies
-   **`profiles` module:** A critical dependency. The listeners inject `ProfilesService` to perform user creation, updates, and other profile-related actions.
-   **`@verichron/event-publisher` & `@verichron/event-subscriber`:** The core libraries that provide connectivity to the GCP Pub/Sub message bus.
-   **`@verichron/events`:** The shared package where event type constants and payload interfaces are defined.

### External Integrations
-   **GCP Pub/Sub:** The underlying message bus for all asynchronous, cross-service communication.

---

## 7. Gaps & Future Work

-   **Disabled Listener:** The `OrganizationCreatedListener` is explicitly disabled for the MVP. The system currently relies on a synchronous orchestration flow where the `event-orchestrator` calls an internal API endpoint in this service. The listener is intended to be re-enabled for future self-service signup workflows that require a more decoupled, asynchronous approach.
-   **In-depth Event Validation:** While the DTOs validate the structure and types of event payloads, more complex business rule validation (e.g., ensuring referenced IDs exist) is currently handled within the service logic rather than at the validation stage.
