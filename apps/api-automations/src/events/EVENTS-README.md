# `events` Module

## 1. Overview

The `events` module is the event-driven entry point for the `api-automations` microservice. As `api-automations` has no public-facing HTTP API, this module is the sole mechanism through which it receives work. It is responsible for configuring the eventing infrastructure, defining the data contracts (DTOs) for all consumed and published events, and routing incoming commands to the appropriate execution services.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Event Infrastructure Configuration:** It owns the configuration for the `@verichron/event-publisher`, `@verichron/event-subscriber`, and `@verichron/event-orchestrator` modules, providing the full suite of eventing and orchestration capabilities to the service.
-   **Event Listeners:** It contains all the event listener classes (e.g., `ExecuteAutoAssignmentListener`) that subscribe to command topics and trigger the service's core business logic.
-   **Event DTOs:** It defines the Data Transfer Objects used to validate the payloads of events that this service both publishes and consumes, ensuring data integrity.

### What This Module Does NOT Own

-   **Business Logic:** The listeners in this module are lightweight and act as routers. They delegate all complex business logic to the dedicated execution services (`AutoAssignmentService`, `EscalationService`).
-   **API Endpoints or Entities:** This module is purely for event handling and does not define any API endpoints or database entities.

---

## 3. Endpoints & Entities

This module does not expose any API endpoints or define any database entities.

---

## 4. Key Concepts & Patterns

### Command-Driven Architecture
The `api-automations` service operates on a command pattern, where it is activated by specific "command" events published by `api-workflows`. The listeners in this module are the handlers for these commands. For example, when the `ExecuteAutoAssignmentListener` receives an `AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT` event, it treats it as a command to start the auto-assignment process.

### Delegation to Execution Services
The listeners themselves are designed to be thin. Their primary responsibility is to receive an event, log its arrival, and immediately delegate the payload to the appropriate business logic service (`AutoAssignmentService` or `EscalationService`). This separates the concern of message consumption from the concern of business rule execution, making the system easier to test and maintain.

### Orchestrator Client for Data Fetching
A key architectural feature is this module's configuration of the `EventOrchestratorModule`. This provides the `EventOrchestratorClient` to the execution services, allowing them to make synchronous, request-response calls to other microservices to fetch data required for decision-making (e.g., querying `api-collectors` for collector workload and skills).

---

## 5. Event Reference

### Subscribed Events
These are the "command" events that trigger workflows within `api-automations`.

| Event Name | Event Constant | Topic | Source Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Execute Auto-Assignment**|`AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT`| `automations`| `api-workflows`| Triggers a single, immediate auto-assignment of a work item. |
| **Execute Scheduled**|`AUTOMATIONS_EXECUTE_SCHEDULED_AUTO_ASSIGNMENT`| `automations`| `api-workflows`| Triggers a batch auto-assignment job that queries for and assigns multiple unassigned items. |
| **Execute Escalation** | `AUTOMATIONS_EXECUTE_ESCALATION` | `automations`| `api-workflows`| Triggers an escalation workflow to notify users of a critical event. |

### Published Events
These are the "result" and "command" events that `api-automations` publishes.

| Event Name | Event Constant | Topic | Destination Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Assignment Completed** | `AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED`| `automations`| `api-workflows` | Reports the successful outcome of an assignment. |
| **Assignment Failed** | `AUTOMATIONS_AUTO_ASSIGNMENT_FAILED` | `automations`| `api-workflows` | Reports the failure of an assignment attempt. |
| **Escalation Completed** | `AUTOMATIONS_ESCALATION_COMPLETED` | `automations`| `api-workflows` | Reports the successful completion of an escalation. |
| **Escalation Failed** | `AUTOMATIONS_ESCALATION_FAILED` | `automations`| `api-workflows` | Reports the failure of an escalation attempt. |
| **Work Item Assigned** | `COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED` | `collectors`| `api-collectors` | **Command** to `api-collectors` to perform the final assignment. |
| **Send Email/SMS/Notif** | `COMMUNICATIONS_WORKFLOW_...` | `communications`|`api-communications`| **Commands** to `api-communications` to send notifications. |

---

## 6. Dependencies & Integrations

### Internal Dependencies
-   **`auto-assignment` module:** Injected into listeners to handle assignment logic.
-   **`escalation` module:** Injected into listeners to handle escalation logic.

### External Dependencies
-   **`@verichron/event-publisher`:** For publishing command and result events.
-   **`@verichron/event-subscriber`:** For the `@EventSubscription` decorator that powers the listeners.
-   **`@verichron/event-orchestrator`:** A critical dependency that provides the `EventOrchestratorClient`, enabling the service to fetch data from other microservices.

### Key Integrations
-   **`api-workflows`:** The upstream service that sends command events to this service.
-   **`api-collectors`:** A downstream service that provides collector data and consumes the final assignment commands.
-   **`api-communications`:** A downstream service that consumes notification commands.
-   **`event-orchestrator`:** The central service that facilitates synchronous data fetching.

---

## 7. Gaps & Future Work

-   **Payload Validation:** The listeners currently do not have an explicit call to the `validateEventPayload` utility seen in other microservices. While the DTOs are defined, adding this validation step at the entry point of each listener would improve robustness and align with the platform's three-layer validation strategy.
-   **Untyped Scheduled Payload:** The `ExecuteScheduledAutoAssignmentListener` currently accepts a payload of type `any`. A specific DTO should be created for this event to ensure type safety.
