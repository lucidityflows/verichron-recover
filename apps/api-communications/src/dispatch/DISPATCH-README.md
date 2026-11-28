# `dispatch` Module

## 1. Overview

The `dispatch` module is the central orchestrator for all outbound communications within the `api-communications` microservice. It manages the end-to-end workflow of sending a message, from the initial request through compliance checks, template rendering, and final hand-off to a third-party gateway provider.

This module brings together all other components of the service (`compliance`, `templates`, `gateways`, `logs`) to execute a communication dispatch reliably and safely.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Dispatch Workflow Orchestration:** It owns the high-level business logic that defines the step-by-step process for sending a communication.
-   **Integration of Core Services:** It is responsible for injecting and coordinating the `compliance`, `templates`, `gateways`, and `logs` services to fulfill a dispatch request.
-   **Manual Dispatch Endpoint:** It owns the `POST /dispatch` API endpoint, which serves as a manual entry point for triggering the dispatch workflow.
-   **Core Event Publishing:** It is responsible for publishing the primary `CommunicationBlocked` and `CommunicationDispatched` events, which signal the outcome of a dispatch attempt.

### What This Module Does NOT Own

-   **Compliance Rules:** It does not implement compliance logic itself; it delegates all compliance checks to the `compliance` module.
-   **Template Management:** It does not store or render templates; it fetches them from the `templates` module.
-   **Gateway Communication:** It does not directly communicate with third-party APIs; it uses the `gateways` module to send the final message.
-   **Log Persistence:** It does not write directly to the database; it calls the `logs` module to create and update communication log entries.

---

## 3. Endpoints

This module does not define any of its own database entities. It provides an API for initiating the dispatch process.

### `POST /dispatch`

-   **Description:** Manually triggers the dispatch of a single communication (e.g., an email or SMS) to a debtor. This endpoint initiates the entire five-step dispatch workflow.
-   **Body:** `DispatchRequest` (includes `organizationId`, `debtorId`, `communicationType`, `templateName`, and `context`).
-   **Responses:**
    -   `201 Created`: Returns an object containing the `logId` of the newly created communication log.
    -   `400 Bad Request`: If the request payload is invalid.
    -   `403 Forbidden`: If the dispatch is blocked due to a compliance violation.
    -   `500 Internal Server Error`: If a system-level failure occurs during dispatch (e.g., template not found, gateway error).

---

## 4. Key Concepts & Patterns

### The Five-Step Dispatch Workflow

The `DispatchService` is built around a clear, five-step orchestration pattern for every communication it handles. This ensures that all necessary checks and actions are performed in the correct order.

1.  **Compliance Check:** The service first calls `complianceService.checkCompliance()`. If the communication violates any rules (e.g., debtor opt-out, frequency limits), the process is immediately halted. A log entry with `BLOCKED` status is created, a `CommunicationBlocked` event is published, and a `ComplianceViolationException` is thrown.
2.  **Template Rendering:** If compliance passes, it fetches the specified template from the `templatesService` and uses the `TemplateRendererService` to inject the provided context data, producing the final message body and subject.
3.  **Gateway Dispatch:** It uses the `GatewayFactoryService` to obtain the correct gateway instance (e.g., `SendGridService` for email) and calls its `send()` method with the fully rendered content.
4.  **Logging Success:** Upon a successful response from the gateway, it calls the `logsService` to create a new communication log with a `SENT` status, storing the provider's unique message ID for future tracking.
5.  **Publishing Dispatch Event:** Finally, it publishes a `CommunicationDispatched` event to the message bus. This event informs the rest of the system that the communication has been successfully sent and is now being tracked for delivery.

### Central Orchestrator

The `DispatchService` exemplifies the Orchestrator pattern. It doesn't perform the low-level tasks itself but instead manages and directs other specialized services (`TemplatesService`, `ComplianceService`, `GatewayFactoryService`, `LogsService`) to perform their respective functions in the correct sequence.

### Graceful Failure Handling

The service is designed to handle failures at different stages of the workflow. Compliance failures are treated as a specific business case, resulting in a "blocked" log. Any subsequent failures (e.g., a template not found or a gateway error) result in a "failed" log, ensuring that every dispatch attempt is recorded, whether it succeeds or fails.

---

## 5. Events

### Published Events

| Event Name | Event Constant | DTO | Description |
| :--- | :--- | :--- | :--- |
| **Communication Blocked** | `COMMUNICATIONS_COMMUNICATION_BLOCKED` | `CommunicationBlockedDto` | Published when a dispatch attempt is blocked by the compliance engine. |
| **Communication Dispatched** | `COMMUNICATIONS_COMMUNICATION_DISPATCHED` | `CommunicationDispatchedDto` | Published after a communication is successfully sent to a gateway provider. |

### Subscribed Events

This module does not subscribe to any domain events. It is a command-driven module that initiates workflows based on API calls.

---

## 6. Dependencies & Integrations

### Internal Dependencies

-   **`templates` module:** Injected to fetch and render communication templates.
-   **`compliance` module:** Injected to perform compliance checks before every dispatch.
-   **`gateways` module:** Injected to access the gateway factory for sending emails and SMS.
-   **`logs` module:** Injected to create and update communication log entries in the database.
-   **`@verichron/event-publisher`:** Used to publish domain events after a dispatch attempt.

### External Integrations

This module has no direct external integrations. It relies on the `gateways` module to handle all communication with third-party services.

---

## 7. Gaps & Future Work

-   **`LETTER` Dispatch Method:** The service has placeholder logic for a `LETTER` dispatch method but throws a "not yet implemented" error. This indicates that integration with a physical mail provider (e.g., Lob.com) is a planned future enhancement.
-   **Inconsistent DTOs:** The `DispatchController` uses the internal `DispatchRequest` interface, but a more explicit `ManualDispatchDto` exists in the DTOs directory. These could be consolidated for consistency.
