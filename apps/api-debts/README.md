# API-Debts Microservice

## Overview

The `api-debts` microservice is the central component for **Debt Management** within our debt collection SaaS platform. It meticulously manages individual debt accounts, debt portfolio grouping, portfolio-level user permissions, chain of title auditing, and the critical bulk import workflow for debt portfolio ingestion. It's designed for high performance and compliance in a multi-tenant environment.

### Bounded Context

**Clear Ownership**: The `api-debts` service is the single source of truth for:
- Individual debt account records and their financial details
- Debt portfolio grouping and hierarchy
- Portfolio-level user access control (Layer 2 authorization)
- Chain of title history (debt ownership audit trail)
- Bulk import orchestration for debt portfolio ingestion

**Database**: `debts_db` - Single database ownership, no cross-database joins

**Critical Boundaries**:
- **Does NOT own**: Debtor profile information (owned by `api-debtors`)
- **Does NOT own**: User identity or general RBAC (owned by `api-users`)
- **Does NOT own**: Organization profiles (owned by `api-organizations`)
- **Does NOT own**: Payment transactions (owned by `api-transactions`)

## Business Context

### Portfolio & Debt Lifecycle

The service manages the full lifecycle of both debt portfolios (Provisioning, Active, Closed, Sold) and individual debts (IMPORTED → ACTIVE → IN_COLLECTION → etc.). Each status change is carefully managed and communicated via events.

### Key Design Principles

-   **Tenant Isolation via Denormalization**: `organizationId` is stored on both Portfolio and Debt entities for performance and security.
-   **Portfolio-Level Permissions**: User access is granted at the portfolio level for scalability.
-   **Two-Layered Authorization**: Combines JWT permissions (Layer 1) with instance-level portfolio access checks (Layer 2).
-   **Event-Driven Debtor Integration**: Decouples import from debtor management by publishing `DebtorInformationReceived` events.
-   **Immutable Chain of Title**: The history module provides an append-only audit log of debt ownership for compliance.
-   **Asynchronous Bulk Imports**: Event-driven, queue-based workflow for large file uploads.
-   **CQRS with Redis Read Model**: Utilizes a Redis read model for high-performance DEBTOR user queries, ensuring <100ms response times.

---

## Technical Stack

-   **Framework**: NestJS
-   **ORM**: TypeORM
-   **Database**: PostgreSQL (`debts_db`) - Source of truth for debts, portfolios, history
-   **Cache/Read Model**: Redis - High-performance debtor query indexes (CQRS pattern)
-   **File Storage**: Local filesystem (MVP) → Google Cloud Storage (future)
-   **File Parsing**: Google Cloud Document AI Form Parser (production) or Mock fixtures (local development)
-   **Event Queue**: GCP Pub/Sub for event-driven architecture
-   **Import Processing**: Async background processing within NestJS app
-   **Deployment**: GCP (Cloud Run or GKE)

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm --filter @verichron/api-debts dev

# Run tests
pnpm --filter @verichron/api-debts test

# Build for production
pnpm --filter @verichron/api-debts build
```

---

## Documentation

This service's documentation is broken into two main categories: high-level principles and detailed feature-module breakdowns.

### 1. Core Principles & Conventions

For an overview of the architectural patterns, coding standards, and core concepts that apply across this entire microservice, please see the principles guide:

-   **[Core Design Principles & Conventions](./docs/DESIGN_PRINCIPLES.md)**

### 2. Feature Modules

For detailed information on specific features, including their owned entities, API endpoints, and business logic, refer to the `README.md` file within each module's `src` directory.

| Module | Description | Documentation |
| :--- | :--- | :--- |
| **`core`** | Provides foundational building blocks for security, context, and request lifecycle management. | [CORE-README.md](./src/core/CORE-README.md) |
| **`debts`** | The core module for managing individual debt accounts, their lifecycle, and the CQRS read model. | [DEBTS-README.md](./src/debts/DEBTS-README.md) |
| **`portfolios`** | Manages debt portfolios and the critical Layer 2 authorization for user access. | [PORTFOLIOS-README.md](./src/portfolios/PORTFOLIOS-README.md) |
| **`imports`** | Handles the entire asynchronous bulk import workflow for ingesting new portfolios from files. | [IMPORTS-README.md](./src/imports/IMPORTS-README.md) |
| **`history`** | Manages the immutable chain of title (ownership history) for each debt, ensuring legal compliance. | [HISTORY-README.md](./src/history/HISTORY-README.md) |
| **`events`** | Configures the event-driven architecture and defines all event DTOs for the service. | [EVENTS-README.md](./src/events/EVENTS-README.md) |
| **`redis`** | A core infrastructure module that provides the global Redis client connection. | [REDIS-README.md](./src/redis/REDIS-README.md) |
| **`internal`** | Contains internal-only endpoints for aggregating analytics data for other backend services. | [INTERNAL-README.md](./src/internal/INTERNAL-README.md) |

---
