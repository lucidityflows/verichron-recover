# API Collectors (Collector Workstation & Work Queue)

## 📖 Overview

The **api-collectors** microservice is the **collector workstation and work queue management** service for the debt collection platform. It provides collectors with a unified interface to manage their daily work, track debtor interactions, and monitor performance metrics.

Unlike other services that manage domain entities (debts, debtors, transactions), api-collectors manages the **collector's view of work** - providing a prioritized queue, tracking collector actions, and measuring performance.

**Key Architecture Principle:**
- **api-collectors** = Collector Workspace (work queue, action logging, performance tracking)
- **api-automations** = Assignment Engine (executes auto-assignment strategies)
- **api-workflows** = Rules Engine (defines automation rules and triggers)

api-collectors provides both the operational interface for collectors and the analytics foundation for measuring collector performance.

---

## 🎯 Bounded Context Responsibilities

### Work Queue Management
- Maintaining a denormalized read model of collector work items.
- Prioritizing work items based on balance, age, contact history, and urgency.
- Filtering and sorting work queue by collector assignments.
- Tracking work item status (NEW, IN_PROGRESS, FOLLOW_UP_SCHEDULED, COMPLETED).

### Collector Workstation
- Providing a comprehensive 360-degree debtor focus view via orchestration.
- Logging all collector actions (calls, emails, SMS, notes, payments).
- Publishing contact attempt events for cross-service coordination.
- Building a chronological timeline of collector-debtor interactions.

### Performance Analytics (CQRS Pattern)
- Tracking assignment-to-resolution lifecycle via `CollectorResponseTracking`.
- Calculating collector performance metrics (recovery rate, avg time to contact).
- Measuring assignment strategy effectiveness.
- Providing real-time leaderboard and historical performance data.

### Collector Profile Management
- Storing collector metadata (skills, territories, specializations).
- Supporting skill-based and geographic auto-assignment.
- Managing collector availability status and capacity limits.

---

## 🏗 Architecture & Modules

The microservice is organized into deliberate, feature-based modules to ensure high cohesion and standardized routing.

```
apps/api-collectors/
├── src/
│   ├── workstation/             # Debtor 360 focus & action logging
│   │   ├── workstation.controller.ts
│   │   ├── workstation.service.ts
│   │   └── entities/            # CollectorAction entity
│   │
│   ├── profiles/                # Skills, territories, and availability
│   │   ├── collector-profile.controller.ts
│   │   ├── collector-profile.service.ts
│   │   └── entities/            # CollectorProfile entity
│   │
│   ├── performance/             # Leaderboards & analytics (CQRS Read Model)
│   │   ├── performance.controller.ts
│   │   ├── performance.service.ts
│   │   ├── collector-response-tracking.service.ts
│   │   ├── entities/            # CollectorResponseTracking entity
│   │   └── listeners/           # Response tracking event listeners
│   │
│   ├── notes/                   # Enhanced rich-text notes & coaching
│   │   ├── collector-note.controller.ts
│   │   ├── collector-note.service.ts
│   │   └── entities/            # CollectorNote entity
│   │
│   ├── time-tracking/           # Utilization & work session tracking
│   │   ├── time-tracking.controller.ts
│   │   ├── time-tracking.service.ts
│   │   └── entities/            # TimeTrackingSession entity
│   │
│   ├── work-queue/              # operational queue & prioritization
│   │   ├── entities/            # WorkQueueItem entity
│   │   ├── services/            # Prioritization algorithm
│   │   └── listeners/           # Queue update listeners
│   │
│   ├── internal/                # Orchestrator-facing endpoints
│   │   └── collector-internal.controller.ts (prefix: internal/collectors)
│   │
│   └── core/                    # Shared guards, decorators, and context
```

---

## 📦 Module Breakdown

### 1. Workstation Module
Standardizes the collector's primary work environment. Uses event orchestration to aggregate debtor data from `api-debtors`, `api-debts`, and `api-transactions` into a single "Focus" view.

### 2. Collector Profile Module
Manages the "Roster" of collectors. It stores skills (e.g., MULTILINGUAL) and territories (States/Zipcodes) used by `api-automations` to intelligently route accounts. It also handles availability status (AVAILABLE, ON_BREAK, etc.).

### 3. Performance Module (CQRS Read Model)
A specialized analytics module that implements the **Read Model** of our CQRS pattern. It listens to assignment, contact, and resolution events to build a high-performance historical record of collector effectiveness without impacting operational tables.

### 4. Notes & Time Tracking Modules
Specialized features for rich-text documentation and precise utilization tracking. These modules track exactly how long is spent on each debtor account to calculate true "Average Handle Time".

---

## 🔌 API Standard Routing

All external-facing controllers follow the organization-scoped tenant isolation pattern:
`organizations/:organizationId/[feature]`

### Primary Endpoints

| Feature | Base Path | Description |
| :--- | :--- | :--- |
| **Workstation** | `/organizations/:orgId/workstation` | Focus view & action logging |
| **Profiles** | `/organizations/:orgId/profiles` | Skills, territories, capacity |
| **Performance** | `/organizations/:orgId/performance` | Stats, Leaderboards, Metrics |
| **Notes** | `/organizations/:orgId/notes` | Rich-text coaching & debtor notes |
| **Time Tracking**| `/organizations/:orgId/time-tracking`| Session & utilization management |
| **Work Queue** | `/organizations/:orgId/work-queues` | Operational item management |

### Internal Endpoints (Orchestration)
Internal endpoints used by the Verichron Orchestrator use the `internal/` prefix:
- `POST /internal/collectors/workload`
- `POST /internal/collectors/skills`
- `POST /internal/work-queues/unassigned`

---

## 📡 Event Integration

### Consumed Events (Sample)
- `debts.debt.created` → Creates operational WorkQueueItem.
- `transactions.payment.received` → Reduces balance, potentially completes item.
- `communications.email_reply.received` → Records first response in Performance module.
- `collectors.work_queue_item.assigned` → Triggers tracking lifecycle & notifications.

### Published Events
- `collectors.debtor.contact_attempted` → Notifies other services of collector activity.
- `collectors.work_queue_item.completed` → Signals workflow engines to stop automations.

---

## 🎯 CQRS Pattern: CollectorResponseTracking

The microservice strictly separates **Operational State** (WorkQueueItem) from **Analytical History** (CollectorResponseTracking). 

1. **Write Model**: Assignment changes or contact attempts update the `WorkQueueItem` for immediate UI visibility.
2. **Read Model**: These same events trigger the `Performance` module to update `CollectorResponseTracking`, allowing managers to query complex metrics like "Recovery Rate per Skill Tag" without slowing down the collector's queue.

---

## 🛠 Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL (Feature-specific tables)
- **Event Bus**: GCP Pub/Sub
- **Orchestration**: EventOrchestratorClient (Cross-service request-response)
- **Validation**: Class-validator with strictly typed DTOs implementing official payloads.

---

**Last Updated**: 2025-12-20
**Status**: Alpha (Refactored for Feature Consistency)