# Collector Workstation Architecture

## Overview
The `api-collectors` microservice serves as the "Operational Brain" of the platform. It manages the collector experience, productivity, and performance metrics without owning the source-of-truth for debts or debtors.

---

## Feature Organization
The microservice is organized into deliberate functional features:

### 1. Workstation (`src/workstation`)
Handles the "Debtor 360" focus view and logging actions.
*   **Responsibilities:** Aggregating debtor data from multiple services, logging notes, calls, and follow-ups.
*   **Endpoint:** `/organizations/:organizationId/workstation`

### 2. Profiles (`src/profiles`)
Manages collector-specific attributes.
*   **Responsibilities:** Skills, territories, availability status, and capacity management.
*   **Endpoint:** `/organizations/:organizationId/profiles`

### 3. Performance (`src/performance`)
Aggregates and calculates productivity metrics.
*   **Responsibilities:** Leaderboards, today/week stats, and response tracking.
*   **Endpoint:** `/organizations/:organizationId/performance`

### 4. Work Queue (`src/work-queue`)
Manages the prioritized list of items for a collector.
*   **Responsibilities:** Smart prioritization logic, bulk actions, and queue status tracking.
*   **Endpoint:** `/organizations/:organizationId/work-queue`

---

## Core Technical Patterns

### Internal API Pattern
All inter-service communication follows the `/internal` prefix pattern.
*   **Location:** `src/internal`
*   **Usage:** Used by the `event-orchestrator` to fetch collector names, skills, or team memberships for aggregated analytics.

### Tenant Isolation
Isolation is enforced at the route level using the `:organizationId` prefix. Every request is validated against the user's JWT context to ensure they belong to the specified organization.

### Orchestration
The Workstation often acts as a consumer of the `event-orchestrator`. For the "Debtor Focus" view, it orchestrates parallel calls to:
*   `api-debtors` (Profile & Contact)
*   `api-debts` (Debt Portfolio)
*   `api-transactions` (Payment History & Plans)
*   `api-communications` (Timeline Events)

---

## Related Features

*   **Goals (`src/goals`):** Real-time tracking of performance against organizational targets.
*   **Notifications (`src/notifications`):** Internal alerts for collectors regarding work queue updates or follow-ups.
*   **Time Tracking (`src/time-tracking`):** Utilization reporting and session management.
