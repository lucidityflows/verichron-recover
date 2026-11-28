# `settings` Module

## 1. Overview

The `settings` module in `api-organizations` is responsible for managing the flexible, tenant-specific configuration for each organization. It provides a structured API for reading and writing a wide range of settings—from branding and compliance to business rules—that are stored within a single, extensible JSONB database field.

This module acts as the central repository for an organization's operational parameters, allowing other microservices to query these settings and tailor their behavior accordingly for each tenant.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Flexible Configuration (The "Soft Locks"):** Managing non-relational, organization-wide parameters such as branding (logo, colors), communication preferences (dispatch hours, opt-out logic), and system integration keys.
-   **The Settings API:** REST API endpoints under `/orgs/:orgId/settings` for getting and updating JSONB-based configuration.
-   **Settings Validation Logic:** Schema-on-write validation using the `OrganizationSettingsDto` to ensure JSONB integrity.

### What This Module Does NOT Own

-   **High-Stakes Financial Strategy:** It does NOT own Settlement matrices or Payment Plan approval thresholds. These are owned by the `strategy` module to ensure relational integrity and strict type safety.
-   **Federal/State Laws (The "Hard Locks"):** Legal calling windows and frequency caps are system-enforced and cannot be overridden here. This module only stores "Soft" agency-level preferences.

---

## 3. Endpoints & Entities

This module does not define its own database entities. It operates on the `settings` JSONB column of the `Organization` entity. All endpoints are nested under `/orgs/:orgId/settings`.

### `GET /`

-   **Description:** Retrieves the complete JSON settings object for a specific organization.
-   **Permissions:** `orgs:settings:read`
-   **Responses:**
    -   `200 OK`: Returns the `OrganizationSettingsResponseDto`, containing the settings object.
    -   `404 Not Found`: If the organization does not exist.

### `PATCH /`

-   **Description:** Partially updates the organization's settings. The provided settings object is **deep-merged** with the existing settings, allowing for granular changes to nested properties without needing to resubmit the entire object.
-   **Permissions:** `orgs:settings:write`
-   **Body:** `UpdateOrganizationSettingsDto`.
-   **Responses:**
    -   `200 OK`: Returns the complete, updated settings object.
    -   `400 Bad Request`: If the provided settings data fails validation.

### `PUT /`

-   **Description:** Completely replaces the entire settings object for an organization with the object provided in the request body. Any existing settings that are not included in the new object will be removed.
-   **Permissions:** `orgs:settings:write`
-   **Body:** `ReplaceOrganizationSettingsDto`.
-   **Responses:**
    -   `200 OK`: Returns the new settings object.
    -   `400 Bad Request`: If the provided settings data is not a complete and valid object.

---

## 4. Key Concepts & Patterns

### Flexible Configuration via JSONB
The core architectural choice is to store all tenant-specific settings in a single `settings` JSONB column on the `organizations` table. This provides maximum flexibility, allowing new configuration categories and properties to be added in the future without requiring database schema migrations, which is ideal for a SaaS platform with evolving features.

### Schema-on-Write Validation
To bring structure and type safety to the schemaless JSONB field, this module employs a "schema-on-write" pattern.
- A comprehensive `OrganizationSettingsDto` and its nested sub-DTOs (`OrganizationBrandingSettingsDto`, `OrganizationComplianceSettingsDto`, etc.) are defined with `class-validator` decorators.
- This DTO acts as a strict schema. Before any `PATCH` or `PUT` operation, the `SettingsService` validates the incoming data against this schema.
- This ensures that only well-formed and valid data is ever written to the database, preventing data corruption and ensuring that services consuming the settings can rely on a consistent structure.

### Deep Merge (PATCH) vs. Full Replace (PUT)
The module offers two distinct methods for updates, adhering to RESTful conventions:
-   **`PATCH` (Partial Update):** The service performs a deep merge of the provided settings with the existing ones. This is the preferred method for changing a single value, as the client only needs to send the property they wish to change.
-   **`PUT` (Full Replacement):** The service completely discards the old settings object and replaces it with the one provided in the request. This is useful for restoring settings from a backup or applying a complete template.

### Event Publishing on Change
Any successful update via `PATCH` or `PUT` triggers an `OrganizationSettingsUpdated` event. This event's payload includes a list of the top-level keys that were modified (e.g., `['branding', 'businessRules']`). This allows downstream consumer services to efficiently decide if they need to refresh their own cached settings, without having to poll for changes or process irrelevant updates.

---

## 5. Events

### Published Events
| Event Name | Event Constant | Trigger |
| :--- | :--- | :--- |
| **Settings Updated** | `ORGANIZATIONS_ORGANIZATION_SETTINGS_UPDATED` | An organization's settings are changed via the `PATCH` or `PUT` endpoints. |

---

## 6. Dependencies & Integrations

### Internal Dependencies
-   **`profiles` module:** The service reads from and writes to the `Organization` entity, which is owned by the `profiles` module.
-   **`events` module:** Used to inject the `EventPublisher` for publishing update events.

### External Integrations
-   **PostgreSQL:** The underlying database where the `organizations` table and its `settings` JSONB column are stored.
-   **`class-validator`:** A crucial library used to implement the "schema-on-write" validation pattern.

---

## 7. Gaps & Future Work

-   **`updatedBy` User Context:** The service currently hardcodes a placeholder for the `updatedBy` field in the published `OrganizationSettingsUpdated` event. This should be updated to use the `RequestContext` service to inject the real ID of the user performing the update.
-   **Custom Merge Logic:** The `deepMerge` function in the service is a custom implementation. For more complex settings structures in the future, replacing this with a well-tested, third-party library like `lodash.merge` could provide more robust handling of edge cases.
