# `core` Module

## 1. Overview

The `core` module for the `api-voice` microservice provides the essential, foundational infrastructure for security, data handling, and request processing. As a `@Global()` module, it exports services and utilities that are available across the entire application without needing to be re-imported in every feature module.

This core module is uniquely tailored for the needs of a telephony service, including specialized components for handling provider webhooks (`TwilioWebhookMiddleware`) and securing sensitive credentials (`EncryptionService`), in addition to the standard authentication and authorization pipeline.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **The Security & Authorization Pipeline:** It owns the complete set of NestJS Guards that secure user-facing endpoints (JWT) and internal service-to-service endpoints (HMAC, API Key).
-   **Webhook Validation:** It owns the `TwilioWebhookMiddleware`, which is responsible for the critical task of validating the authenticity of incoming webhooks from the VoIP provider.
-   **Data Encryption:** It owns the `EncryptionService`, a utility for encrypting and decrypting sensitive configuration data, such as provider API keys and auth tokens.
-   **Request Context Management:** It owns the standard `RequestContext` service and its associated interceptor for providing request-scoped user context.

### What This Module Does NOT Own

-   **Business Logic:** The `core` module is entirely agnostic to the business logic of making calls, generating tokens, or managing Twilio configurations.
-   **Database Entities:** It does not define or interact with any database entities.

---

## 3. Key Components & Patterns

### 3.1. Guards (Authentication & Authorization)
This module provides a multi-layered security approach for different types of requests.

-   **`JwtAuthGuard`:** The primary authentication guard for most endpoints. It implements a dual strategy:
    1.  **HMAC Authentication:** For internal service-to-service calls, it validates a signature passed in request headers.
    2.  **JWT Authentication:** For external requests (e.g., from an agent's browser), it validates the standard JWT Bearer token.
-   **`InternalApiKeyGuard`:** A simpler guard for securing internal endpoints. It validates a static API key passed in the `X-Internal-API-Key` header, providing an alternative to HMAC for services that may not implement the signing logic.
-   **`OrgContextGuard`, `PermissionsGuard`, `RoleGuard`:** The standard suite of authorization guards that run after authentication. They establish the user's organizational context and enforce access control based on the roles and permissions defined in the user's JWT.

### 3.2. Specialized Middleware
-   **`TwilioWebhookMiddleware`:** This is a critical component for webhook security. It is designed to run *before* NestJS's default body parser. Its sole purpose is to validate the `X-Twilio-Signature` of an incoming request from Twilio. This is essential because Twilio's validation algorithm requires access to the raw, unparsed request body, which would otherwise be consumed and modified by the body parser.

### 3.3. Core Services
-   **`RequestContext` Service:** The standard request-scoped service that provides an injectable and clean way to access the current user's identity (`userId`) and organization context (`orgId`) anywhere in the application. It is populated by the `RequestContextInterceptor`.
-   **`EncryptionService`:** A new, vital service unique to this module. It uses AES-256-CBC to encrypt and decrypt sensitive data, such as the Twilio Auth Tokens stored in the database. This ensures that sensitive credentials are never stored in plain text, adhering to security best practices. It relies on a master `API_VOICE_ENCRYPTION_KEY` set in the environment.

### 3.4. Other Components
-   **Decorators:** Includes the standard suite of `@Permissions`, `@Roles`, and `@Public`, as well as the `@OrganizationId` parameter decorator for conveniently injecting the organization ID into controller methods.
-   **Filters & Pipes:** Implements a global `AllExceptionsFilter` for consistent error responses and a `ValidationPipe` for automatic DTO validation.

---

## 4. Authentication & Authorization Flow

The `core` module supports two primary request flows:

**1. Standard API Request (e.g., from Agent UI):**
1.  **`JwtAuthGuard`:** Validates the JWT Bearer token.
2.  **`OrgContextGuard`:** Establishes the user's organizational context from the JWT claims.
3.  **`PermissionsGuard` / `RoleGuard`:** Enforce fine-grained access control based on the endpoint's decorators.
4.  **`RequestContextInterceptor`:** Populates the injectable `RequestContext` service.
5.  **Controller Execution:** The request reaches the controller.

**2. Incoming Twilio Webhook Request:**
1.  **`TwilioWebhookMiddleware`:** This middleware runs first. It validates the `X-Twilio-Signature` using the raw request body and the organization's Twilio Auth Token (which it retrieves and decrypts via the `TwilioConfigService`). If the signature is invalid, the request is rejected with a `401 Unauthorized`.
2.  **NestJS Body Parser:** If the middleware passes, NestJS parses the `application/x-www-form-urlencoded` body into a DTO.
3.  **Controller Execution:** The request reaches the designated webhook controller (e.g., in the `webhooks` module). No JWT or organization context guards are used, as authentication was handled by the middleware.

---

## 5. Dependencies & Integrations

### Internal Dependencies
-   **`twilio-config` module:** The `TwilioWebhookMiddleware` depends on this module to fetch the appropriate Twilio credentials for validating incoming webhook signatures.

### External Dependencies
-   **`@verichron/security`:** Provides the `HmacSigner` for internal service-to-service authentication.
-   **`twilio`:** The official SDK, which includes the `validateRequestWithBody` function used in the webhook middleware.
-   **`crypto` (Node.js built-in):** Used by the `EncryptionService` for all encryption and decryption operations.

---

## 6. Gaps & Future Work

-   **In-Memory Nonce Cache:** The `JwtAuthGuard` uses an in-memory `Set` for HMAC nonce validation, which is not suitable for a multi-instance deployment. A `TODO` in the code indicates this should be replaced with a distributed cache like Redis.
-   **Multiple Internal Auth Methods:** The presence of both HMAC validation in `JwtAuthGuard` and a separate `InternalApiKeyGuard` suggests two different methods for internal service authentication. These could potentially be consolidated into a single, standard approach for simplicity and consistency.
