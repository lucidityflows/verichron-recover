# `onboarding` Module

## 1. Overview

The `onboarding` module is the primary entry point for provisioning new tenant organizations onto the Verichron platform. It is responsible for orchestrating the complex, multi-step, cross-service workflow required to create a new organization, provision its initial administrator user, apply default settings, and activate it for use.

This module acts as the "command center" for the onboarding process, initiating a synchronous orchestration flow and providing status feedback to the platform administrator who triggers it.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **The Onboarding Orchestration Flow:** It owns the high-level business logic for orchestrating the creation of a new organization. This includes creating the initial organization record and initiating the cross-service provisioning workflow.
-   **The Onboarding API Endpoints:** It owns the `/onboarding` endpoints, which are used exclusively by platform administrators to provision new tenants and check the status of the process.
-   **Initiation of Cross-Service Workflows:** It is a key client of the `@verichron/event-orchestrator`, responsible for publishing the `OrganizationOnboardingRequested` event that kicks off the entire downstream process.

### What This Module Does NOT Own

-   **User Creation:** It does not directly create users. It delegates this responsibility to `api-users` via the event orchestrator.
-   **The `Organization` Entity:** While it creates and updates the `Organization` entity during the onboarding process, the entity itself is defined and owned by the `profiles` module.
-   **The Steps of Orchestration:** It does not manage the individual steps of the cross-service workflow (e.g., how the admin user is created). It only initiates the workflow and awaits its final result.

---

## 3. Endpoints & Entities

This module does not define its own database entities but is the primary creator of the `Organization` entity during the provisioning phase.

### `POST /onboarding`

-   **Description:** The main entry point for a platform administrator to provision a new organization. This endpoint triggers a synchronous, multi-service orchestration workflow that creates the organization, provisions its first admin user, and activates the tenant. The API call will wait for the entire process to complete before returning a response.
-   **Permissions:** `PlatformPermission.ORGS_CREATE` (Platform Admin only).
-   **Body:** `ProvisionOrganizationDto`.
-   **Responses:**
    -   `201 Created`: Returns `OnboardingResponseDto` with details of the created organization and admin user.
    -   `409 Conflict`: If an organization with the same name already exists.
    -   `502 Bad Gateway` or `504 Gateway Timeout`: If the downstream orchestration workflow fails or times out.

### `GET /onboarding/:orgId/status`

-   **Description:** Allows for checking the status of an ongoing or completed onboarding process for a specific organization.
-   **Parameters:** `orgId` (string, UUID).
-   **Responses:**
    -   `200 OK`: Returns `OnboardingStatusResponseDto` detailing the completed steps and current status.
    -   `404 Not Found`: If the organization ID does not exist.

### `POST /internal/activate-organization`

-   **Description:** A private, internal-only endpoint that is called by the `event-orchestrator` as the final step of the provisioning workflow. Its purpose is to update the organization's status from `PROVISIONING` to `ACTIVE`.
-   **Security:** This endpoint is public but should be secured by network policies or a service-to-service authentication mechanism not detailed here. It is not intended for external use.

---

## 4. Key Concepts & Patterns

### Synchronous Orchestration Flow

The core of this module is a synchronous orchestration pattern that provides immediate feedback to the platform administrator. Unlike simple fire-and-forget events, this workflow ensures that the caller knows the outcome of the entire multi-service process.

1.  **Initiation:** A platform admin calls `POST /onboarding`.
2.  **Local Creation:** The `OnboardingService` immediately creates an `Organization` entity in the local PostgreSQL database with a status of `PROVISIONING`. This reserves the organization's name and generates an ID.
3.  **Domain Event:** A fire-and-forget `OrganizationCreated` event is published to notify any services that simply need to be aware of the new organization's existence.
4.  **Orchestration Request:** The service then uses the `EventOrchestratorClient` to send a **request-response** event, `OrganizationOnboardingRequested`. The `OnboardingService` **waits** (asynchronously via `await`) for a response to this specific event.
5.  **Downstream Processing:** The `event-orchestrator` service receives the request and executes its workflow, which includes making an HTTP call to `api-users` to create the initial admin user.
6.  **Callback and Activation:** Once the user is created, the `event-orchestrator` makes an HTTP call back to this service's `/internal/activate-organization` endpoint. This flips the organization's status to `ACTIVE`.
7.  **Final Response:** The `event-orchestrator` completes its workflow and sends a response event. The `OnboardingService`, which has been waiting, receives this response and returns a final `201 Created` to the platform admin.

### State Management (`PROVISIONING` -> `ACTIVE`)

The `Organization.status` field is used as a simple state machine. An organization remains in the `PROVISIONING` state throughout the workflow, which can be used to prevent it from being fully usable in other parts of the system. Only upon successful completion of the entire cross-service process is the status flipped to `ACTIVE`. If the orchestration fails, the status is set to `FAILED`.

---

## 5. Events

### Published Events

The `OnboardingService` is a key event publisher that drives the creation of a new tenant.

| Event Name | Event Type | Purpose |
| :--- | :--- | :--- |
| **Organization Created** | `ORGANIZATIONS_ORGANIZATION_CREATED` | A fire-and-forget event to notify services that a new organization record has been created. |
| **Org Onboarding Requested**|`ORGANIZATIONS_ONBOARDING_REQUESTED`| A request-response event sent via the `EventOrchestratorClient` to trigger the full provisioning workflow. |
| **Org Status Changed** | `ORGANIZATIONS_ORGANIZATION_STATUS_CHANGED`| Published when the organization's status is updated to `ACTIVE` upon completion. |

---

## 6. Dependencies & Integrations

### Internal Dependencies
-   **`profiles` module:** Interacts with the `Organization` entity defined in the `profiles` module.
-   **`events` module:** Uses the `EventPublisher` for standard events and the `EventOrchestratorClient` for the main workflow request.

### External Integrations
-   **`@verichron/event-orchestrator`:** A critical dependency. The `EventOrchestratorClient` is injected to initiate the cross-service workflow.
-   **`api-users` (Indirect):** The orchestration flow initiated by this module results in `api-users` being called to create the admin user.

---

## 7. Gaps & Future Work

-   **Long Timeout:** The service uses a long timeout (85 seconds) when awaiting a response from the event orchestrator. This highlights that the onboarding process is a long-running synchronous operation. Future iterations might explore a more asynchronous model (e.g., using WebSockets or status polling) to provide feedback for even more complex, longer-running provisioning tasks.
-   **Hardcoded Permissions:** The controller relies on the `PermissionsGuard` and a hardcoded `PlatformPermission.ORGS_CREATE` permission. The setup of this permission is managed by the `rbac` module in `api-users`.
