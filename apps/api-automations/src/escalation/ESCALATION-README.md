# `escalation` Module

## 1. Overview

The `escalation` module is a core execution engine within the `api-automations` microservice, specifically designed to handle automated escalation workflows. Its primary function is to evaluate predefined trigger conditions against real-time data and, if these conditions are met, to dispatch multi-channel notifications (e.g., email, SMS, in-app alerts) to specified escalation targets.

This module acts as a critical component for ensuring timely responses to important events, preventing issues from falling through the cracks, and maintaining operational efficiency.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Escalation Logic:** It owns the business logic for evaluating trigger conditions against target entity data to determine if an escalation is warranted.
-   **Multi-Channel Notification Orchestration:** It owns the logic for dispatching notifications across various channels (email, SMS, in-app) by publishing command events to `api-communications`.
-   **Outcome Reporting:** It is responsible for reporting the success or failure of an escalation execution by publishing dedicated completion or failure events.

### What This Module Does NOT Own

-   **Escalation Rule Definition:** It does not define *what* constitutes an escalation rule or *when* it should be triggered. This configuration and triggering mechanism is owned by `api-workflows`.
-   **Communication Channels:** It does not directly send emails, SMS messages, or in-app notifications. It publishes command events that are consumed by the `api-communications` microservice.
-   **Data Aggregation:** It does not own the data of the `targetEntity`. This data is provided in the event payload.

---

## 3. Endpoints & Entities

This module is purely event-driven and does not expose any HTTP API endpoints or define any database entities.

---

## 4. Key Concepts & Patterns

### Event-Driven Execution
The `escalation` module is activated by consuming an `AUTOMATIONS_EXECUTE_ESCALATION` event. This event is typically published by `api-workflows` when an automation rule's conditions are met. The event payload carries all the necessary information, including the target entity, its data, the escalation rule details, and the intended notification methods and targets.

### Trigger Condition Evaluation
Upon receiving an `EXECUTE_ESCALATION` event, the `EscalationExecutorService` first evaluates the `triggerConditions` provided in the payload against the `targetEntityData` using a `ConditionEvaluator` helper. This "pre-check" ensures that notifications are only sent if the real-time data truly matches the escalation criteria, preventing false alarms. If conditions are not met, the escalation process is halted.

### Multi-Channel Notification Dispatch
If the trigger conditions are met, the service proceeds to dispatch notifications via the specified channels. It iterates through the `notificationMethods` defined in the payload (e.g., `EMAIL`, `SMS`, `IN_APP`):
-   For each method, it dynamically constructs the notification content (subject, message, call-to-action URL).
-   It then publishes a specific command event to the `COMMUNICATIONS` topic, delegating the actual sending to the `api-communications` microservice (e.g., `COMMUNICATIONS_WORKFLOW_COMMAND_SEND_EMAIL`).

### Robustness in Notification Sending
The notification loop is designed to be resilient. If one notification method fails (e.g., an error occurs while queuing an SMS notification), the service logs the error but continues attempting to send notifications via other methods. This ensures that a failure in one channel does not prevent critical alerts from being sent through others.

### Outcome Reporting
After attempting to send all notifications, the module publishes a result event (`AUTOMATIONS_ESCALATION_COMPLETED` or `AUTOMATIONS_ESCALATION_FAILED`) back to the `AUTOMATIONS` topic. This allows the upstream `api-workflows` service to track the outcome of the executed escalation.

---

## 5. Events

### Subscribed Events
| Event Name | Event Constant | Topic | Source Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Execute Escalation** | `AUTOMATIONS_EXECUTE_ESCALATION`| `automations`| `api-workflows` | The primary trigger for initiating an escalation workflow. |

### Published Events
| Event Name | Event Constant | Topic | Destination Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Escalation Completed** | `AUTOMATIONS_ESCALATION_COMPLETED`| `automations`| `api-workflows` | A **result** event indicating successful execution of the escalation. |
| **Escalation Failed** | `AUTOMATIONS_ESCALATION_FAILED` | `automations`| `api-workflows` | A **result** event indicating failure to execute the escalation. |
| **Send Email Command** | `COMMUNICATIONS_WORKFLOW_COMMAND_SEND_EMAIL`| `communications`| `api-communications` | A **command** to `api-communications` to send an email notification. |
| **Send SMS Command** | `COMMUNICATIONS_WORKFLOW_COMMAND_SEND_SMS`| `communications`| `api-communications` | A **command** to `api-communications` to send an SMS notification. |
| **Send In-App Notif** | `COMMUNICATIONS_WORKFLOW_COMMAND_SEND_NOTIFICATION`|`communications`| `api-communications` | A **command** to `api-communications` to send an in-app notification. |

---

## 6. Dependencies & Integrations

### Internal Dependencies
This module has no internal module dependencies within `api-automations` itself.

### External Dependencies
-   **`@verichron/event-publisher`:** The primary dependency for publishing all command and result events.
-   **`ConditionEvaluator` (Helper):** Used for dynamically evaluating trigger conditions.

### Key Integrations
-   **`api-workflows`:** The upstream service that defines and triggers all escalation rules and consumes the outcome events.
-   **`api-communications`:** The downstream service that consumes command events from this module to send actual multi-channel notifications.

---

## 7. Gaps & Future Work

-   **SMS Event Type:** The `sendSMSNotification` method currently publishes a `COMMUNICATIONS_WORKFLOW_COMMAND_SEND_EMAIL` event. A `TODO` in the code highlights that this needs to be updated to a proper `COMMUNICATIONS_WORKFLOW_COMMAND_SEND_SMS` event type (or similar) once `api-communications` supports it.
-   **Templating for Notifications:** The email body is currently constructed using simple string literal HTML. For more complex, dynamic, and maintainable email templates, integration with a dedicated templating system (similar to what `api-communications` uses) would be beneficial.
-   **Attachment of Workflow Context:** The notifications contain metadata about the rule and target entity, but could be enhanced to include deep links or more comprehensive context for the recipient to quickly understand and act on the escalation.
