# `tokens` Module

## 1. Overview

The `tokens` module within the `api-voice` microservice is dedicated to the secure generation of ephemeral Twilio Access Tokens (also known as capability tokens). These tokens are a critical component for enabling client-side VoIP functionality, such as browser-based softphones, for agents in the organization's user interface.

This module acts as a secure vendor, issuing short-lived credentials that grant specific voice capabilities to a client application, allowing it to connect directly to Twilio's Voice services.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Twilio Access Token Generation:** It owns the logic for securely constructing and signing Twilio Access Tokens, incorporating necessary grants (e.g., `VoiceGrant`) and client identity.
-   **Token Vending API:** It provides the API endpoint (`GET /voice/token`) from which client applications can request and receive these capability tokens.

### What This Module Does NOT Own

-   **Twilio Credentials:** It does not store Twilio Account SIDs, API Keys, or Auth Tokens. It retrieves these securely from the `twilio-config` module.
-   **User Identity:** It does not manage user identities. It relies on the `RequestContext` to obtain the authenticated user's ID.
-   **Call Control:** It does not initiate or manage the actual voice calls; it only provides the token that enables a client to do so. The `calls` module handles call initiation.

---

## 3. Entities

This module does not define or manage any database entities. It is a stateless service focused on token generation.

---

## 4. Endpoints

All endpoints are prefixed with `/voice/token` and are protected by authentication.

### `GET /`

-   **Description:** Generates and returns a Twilio Access Token (capability token) for the authenticated user. This token is used by client-side applications (e.g., a browser-based softphone) to initialize the Twilio Voice SDK and establish a connection to Twilio's voice services.
-   **Permissions:** `voice:call` (ensures only authorized users can request tokens).
-   **Returns:** An object containing the `token` string.

---

## 5. Key Concepts & Patterns

### Twilio Access Token (Capability Token)
A Twilio Access Token is a JSON Web Token (JWT) issued by your backend server (this module) that authenticates a client-side application (like a web browser or mobile app) to make calls using the Twilio Voice SDK.
-   **Purpose:** It grants specific "capabilities" (grants) to the client, such as the ability to make outbound calls (`OutgoingApplicationSid`) or receive incoming calls (`IncomingAllow`).
-   **`outgoingApplicationSid`**: This crucial configuration, retrieved from the `TwilioConfigService`, tells Twilio which TwiML application to execute when an outbound call is made using this token. This enables centralized call routing logic.

### Identity Mapping
Each generated Twilio Access Token includes an `identity` claim, which is populated with the unique `userId` of the authenticated user (agent). This ensures that every call session and event originating from the client-side softphone can be reliably traced back to the specific agent who initiated it.

### Ephemeral Nature
Twilio Access Tokens are designed to be short-lived. They have an expiration time, minimizing the window of opportunity for misuse if a token were to be intercepted. Clients are expected to request new tokens periodically as needed.

---

## 6. Events

This module is a synchronous token-vending service and does not publish or subscribe to any events on the message bus.

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`twilio-config` module:** A critical dependency. It is injected to retrieve organization-specific Twilio credentials (Account SID, API Key SID, API Key Secret, Outgoing Application SID) that are necessary for building and signing the access token.
-   **`core` module:** The `RequestContext` service from the `core` module is injected to securely obtain the `userId` of the authenticated agent, which is used as the `identity` for the Twilio client.

### External Integrations

-   **Twilio:** The Twilio Node.js SDK (`twilio.jwt.AccessToken`) is used to programmatically construct and sign the Access Tokens.

---

## 8. Gaps & Future Work

-   **`identity` claim resilience:** The service throws an `InternalServerErrorException` if the `userId` is not found in the `RequestContext`. While this ensures robustness, it's critical that the authentication pipeline (JwtAuthGuard, OrgContextGuard) reliably populates the `RequestContext` with the `userId` for all voice-enabled users.
