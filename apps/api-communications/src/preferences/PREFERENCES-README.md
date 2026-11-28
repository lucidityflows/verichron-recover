# `preferences` Module

## 1. Overview

The `preferences` module is a foundational data management module within the `api-communications` microservice. It is responsible for creating, storing, and managing all debtor-specific communication preferences for each organization.

This module serves as the single source of truth for all compliance-related settings, such as channel opt-outs, "do not contact" requests, and custom contact hours. The data managed here is the primary input for the `compliance` module's rule engine, making it a cornerstone of the platform's ability to adhere to regulations like the FDCPA and TCPA.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **The `DebtorPreference` Entity:** It owns the TypeORM entity and the corresponding `debtor_preferences` database table, which stores all preference data.
-   **CRUD Operations for Preferences:** It owns the service logic and API endpoints for creating, reading, and updating debtor preferences.
-   **Opt-In/Opt-Out Logic:** It provides dedicated business logic and endpoints for managing debtor opt-outs and opt-ins for specific communication channels.

### What This Module Does NOT Own

-   **Compliance Enforcement:** It does not enforce compliance rules. It acts as a passive data provider for the `compliance` module, which is responsible for reading the preferences and making decisions based on them.
-   **User-Facing UI:** It does not include any user interface components for managing preferences; it only provides the backend API endpoints.

---

## 3. Entities

### `DebtorPreference`

This is the core PostgreSQL entity for the module, storing a comprehensive set of communication preferences for a single debtor within a single organization.

-   **Purpose:** To serve as the definitive record of a debtor's communication wishes and the parameters for compliance checks.
-   **Key Fields:**
    -   `id` (string, UUID): The primary key for the preference record.
    -   `debtorId` (string, UUID): The foreign key reference to the debtor.
    -   `organizationId` (string, UUID): The tenant organization these preferences apply to. A unique constraint on `(debtorId, organizationId)` ensures one record per debtor per org.
    -   `doNotContact` (boolean): A global "master switch" to block all communications to the debtor.
    -   `optedOutChannels` (string[]): A JSONB array storing the specific channels (e.g., `EMAIL`, `SMS`) the debtor has opted out of.
    -   `allowedStartHour` / `allowedEndHour` (number): The debtor-specific window for allowed contact times, defaulting to FDCPA-compliant hours (8 AM - 9 PM).
    -   `dailyContactLimit` (number): The maximum number of communications allowed per day.
    -   `timezone` (string | null): The debtor's IANA timezone string, essential for accurate time-of-day checks.
-   **Relations:** This entity is self-contained and has no direct outgoing TypeORM relations.

---

## 4. Endpoints

All endpoints are prefixed with `/preferences` and require JWT authentication.

### `GET /preferences/:debtorId`

-   **Description:** Retrieves the communication preferences for a specific debtor. If no record exists, it transparently creates one with default settings and returns it.
-   **Parameters:** `debtorId` (string, UUID).
-   **Responses:**
    -   `200 OK`: Returns the `DebtorPreference` object.

### `PUT /preferences/:debtorId`

-   **Description:** Updates a debtor's communication preferences. This endpoint supports partial updates.
-   **Parameters:** `debtorId` (string, UUID).
-   **Body:** `UpdatePreferenceDto`.
-   **Responses:**
    -   `200 OK`: Returns the updated `DebtorPreference` object.

### `POST /preferences/:debtorId/opt-out`

-   **Description:** A dedicated endpoint to process an opt-out request for a specific communication channel. It adds the specified channel to the `optedOutChannels` array.
-   **Parameters:** `debtorId` (string, UUID).
-   **Body:** `OptOutDto` (contains the `channel` to opt out of).
-   **Responses:**
    -   `204 No Content`: On successful opt-out.

### `POST /preferences/:debtorId/opt-in`

-   **Description:** A dedicated endpoint to process an opt-in request, reversing a previous opt-out. It removes the specified channel from the `optedOutChannels` array.
-   **Parameters:** `debtorId` (string, UUID).
-   **Body:** `OptInDto` (contains the `channel` to opt in to).
-   **Responses:**
    -   `204 No Content`: On successful opt-in.

---

## 5. Key Concepts & Patterns

### "Get-or-Create" with Sensible Defaults

The `findByDebtor` service method implements a robust "get-or-create" pattern. When preferences are requested for a debtor for the first time, the service automatically creates and persists a new `DebtorPreference` record with sensible, FDCPA-compliant default values (e.g., contact hours of 8 AM to 9 PM). This ensures that the `compliance` module can always expect a valid preference object, simplifying the rule-checking logic and preventing null-pointer errors.

### Global vs. Channel-Specific Opt-Outs

The module provides two distinct levels of opt-out control, which is essential for both compliance and a good debtor experience:
1.  **Global Opt-Out:** The `doNotContact` boolean flag acts as a master switch. If `true`, all communications are blocked, regardless of the channel.
2.  **Channel-Specific Opt-Out:** The `optedOutChannels` array allows for more granular control, enabling a debtor to opt out of SMS messages while still receiving emails, for example.

### Data Source for the Compliance Engine

The primary architectural role of this module is to serve as a reliable data source for the `ComplianceService`. The `compliance` module injects the `PreferencesService` to fetch the specific rules and settings (like allowed hours, opt-out lists, and frequency limits) it needs to enforce before any communication is dispatched.

---

## 6. Events

This module is a synchronous, CRUD-based service and does not publish or subscribe to any events on the message bus. Changes to preferences are handled transactionally via its API.

---

## 7. Dependencies & Integrations

### Internal Dependencies

This module is a foundational data layer with no dependencies on other business logic modules in the service. It is a critical dependency *for* the `compliance` module.

### External Integrations

-   **PostgreSQL:** The primary database where the `debtor_preferences` table is stored. The module uses TypeORM to interact with the database.

---

## 8. Gaps & Future Work

-   **Timezone-Dependent Logic:** While the `DebtorPreference` entity includes a `timezone` field, the service layer itself does not perform any timezone-specific calculations. The consumer of this data (the `compliance` module) is responsible for correctly interpreting the `allowedStartHour` and `allowedEndHour` relative to the debtor's timezone, a feature which is noted as a gap in that module.
-   **Audit Trail for Preference Changes:** The entity tracks `createdAt` and `updatedAt`, but a more robust audit trail could be implemented to log exactly *what* was changed, *when*, and by *whom* (a collector or the debtor themselves via a portal). This would enhance compliance and accountability.
