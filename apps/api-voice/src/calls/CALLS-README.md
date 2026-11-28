# `calls` Module

## 1. Overview

The `calls` module is a core feature module within the `api-voice` microservice. It is responsible for managing the initiation and historical tracking of outbound voice calls. It serves as the primary entry point for "click-to-call" functionality, performs critical compliance checks, and creates a persistent log for every call attempt.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Call Initiation Logic:** It owns the business logic for initiating an outbound call via the third-party VoIP provider (Twilio).
-   **The `CallLog` Entity:** It is the source of truth for the `CallLog` entity, which serves as a database record for every call initiated by the system, tracking its participants, provider SID, and eventual outcome.
-   **Call History API:** It owns the API endpoints for starting calls and retrieving a debtor's call history.
-   **Initial Event Publishing:** It is responsible for publishing the `VOICE_CALL_STARTED` event as soon as a call is successfully created with the provider.

### What This Module Does NOT Own

-   **VoIP Provider Configuration:** It does not store Twilio credentials. It fetches them from the `twilio-config` module.
-   **In-Call Control (TwiML):** It does not define the behavior of the call once connected. It delegates this by providing a webhook URL to the `webhooks` module, which serves the necessary TwiML instructions.
-   **Call Status Updates:** It does not process status updates from the provider. It provides a status callback URL to the `webhooks` module, which handles these updates.
-   **Do Not Call (DNC) Compliance:** It does not maintain DNC lists. It queries an internal `CommunicationsService` (a client for `api-communications`) to perform a compliance check before dialing.

---

## 3. Entities

### `CallLog`

This is the primary PostgreSQL entity for the module, creating a comprehensive record for every outbound call attempt.

-   **Purpose:** To serve as an auditable log for all telephony activities. It tracks a call from initiation to completion, storing essential metadata that is updated asynchronously by the webhook listeners.
-   **Key Fields:**
    -   `id` (string, UUID): The internal primary key.
    -   `organizationId` (string, UUID): The tenant organization that initiated the call.
    -   `debtorId` (string, UUID): The debtor who was called.
    -   `agentId` (string, UUID): The agent (user) who initiated the call.
    -   `providerSid` (string): The unique Session ID (SID) from the VoIP provider (e.g., Twilio). This is used as a foreign key to correlate webhook events.
    -   `status` (enum: `CallStatus`): The current lifecycle status of the call (e.g., `QUEUED`, `RINGING`, `COMPLETED`).
    -   `duration` (number | null): The final duration of the call in seconds.
    -   `disposition` (enum: `CallDisposition` | null): The business outcome of the call, typically set by the agent post-call (e.g., `PROMISE_TO_PAY`, `LEFT_VOICEMAIL`).
    -   `recordingUrl` (string | null): A secure URL to the call recording, populated after the call is completed.

---

## 4. Endpoints

All endpoints are prefixed with `/voice/calls` and are protected by authentication.

### `POST /`

-   **Description:** Initiates a "click-to-call" action. This is the main entry point for an agent in the UI to start an outbound call to a debtor. The service will perform a DNC check before creating the call with the VoIP provider.
-   **Permissions:** `voice:call`
-   **Body:** `InitiateCallDto` (contains `debtorId` and `phoneNumber`).
-   **Returns:** An object containing the `callSid` from the provider.

### `GET /:debtorId`

-   **Description:** Retrieves a debtor's complete call history, sorted from newest to oldest. This is used to populate the activity timeline in the Debtor 360 view.
-   **Permissions:** `voice:call:read`
-   **Parameters:** `debtorId` (string, UUID).
-   **Returns:** An array of `CallLog` objects.

---

## 5. Key Concepts & Patterns

### Call Initiation Flow
The `initiateCall` method orchestrates a clear sequence of events to start a call:
1.  **DNC Compliance Check:** It first calls the `communicationsService` to verify the debtor is not on a "Do Not Call" list. If the check fails, the process stops and a `403 Forbidden` error is thrown.
2.  **Fetch Configuration:** It retrieves the organization-specific Twilio credentials from the `TwilioConfigService`.
3.  **Create Provider Call:** It uses the Twilio SDK to make an API request to `twilio.calls.create()`. In this request, it provides webhook URLs for call control (`url`) and status updates (`statusCallback`), effectively delegating the next steps to the `webhooks` module.
4.  **Log the Attempt:** It immediately creates and saves a `CallLog` entity to the database with the initial `QUEUED` status and the `providerSid`.
5.  **Publish Event:** It publishes a `VOICE_CALL_STARTED` event to notify other parts of the system that the call has been initiated.

### Event-Driven Architecture
Upon successfully creating the call with Twilio, the service immediately publishes a `VOICE_CALL_STARTED` event. This allows other services to react in real-time. For example, `api-collectors` or `api-users` could listen for this event to automatically update the initiating agent's status to "On Call," providing presence information to the rest of the team.

---

## 6. Events

### Published Events
| Event Name | Event Constant | Trigger |
| :--- | :--- | :--- |
| **Call Started** | `VOICE_VOICE_CALL_STARTED`| A new outbound call is successfully created with the Twilio provider. |

---

## 7. Dependencies & Integrations

### Internal Dependencies
-   **`twilio-config` module:** Injected to retrieve the Account SID and Auth Token required to initialize the Twilio client for the correct organization.
-   **`shared/services/communications.service`:** A client for the `api-communications` service, used to perform the mandatory DNC compliance check.
-   **`core` module:** The `RequestContext` service is used to get the `userId` of the agent initiating the call.

### External Integrations
-   **Twilio:** The third-party VoIP provider used to place the actual phone call.
-   **PostgreSQL:** The database used to store the `CallLog` entity.
-   **`@verichron/event-publisher`:** The library used to publish the `VOICE_CALL_STARTED` event.
-   **`api-communications` (Microservice):** An external service dependency for DNC checks.

---

## 8. Gaps & Future Work

-   **Placeholder "From" Number:** The phone number used to make the outbound call is currently hardcoded to a placeholder. A `TODO` in the code indicates this needs to be replaced with logic to fetch the organization's verified phone number from configuration.
-   **Hardcoded Webhook URLs:** The callback URLs provided to Twilio are hardcoded. These should be sourced from environment variables to allow for different URLs in development, staging, and production environments.
-   **Incomplete Event Payload:** The `VOICE_CALL_STARTED` event is currently published with a plain JavaScript object. A `TODO` notes that a proper, validated DTO class should be created for this payload to ensure type safety and consistency with the platform's eventing standards.
