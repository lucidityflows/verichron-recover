# Collector Assignment Implementation Strategy

## Overview
This document outlines the architectural shift from a rigid "Debt-Collector" assignment model to a scalable, hierarchical "Portfolio-Team-Debtor" model. Following our **"Do it Right"** and **"Pure Debt"** philosophies, this strategy ensures that financial records remain immutable while human assignment logic stays flexible, tactical, and real-time.

---

## 1. Architectural Vision: The Assignment Hierarchy

To ensure efficiency and scalability, assignments are handled across four distinct layers:

| Layer | Responsibility | Entity / Service | Persistence |
| :--- | :--- | :--- | :--- |
| **Strategic** | **Who *can* work a portfolio?** | `PortfolioTeamBridge` / `api-organizations` | PostgreSQL + Redis (Read Model) |
| **Policy** | **How *should* we distribute?** | `AutoAssignmentConfig` / `api-workflows` | PostgreSQL (Rules) |
| **Tactical** | **Who is *actually* working now?** | `AssignmentRegistry` / `api-collectors` | Redis (Hot Path) |
| **Execution** | **Picking the best collector** | `AssignmentExecutor` / `api-automations` | Stateless (Event Driven) |
| **Relationship**| **Who *owns* this debtor?** | `DebtorProfile` / `api-debtors` | PostgreSQL (Sticky Owner) |

### Key Principle: Pure Debt Model
The `Debt` entity in `api-debts` remains a **pure financial instrument**. It contains no collector assignment columns. This prevents "event avalanches" when staff changes (sick leave, attrition) occur. 

---

## 2. Redis: The Tactical Registry

The `api-collectors` service provides the real-time "heartbeat" of the workstation via Redis.

### Registry Pattern:
- `portfolio:{id}:authorized_teams` -> (Set) List of Team IDs allowed to work this portfolio.
- `user:{id}:active_assignments` -> (Set) List of Debtor IDs currently assigned to this collector.
- `debtor:{id}:sticky_collector` -> (String) The primary collector ID for this debtor (from Relationship Tier).

---

## 3. Implementation Roadmap

### Phase 1: Foundation (Infrastructure) - ✅ COMPLETED
Establish the core entities and connectivity.
- [x] **api-organizations**: Create `PortfolioTeamAssignment` bridge entity.
- [x] **api-collectors**: Implement `RedisModule` and global `REDIS_CLIENT`.
- [x] **api-debts**: Fix `Debt <-> Portfolio` relation metadata.
- [x] **api-debts**: Remove impure `getPortfolioDistribution` query logic.
- [x] **api-debtors**: Add `primary_collector_id` to `DebtorProfile`.

### Phase 2: The Logic Bridge (Active Work) - ✅ COMPLETED
Wire the services to respect the new hierarchy.
- [x] **api-organizations**: Finalize `TeamsController` for bridge management.
- [x] **api-collectors**: Implement `AssignmentRegistryService` to manage Redis sets.
- [x] **api-debtors**: Implement `StickyAssignmentListener` to update profile owner on engagement.

### Phase 3: Smart Execution - ✅ COMPLETED
Update the automation engine to use the hierarchical data.
- [x] **api-automations**: Refactor `AutoAssignmentExecutor` to:
    1. Check `api-debtors` for Sticky Owner.
    2. Query `api-collectors` Redis for "Authorized & Available" pool.
    3. Execute strategy (`ROUND_ROBIN`, etc.) against the pool.

### Phase 4: UI & Analytics (Planned)
- [ ] **Manager Dashboard**: Implement multi-service "Portfolio Distribution" view via Event Orchestrator. (Backend Logic ✅)
- [ ] **Admin UI**: Add Portfolio-Team assignment interface.

---

## 4. Operational Benefits

*   **Zero Write-Amplification**: Reassigning a team is a **1-row update** in the Bridge table, not a 50,000-row update to Debts.
*   **Relationship Integrity**: The "Sticky" model ensures debtors always talk to the same collector, increasing recovery rates.
*   **Enterprise Scaling**: Multiple teams can be assigned to massive portfolios simultaneously.

---

## 5. Progress Checklist

### api-organizations
- [x] Create `PortfolioTeamAssignment` entity.
- [x] Expose `POST /portfolios/:portfolioId/assign/:teamId` in `TeamsController`.
- [x] Expose `GET /portfolios/:portfolioId` in `TeamsController`.

### api-collectors
- [x] Add `ioredis` dependency.
- [x] Initialize `RedisModule` in `AppModule`.
- [x] Build `AssignmentRegistryService` (Redis SMEMBERS/SADD logic).
- [x] Synchronize manual assignments/completions with Redis in `WorkQueueService`.
- [x] Synchronize automated assignments with Redis in `WorkQueueItemAssignedFromAutomationsListener`.

### api-debts
- [x] Fix the `Debt` entity relations (Portfolio link).
- [x] Remove impure collector-centric queries.
- [x] Implement pure `debtor-portfolios` endpoint for cross-service aggregation.
- [ ] Create migration for Relation Metadata.

### api-debtors
- [x] Add `primary_collector_id` to `DebtorProfile`.
- [x] Build listener for `COLLECTORS_DEBTOR_ACTION_LOGGED` to trigger sticky update.

### event-orchestrator
- [x] Refactor `TeamOverviewOrchestrator` to aggregate Portfolio distribution in-memory (Pure Model).
- [x] Fix TS1272 build errors in all orchestrators.
