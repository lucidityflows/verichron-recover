# `twilio-config` Module

## 1. Overview

The `twilio-config` module is a crucial security and configuration component within the `api-voice` microservice. It is responsible for securely storing and managing the Twilio API credentials and settings required for each tenant organization.

This module provides a dedicated and secure repository for the sensitive keys needed to interact with the Twilio API, enabling `api-voice` to operate as a multi-tenant service that acts on behalf of different organizations using their specific credentials.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **The `TwilioConfig` Entity:** It owns the `TwilioConfig` TypeORM entity, which defines the database schema for storing Twilio credentials.
-   **Secure Credential Management:** It owns the complete business logic for creating, reading, updating, and deleting these configurations. Critically, it is responsible for encrypting sensitive secrets before they are persisted to the database.
-   **Configuration API:** It provides the API endpoints under `/voice/config` for administrators to manage their organization's Twilio settings.

### What This Module Does NOT Own

-   **Encryption Algorithms:** It does not implement encryption logic itself. It delegates all cryptographic operations to the `EncryptionService` provided by the `core` module.
-   **Usage of Credentials:** It is only a data provider. It does not use the credentials to make calls or generate tokens; it simply supplies the decrypted credentials to other services (like `CallsService` and `TokensService`) when they are needed.

---

## 3. Entities

### `TwilioConfig`
This is the core PostgreSQL entity for the module, storing all the necessary Twilio credentials for a single organization.
- **Purpose:** To serve as the secure data record for one organization's Twilio account settings. A unique constraint on `organizationId` ensures that each organization can have only one configuration.
- **Key Fields:**
    - `id` (string, UUID): The primary key for the configuration record.
    - `organizationId` (string, UUID): The ID of the tenant organization this configuration belongs to.
    - `accountSid` (string): The main Twilio Account SID.
    - `authToken` (string): The Twilio Auth Token. **This field is encrypted at rest.**
    - `apiKeySid` (string): The SID of the Twilio API Key used for generating access tokens.
    - `apiKeySecret` (string): The secret for the Twilio API Key. **This field is encrypted at rest.**
    - `outgoingApplicationSid` (string): The SID of the TwiML App used to handle outbound call logic.

---

## 4. Endpoints

All endpoints are prefixed with `/voice/config` and are protected by role-based authentication, typically requiring an Organization Admin.

### `POST /`
-   **Description:** Creates a new Twilio configuration for the authenticated user's organization. The service automatically encrypts the `authToken` and `apiKeySecret` before saving.
-   **Permissions:** `ORG_ADMIN`.
-   **Returns:** `TwilioConfigResponseDto` with sensitive fields redacted.

### `GET /`
-   **Description:** Retrieves the Twilio configuration for the user's organization.
-   **Permissions:** `ORG_ADMIN`, `ORG_MANAGER`.
-   **Returns:** `TwilioConfigResponseDto`, which **omits** the sensitive `authToken` and `apiKeySecret` for security.

### `PATCH /`
-   **Description:** Updates one or more fields of the organization's Twilio configuration. Any provided secrets are re-encrypted before being saved.
-   **Permissions:** `ORG_ADMIN`.
-   **Returns:** The updated `TwilioConfigResponseDto` with sensitive fields redacted.

### `DELETE /`
-   **Description:** Deletes the Twilio configuration for the user's organization.
-   **Permissions:** `ORG_ADMIN`.
-   **Returns:** `204 No Content` on success.

---

## 5. Key Concepts & Patterns

### Encryption at Rest
This is the most critical security pattern in the module. The `TwilioConfigService` injects the `EncryptionService` from the `core` module to ensure that sensitive credentials are never stored in plain text.
- **On Write (`create`/`update`):** Before saving a new or updated configuration, the service calls `encryptionService.encrypt()` on the `authToken` and `apiKeySecret` fields. The encrypted strings are what get persisted in the database.
- **On Read (Internal Use):** When another service within `api-voice` (like `TokensService`) needs to use the credentials, it calls `twilioConfigService.findOne()`. This method retrieves the encrypted record from the database and immediately calls `encryptionService.decrypt()` to return the plaintext secrets for immediate use. The decrypted secrets are never stored long-term in memory.

### Per-Tenant Configuration
The module is designed around the principle that each tenant organization brings their own Twilio account. The `TwilioConfig` entity is uniquely keyed by `organizationId`, allowing the `api-voice` service to function as a multi-tenant gateway, dynamically using the correct set of credentials for whichever organization is making a request.

### Data Sanitization for API Responses
To prevent any possibility of leaking sensitive credentials, all public-facing controller methods return a `TwilioConfigResponseDto`. This DTO is explicitly designed to exclude the `authToken` and `apiKeySecret` fields, ensuring that they are never serialized and sent over the network in an API response. The full, decrypted entity is only ever used internally between services.

---

## 6. Events

This module is a CRUD and data-provider service. It does not publish or subscribe to any events.

---

## 7. Dependencies & Integrations

### Internal Dependencies
-   **`core` module:** This is a critical dependency, as the `TwilioConfigService` injects the `EncryptionService` to handle all cryptographic operations.

### External Integrations
-   **PostgreSQL:** The database where the `twilio_configs` table is stored, accessed via TypeORM.

---

## 8. Gaps & Future Work

-   **Secret Rotation Strategy:** While the credentials are encrypted at rest, the system relies on a single master `API_VOICE_ENCRYPTION_KEY`. For enhanced security, a strategy for rotating this master key should be developed.
-   **Credential Validation:** The service currently saves any provided credentials without verifying them. A future enhancement would be to make a test API call to Twilio upon saving a new or updated configuration to confirm that the credentials are valid and have the necessary permissions, providing immediate feedback to the administrator.
