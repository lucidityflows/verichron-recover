# `gateways` Module

## 1. Overview

The `gateways` module in `api-communications` is a crucial infrastructure layer responsible for abstracting all interactions with third-party communication providers. It acts as the dispatch hub for sending emails (via SendGrid) and SMS messages (via Twilio), and as the ingestion point for receiving delivery status updates from these providers via webhooks.

This module is designed around a factory pattern, allowing the application to be agnostic of the specific provider being used and enabling easy swapping between real providers and mock services for development and testing.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Provider Abstraction:** It owns the `GatewayFactoryService`, which is responsible for selecting and providing the correct gateway (e.g., SendGrid, Twilio, or a mock) based on the application's configuration.
-   **Provider-Specific Logic:** It encapsulates all the provider-specific implementation details, including API client initialization, payload formatting, and error handling, within dedicated services (`SendGridService`, `TwilioService`).
-   **Webhook Ingestion:** It owns the webhook controllers (`SendGridWebhookController`, `TwilioWebhookController`) that receive, verify, and process incoming status events from external providers.
-   **Webhook Security:** It is responsible for the critical task of verifying webhook signatures to ensure that all incoming status updates are authentic and secure.

### What This Module Does NOT Own

-   **Communication Content:** It does not create or manage the content of messages (e.g., from templates). It only receives a fully-rendered payload and dispatches it.
-   **Dispatch Logic:** It does not decide *when* to send a communication. It is a passive service that is called by other parts of the application (e.g., the `dispatch` module) to perform the sending action.
-   **Communication Logs:** It does not directly write to the database. Upon receiving a webhook event, it calls the `LogsService` to update the status of the corresponding communication log.

---

## 3. Endpoints

This module does not own any business entities. Its controllers only expose webhook endpoints for receiving data from third-party providers.

### `POST /webhooks/sendgrid`

-   **Description:** Receives email event notifications from SendGrid, such as `delivered`, `open`, `bounce`, and `click`. It processes an array of events in each request.
-   **Security:** Verifies each request using ECDSA signature verification with the `x-twilio-email-event-webhook-signature` and `x-twilio-email-event-webhook-timestamp` headers.
-   **Action:** For each event, it maps the SendGrid status to an internal `CommunicationStatus` enum and calls `logsService.updateStatusByProviderMessageId` to update the communication log.

### `POST /webhooks/twilio`

-   **Description:** Receives SMS status callback notifications from Twilio, such as `sent`, `delivered`, and `failed`.
-   **Security:** Verifies each request using Twilio's standard HMAC-SHA1 signature validation via the `x-twilio-signature` header.
-   **Action:** It maps the Twilio `MessageStatus` to an internal `CommunicationStatus` enum and calls `logsService.updateStatusByProviderMessageId` to persist the update.

---

## 4. Key Concepts & Patterns

### Gateway Factory Pattern

The `GatewayFactoryService` is the centerpiece of this module's architecture. Instead of services directly injecting `SendGridService` or `TwilioService`, they inject the factory and request a gateway based on the communication channel:
-   `factory.getEmailGateway(): IEmailGateway`
-   `factory.getSmsGateway(): ISmsGateway`

The factory reads the environment configuration (`EMAIL_PROVIDER`, `SMS_PROVIDER`) to determine whether to return a live provider instance (like `SendGridService`) or a `MockEmailService`. This makes the application highly configurable and easy to test.

### Provider Abstraction & Mocking

All gateway services implement a common interface (`IEmailGateway` or `ISmsGateway`), which standardizes the `send` method. The module includes mock implementations (`MockEmailService`, `MockSmsService`) that fulfill this contract by logging the communication payload to the console instead of making external API calls. The factory is designed to automatically fall back to these mocks if the API keys for the live providers are missing, streamlining the local development experience.

### Secure Webhook Handling

Each webhook controller implements robust security to prevent webhook spoofing:
-   The `SendGridWebhookController` uses `crypto.createVerify('sha256')` to perform ECDSA signature verification based on the provider's public key.
-   The `TwilioWebhookController` uses Twilio's official `validateRequest` helper function to perform HMAC-SHA1 signature validation.

Requests that fail verification are immediately rejected with a `401 Unauthorized` status.

### Decoupled Logging via `LogsService`

The webhook controllers are designed with a clear separation of concerns. They are responsible for receiving and verifying external events, but they delegate the task of persisting these status updates to the `LogsService`. This keeps the gateway module focused on communication and lets the `logs` module manage all database interactions related to communication history.

---

## 5. Events

This module does not publish or subscribe to any internal events on the GCP Pub/Sub message bus. It is purely a consumer of external events via third-party HTTP webhooks.

---

## 6. Dependencies & Integrations

### Internal Dependencies

-   **`logs` module:** A critical dependency. The webhook controllers inject `LogsService` to update the status of communication records in the database.
-   **`ConfigModule` (`@nestjs/config`):** Used heavily by the `GatewayFactoryService` and provider services to access environment variables like API keys and provider choices.

### External Integrations

-   **SendGrid:** The primary email provider. The `SendGridService` uses the `@sendgrid/mail` SDK to send emails.
-   **Twilio:** The primary SMS provider. The `TwilioService` uses the `twilio` SDK to send text messages.


