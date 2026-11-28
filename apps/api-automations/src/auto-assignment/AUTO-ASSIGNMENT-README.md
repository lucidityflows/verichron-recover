# `auto-assignment` Module

## 1. Overview

The `auto-assignment` module is the intelligent execution engine for all automated assignment workflows within the `api-automations` microservice. Triggered by events from `api-workflows`, this module is responsible for running sophisticated logic to determine the most appropriate collector for a given work item (such as a new debt or a support ticket) based on a configured strategy.

It acts as a decision-making and command-issuing component, orchestrating data retrieval from other microservices to make informed assignments and then publishing a command to finalize the assignment.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Assignment Strategy Logic:** It owns the implementation of all assignment strategies, including Round Robin, Least Workload, Skill-Based, and Geographic matching.
-   **Collector Pool Filtering:** It is responsible for filtering the initial pool of collectors based on configured constraints like daily limits, workload thresholds, and explicit exclusions.
-   **Data Orchestration:** It owns the logic for requesting necessary data (e.g., collector workload, skills, territories) from `api-collectors` via the `EventOrchestratorClient`.
-   **Command Publishing:** Its final responsibility is to publish the `COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED` command to instruct `api-collectors` to perform the actual assignment.

### What This Module Does NOT Own

-   **Workflow Rules:** It does not define *when* an auto-assignment should run or what the parameters of the assignment should be. This is owned by `api-workflows`.
-   **Collector Data:** It does not store any data about collectors. It fetches all required information from `api-collectors` in real-time.
-   **The Work Queue:** It does not manage the collector's work queue. It only sends a command to `api-collectors` to add an item to a queue.

---

## 3. Endpoints & Entities

This module is a purely event-driven backend processor. It does not expose any API endpoints or define any database entities.

---

## 4. Key Concepts & Patterns

### Event-Driven Execution
The entire auto-assignment process is initiated by an incoming `AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT` event, typically published by `api-workflows`. This event-driven entry point decouples the rule definition (in workflows) from the execution logic (in this module), allowing for a flexible and scalable automation system.

### Strategy Pattern for Collector Selection
The core of the `AutoAssignmentExecutorService` is a `switch` statement that implements the Strategy Pattern. Based on the `strategy` field in the event payload, it dynamically selects one of several assignment algorithms:

-   **Round Robin:** The default, simplest strategy. It cycles through the list of available collectors sequentially, ensuring a fair, even distribution of work over time.
-   **Least Workload:** A more dynamic strategy that queries `api-collectors` (via the orchestrator) for the current workload of each collector. It then assigns the item to the eligible collector with the fewest active assignments.
-   **Skill-Based:** A matching strategy that compares a required skill from the work item (e.g., `targetEntity.category = 'MEDICAL'`) to the skills of available collectors. It queries `api-collectors` to find a collector with the matching skill.
-   **Geographic:** Matches the location of the work item (state or zip code) to a collector's assigned sales or service territories. It queries `api-collectors` for territory data to find an appropriate match.

### Data Orchestration via `EventOrchestratorClient`
To make intelligent decisions, the advanced strategies (`Least Workload`, `Skill-Based`, `Geographic`) need real-time data from other services. This module uses the `@verichron/event-orchestrator` client to make synchronous, request-response calls to fetch this data. It publishes a `AUTOMATIONS_COLLECTORS_DATA_REQUESTED` event and `await`s a response containing the necessary data from `api-collectors`, all orchestrated through a central service.

### Command/Event Publishing
The module's workflow concludes by publishing events:
1.  **Command:** It publishes a `COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED` event. This is a "command" event that instructs the `api-collectors` service to perform the action of adding the item to the selected collector's work queue.
2.  **Completion Event:** After the process is complete, it publishes an `AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED` event to notify the original workflow in `api-workflows` of the outcome (success or failure), closing the loop.

---

## 5. Events

### Subscribed Events
| Event Name | Event Constant | Topic | Source Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Execute Auto-Assignment**| `AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT`| `automations`| `api-workflows` | The primary trigger that initiates an auto-assignment workflow. |

### Published Events
| Event Name | Event Constant | Topic | Destination Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Work Item Assigned** | `COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED`|`collectors`| `api-collectors` | A **command** instructing the collector service to assign an item. |
| **Assignment Completed** | `AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED`|`automations`| `api-workflows` | A **result** event notifying the workflow of the outcome. |
| **Assignment Failed** | `AUTOMATIONS_AUTO_ASSIGNMENT_FAILED` | `automations`| `api-workflows` | A **result** event notifying the workflow of a critical failure. |
| **Data Requested** | `AUTOMATIONS_COLLECTORS_DATA_REQUESTED` | `automations`| `event-orchestrator` | A **request** for collector data (workload, skills, etc.). |

---

## 6. Dependencies & Integrations

### Internal Dependencies
This module is self-contained within `api-automations` and has no internal module dependencies.

### External Dependencies
-   **`@verichron/event-publisher`:** Provides the `EventPublisher` for publishing command and completion events.
-   **`@verichron/event-orchestrator`:** Provides the `EventOrchestratorClient`, a critical dependency for fetching data needed for advanced assignment strategies.

### Key Integrations
-   **`api-workflows`:** The upstream service that defines and triggers all auto-assignment jobs.
-   **`api-collectors`:** The downstream service that owns collector data (workload, skills) and receives the final assignment command.
-   **`event-orchestrator`:** The central service that facilitates synchronous data fetching from `api-collectors`.

---

## 7. Gaps & Future Work

-   **Combined Strategies:** The current implementation applies only one strategy per execution. A future enhancement could be to support a weighted scoring system that combines multiple strategies (e.g., find all collectors with the right `skill`, and from that subset, choose the one with the `least workload`).
-   **Simplified Fallback Logic:** All advanced strategies currently fall back to the simple "Round Robin" method if they encounter an error or find no suitable match. More sophisticated fallback chains could be implemented (e.g., try `Skill-Based`, then `Geographic`, then `Least Workload`, and finally `Round Robin`).
