# `workstation` Feature Module

## 1. Overview
The `workstation` module is the primary operational environment for collectors. It provides a unified, 360-degree view of a debtor by orchestrating data from multiple microservices and allows collectors to log engagement actions.

---

## 2. Ownership & Boundaries

### What This Module Owns
*   **Collector Actions:** Logging and persistence of every interaction (Calls, Emails, SMS, Notes).
*   **Engagement Timeline:** Building a chronological history of debtor-collector touchpoints.
*   **Debtor Focus Orchestration:** Triggering the cross-service aggregation logic to build the "Focus" view.

### What This Module Does NOT Own
*   **Debt Data:** Financial records are owned by `api-debts`.
*   **Debtor PII:** Personal identity information is owned by `api-debtors`.
*   **Payment Plans:** Transactional history is owned by `api-transactions`.

---

## 3. Entities

### `CollectorAction`
Stores every discrete action taken by a collector against a debtor profile.
*   **Key Fields:**
    *   `id`: UUID
    *   `organizationId`: UUID (Tenant isolation)
    *   `collectorUserId`: UUID (The agent)
    *   `debtorProfileId`: UUID (The target)
    *   `actionType`: Enum (CALL, EMAIL, SMS, NOTE, PAYMENT_REQUEST)
    *   `outcome`: String (e.g., "Left Voicemail")
    *   `metadata`: JSONB (Action-specific details)

---

## 4. Endpoints

### `GET /organizations/:orgId/workstation/debtors/:debtorProfileId/focus`
*   **Description:** Returns the 360-degree aggregated view for a single debtor.
*   **Permissions:** `debtors:read`
*   **Implementation:** Uses the `EventOrchestrator` to gather data from `api-debts`, `api-debtors`, and `api-transactions`.

### `POST /organizations/:orgId/workstation/debtors/:debtorProfileId/actions`
*   **Description:** Logs a new action taken by the collector.
*   **Permissions:** `debtors:write`
*   **Events:** Publishes `COLLECTORS_DEBTOR_ACTION_LOGGED`.

### `GET /organizations/:orgId/workstation/actions`
*   **Description:** Retrieves a feed of recent collector actions for the organization or a specific team.
*   **Query Params:** `teamId`, `pageSize`.
