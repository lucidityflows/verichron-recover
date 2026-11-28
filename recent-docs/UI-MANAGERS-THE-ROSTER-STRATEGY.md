# The Roster - UI Strategy & Data Architecture

**Date:** January 9, 2026
**Domain:** Roster (Staff, Teams, Resource Optimization)
**App:** `ui-managers`
**Microservices:** `api-users` (Identity/Role), `api-organizations` (Teams/Membership)

---

## 1. Vision & Purpose
The **Roster Domain** is responsible for managing the human capital of an organization. This requires bridging two distinct microservice bounded contexts:
1.  **Identity & Authority (`api-users`):** Who the person is (Name, Email) and what they are allowed to do (Role).
2.  **Organization & Structure (`api-organizations`):** Where the person belongs (Teams) and what assets they work on (Portfolio assignments).

Our goal is to provide a seamless, real-time experience for managers to oversee staff and optimize team allocation without compromising system scalability or data integrity.

---

## 2. Core Strategy: Parallel Fetching & Browser-Side Joins

### 2.1 Why this approach?
Instead of creating a "Distributed Join" at the backend (which couples services) or duplicating user data into the organizations database (which leads to data drift), we use the **Browser as the Orchestrator**.

*   **Identity Source:** `api-users` remains the single source of truth for names, emails, and roles.
*   **Structure Source:** `api-organizations` remains the single source of truth for team memberships and assignments.
*   **The Join:** The UI fetches the paginated Staff List from `api-users` and a lightweight "Membership Map" from `api-organizations` in parallel.

### 2.2 Why this scales?
*   **Independent Scaling:** `api-users` can handle millions of users globally without knowing or caring about the team structures of individual tenants.
*   **Reduced Payload:** We avoid sending bulky, redundant profile data through the `api-organizations` service.
*   **Efficient Caching:** React Query handles the caching of the active staff list, while a lightweight Zustand store holds the organization's "Infrastructure Map" (The Team/Member lookup).

### 2.3 What we are avoiding:
*   **Data Duplication:** No syncing of `user.name` into the `teams` table.
*   **Backend Orchestration:** `api-organizations` will not call `api-users` to "enrich" its responses. This prevents circular dependencies and reduces latency.
*   **N+1 API Calls:** We never fetch user details one-by-one. We always fetch in bulk or use the pre-loaded "Membership Map."

---

## 3. Implementation Model

### 3.1 State Management Roles
*   **React Query (Server State):** Manages the paginated, searchable `StaffList`. Handles loading/error states and stale-while-revalidate logic.
*   **Zustand (Global Context):** Stores the `UserTeamLookupMap`. This is a simple `Map<userId, teamId>` fetched once per organization session. It allows any component (Staff row, Team card, or even Audit log) to instantly resolve a user's location.

### 3.2 Page Distinction (UX Mode)
*   **Staff Directory (Identity Mode):** Master list focused on user status, contact info, and system role. 
*   **Resource Optimizer (Allocation Mode):** Focuses on team capacity, drag-and-drop portfolio assignment, and balancing workload.

---

## 4. Phase Approach

### Phase 1: Foundations (Immediate)
*   **Routing:** Standardize on TanStack Router nested routes (`/roster/staff/$id`, `/roster/teams/$id`) to enable deep-linking and eliminate local state view-toggling.
*   **Enrichment:** Update `api-users` to include the primary **Role** in the `UserSummaryDto`.
*   **The Bridge:** Implement a lightweight `GET /memberships` endpoint in `api-organizations` to return the `userId` -> `teamId` mapping.

### Phase 2: Live Wiring (Next)
*   **UI Integration:** Update the "Team Assignment" column in the Staff Directory to use the Zustand lookup map instead of the "No Team" placeholder.
*   **Portfolio Visibility:** Wire the "Authorized Portfolios" list in Team Details to a real backend query.

### Phase 3: Analytics & Optimization (Discussion Required)
*   **Research:** Define the logic for "Utilization," "RPC Rate," and "Load" metrics.
*   **Implementation:** Replace mocked analytics cards with real data-driven visualizations.
