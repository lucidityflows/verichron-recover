# `webhooks` Module

## 1. Overview

The `webhooks` module is the public-facing gateway for the `api-voice` microservice, responsible for handling all incoming HTTP requests from the third-party VoIP provider (Twilio). It serves as the bridge between Twilio's real-time call events and the application's internal state.

This module's primary responsibilities are to provide dynamic call-control instructions (TwiML) to Twilio and to process asynchronous status updates and recording notifications for every call, ensuring that the `CallLog` is kept up-to-date throughout the lifecycle of a call.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Public Webhook Endpoints:** It owns the public endpoints under `/voice/webhooks/*` that Twilio makes requests to.
-   **TwiML Generation:** It owns the logic for generating TwiML (Twilio Markup Language), which provides real-time instructions to Twilio on how to handle an active call.
-   **Webhook Processing Logic:** It is responsible for processing incoming status callbacks and recording notifications, finding the relevant `CallLog`, and updating it accordingly.
-   **Event Publishing for Call Completion:** It publishes events like `VOICE_CALL_COMPLETED` and `VOICE_RECORDING_READY` after processing the corresponding webhooks.

### What This Module Does NOT Own

-   **Call Initiation:** It does not start calls; this is handled by the `calls` module.
-   **User Authentication:** Its endpoints are public and do not use the standard JWT authentication pipeline. Security is handled by signature validation in the `TwilioWebhookMiddleware`.
-   **The `CallLog` Entity:** While it is the primary writer of updates to the `CallLog` entity (e.g., changing status, adding a recording URL), the entity itself is owned and defined by the `calls` module.

---

## 3. Endpoints & Entities

This module does not define its own database entities but has write access to the `CallLog` entity from the `calls` module.

### `POST /voice/webhooks/voice`

-   **Description:** This endpoint is called by Twilio immediately after a call is initiated by the `CallsService`. It must return an XML response containing TwiML instructions that tell Twilio what to do next. In its current implementation, it instructs Twilio to dial the debtor's number and record the call.
-   **Security:** Secured by `TwilioWebhookMiddleware`.

### `POST /voice/webhooks/status`

-   **Description:** Twilio sends a series of requests to this endpoint throughout a call's lifecycle to provide status updates (e.g., `queued`, `ringing`, `in-progress`, `completed`, `failed`). The service uses the `CallSid` from the request body to find the corresponding `CallLog` and update its status.
-   **Security:** Secured by `TwilioWebhookMiddleware`.

### `POST /voice/webhooks/recording`

-   **Description:** After a call has ended and the recording has been processed, Twilio calls this endpoint, providing the URL of the final recording file. The service saves this URL to the appropriate `CallLog`.
-   **Security:** Secured by `TwilioWebhookMiddleware`.

---

## 4. Key Concepts & Patterns

### TwiML Generation for Call Control
When Twilio initiates a call on behalf of the application, it immediately makes a request to the `/voice/webhooks/voice` endpoint to ask for instructions. This module responds not with JSON, but with an XML document formatted in TwiML (Twilio Markup Language). This TwiML response dictates the entire flow of the call, instructing Twilio to perform actions like dialing a number, playing an audio file, recording the call, or gathering keypad input.

### Asynchronous Status Updates
Voice calls are inherently asynchronous processes. This module handles this by exposing the `/status` webhook endpoint. Twilio sends status updates to this endpoint as the call progresses from `ringing` to `answered` to `completed`. The `handleStatusCallback` method finds the correct `CallLog` in the database using the unique `CallSid` and updates its `status` and `duration` fields, providing a near real-time reflection of the call's state.

### Webhook Security via Middleware
Since the webhook endpoints must be publicly accessible to be reached by Twilio, they cannot be protected by standard user-based JWT authentication. Instead, security is handled by the `TwilioWebhookMiddleware`, which is applied to all routes in this controller. This middleware intercepts every incoming request and uses Twilio's helper library to validate the `X-Twilio-Signature` header, ensuring that the request is authentic and has not been tampered with. This is a critical security measure to prevent unauthorized parties from spoofing call statuses.

---

## 5. Events

### Published Events
This module publishes events after processing webhook callbacks from Twilio.

| Event Name | Event Constant | Trigger |
| :--- | :--- | :--- |
| **Call Completed** | `VOICE_VOICE_CALL_COMPLETED`| The `/status` webhook receives a `completed` status from Twilio. |
| **Recording Ready**| `VOICE_VOICE_RECORDING_READY`| The `/recording` webhook receives a URL for a finished call recording. |

---

## 6. Dependencies & Integrations

### Internal Dependencies
-   **`calls` module:** This module injects the `CallLog` repository to find and update call records based on incoming webhook data.
-   **`core` module:** Provides the `TwilioWebhookMiddleware` used to secure the webhook endpoints.
-   **`twilio-config` module:** An indirect dependency used by the `TwilioWebhookMiddleware` to retrieve the Auth Token needed for signature validation.

### External Integrations
-   **Twilio:** This module is fundamentally an integration point for the Twilio platform. It receives HTTP requests from Twilio and responds with TwiML. It also uses the `twilio` SDK to generate TwiML responses.
-   **PostgreSQL:** The database where the `CallLog` entity is stored and updated.

---

## 7. Gaps & Future Work

-   **Basic TwiML Logic:** The current `generateTwiML` method is very simple and only instructs Twilio to dial a number. Future enhancements could involve building a more sophisticated Interactive Voice Response (IVR) system, with options for playing menus, gathering user input via the keypad (DTMF tones), or routing calls to different agent queues.
-   **Hardcoded Caller ID:** The `callerId` in the TwiML response is currently set to the `body.From` number. This should be replaced with logic to look up the organization's verified outbound caller ID from the `TwilioConfig` to ensure proper number presentation.
