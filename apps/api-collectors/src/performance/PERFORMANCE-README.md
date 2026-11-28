# `performance` Feature Module

## 1. Overview
The `performance` module implements the **CQRS Read Model** for collector analytics. It listens to system-wide events to build a high-performance history of collector effectiveness, enabling real-time leaderboards and trend analysis.

---

## 2. Ownership & Boundaries

### What This Module Owns
*   **Performance Metrics:** Calculations for Recovery Rate, Promises Kept, and Average Handle Time.
*   **Historical Tracking:** Maintaining the `CollectorResponseTracking` audit trail.
*   **Leaderboards:** Ranking logic based on total collections per period.

### What This Module Does NOT Own
*   **Operational Work Queue:** Managed by the `work-queue` module.
*   **Financial Source of Truth:** Payments are owned by `api-transactions`.

---

## 3. Entities

### `CollectorResponseTracking`
A denormalized entity designed for high-speed analytical queries.
*   **Key Fields:**
    *   `assignmentId`: UUID
    *   `collectorUserId`: UUID
    *   `assignedAt`: Timestamp
    *   `firstContactAt`: Timestamp (Nullable)
    *   `resolvedAt`: Timestamp (Nullable)
    *   `recoveryAmount`: Decimal
    *   `outcomeStatus`: Enum (RECOVERED, DEFAULTED, UNREACHABLE)

---

## 4. Endpoints

### `GET /organizations/:orgId/performance/stats/today`
*   **Description:** Aggregated KPIs for the current day for the authenticated collector.

### `GET /organizations/:orgId/performance/leaderboard`
*   **Description:** Organization or Team ranking by recovery volume.
*   **Query Params:** `period` (DAILY, WEEKLY, MONTHLY), `teamId`.

### `GET /organizations/:orgId/performance/dashboard-summary`
*   **Description:** A comprehensive snapshot of roster health and productivity for managers.
