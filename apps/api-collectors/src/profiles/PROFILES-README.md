# `profiles` Feature Module

## 1. Overview
The `profiles` module manages the "Roster" of collectors within an organization. It stores the metadata required for intelligent account routing, such as skills, language proficiency, and geographic territories.

---

## 2. Ownership & Boundaries

### What This Module Owns
*   **Collector Metadata:** Skills, specializations, and territories.
*   **Availability State:** Real-time status (AVAILABLE, BUSY, ON_BREAK, OFFLINE).
*   **Capacity Limits:** Maximum number of active accounts a collector can manage.

### What This Module Does NOT Own
*   **User Identity:** Handled by `api-users`.
*   **Team Membership:** Handled by `api-organizations`.

---

## 3. Entities

### `CollectorProfile`
*   **Key Fields:**
    *   `userId`: UUID (Primary Key, links to `api-users`)
    *   `organizationId`: UUID
    *   `skills`: String[] (e.g., "MEDICAL", "SPANISH", "NEGOTIATION")
    *   `territories`: String[] (State codes or zip code prefixes)
    *   `availabilityStatus`: Enum
    *   `maxCapacity`: Integer

---

## 4. Endpoints

### `GET /organizations/:orgId/profiles`
*   **Description:** Lists collectors with optional filtering by skills or availability.

### `PATCH /organizations/:orgId/profiles/:profileId/status`
*   **Description:** Updates the collector's current availability status.
*   **Permissions:** `users:write` (for managers) or self-update.

### `GET /organizations/:orgId/profiles/capacity`
*   **Description:** Returns real-time utilization vs. maximum capacity for the roster.
