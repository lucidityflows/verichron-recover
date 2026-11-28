# API-Organizations Microservice

## Overview

The `api-organizations` microservice is the single source of truth for **Organization/Tenant** management within our debt collection SaaS platform. This service manages organization identity, contact information, tenant-specific settings, the onboarding lifecycle, and high-level business intelligence aggregation.

### What This Service Does (Core Features)

*   **Organization Identity Management**: Provides full CRUD (Create, Read, Update, Delete) operations for managing organization profiles, including basic identity details and display names.
*   **Contact Information Management**: Manages comprehensive contact details—addresses, emails, and phone numbers—associated with each organization.
*   **Organization Hierarchy**: Supports the definition and management of parent-child relationships between organizations, allowing for complex corporate structures (e.g., a parent collection agency with multiple subsidiaries).
*   **Tenant Configuration**: Stores and manages organization-specific settings and preferences using a flexible JSONB field, allowing for extensive customization per tenant.
*   **Onboarding Orchestration**: Orchestrates the event-driven provisioning of new tenant organizations onto the platform, ensuring a decoupled and resilient onboarding workflow. This includes initiating the creation of the initial organization administrator user.
*   **Business Intelligence Aggregation**: Aggregates high-level business intelligence metrics for dashboard summaries, acting as an event orchestrator to gather data from various microservices. This provides real-time insights into organization performance.
*   **Multi-Tenancy Support**: Fully supports the platform's multi-tenancy model, ensuring data isolation and context management via the `x-org-id` header and internal authorization mechanisms.
*   **Role-Based Access Control (RBAC)**: Supports comprehensive RBAC, defining various organization roles (e.g., Admin, Manager, Agent) and platform roles (e.g., Platform Admin, Platform Support) that govern access within the microservice.

### What This Service Does NOT Do (Critical Boundaries)

To maintain clear bounded contexts and prevent circular dependencies, `api-organizations` strictly adheres to the following boundaries:

*   **Does NOT own User Management**: User identities, authentication, sessions, and core RBAC definitions are exclusively owned and managed by `api-users`.
*   **Does NOT own Portfolio/Debt Management**: Debt records, their lifecycle, and portfolio groupings are owned by `api-debts`.
*   **Does NOT own Financial Transactions**: Payments, accounting, and detailed financial transaction processing are owned by `api-transactions`.
*   **Does NOT make Direct HTTP Calls**: All inter-service communication is asynchronous and event-driven, ensuring high decoupling and resilience.

## Role in the Monorepo

`api-organizations` is a core service within the Verichron monorepo. It acts as a central **provider of organization context** to other services. For example, `api-users` consumes `OrganizationCreated` events from `api-organizations` to provision initial admin users, and updates user denormalized data based on `OrganizationNameChanged` events.

## SaaS Ecosystem Interactions

`api-organizations` is a pivotal service, interacting with various other microservices to support the platform's core functions:

*   **`api-users`**:
    *   **Upstream**: Publishes `OrganizationCreated`, `OrganizationUpdated`, `OrganizationNameChanged`, `OrganizationStatusChanged` events, which `api-users` consumes to provision users, update denormalized data, or manage user statuses.
    *   **Downstream**: `api-organizations` relies on `api-users` for user authentication and authorization checks (via JWTs and guards).
*   **`api-debts`**:
    *   **Upstream**: Publishes `OrganizationStatusChanged` events, which `api-debts` might consume to suspend portfolio operations for a suspended organization.
    *   **Downstream**: `api-organizations` aggregates data from `api-debts` via request-response events for dashboard metrics.
*   **`api-communications`**:
    *   **Upstream**: Publishes various organization-related events (`OrganizationCreated`, `OrganizationStatusChanged`) that `api-communications` consumes to trigger welcome emails, manage communication campaigns, or halt communications.
    *   **Downstream**: `api-organizations` might request aggregated communication metrics from `api-communications` for analytics.
*   **Analytics Module (Internal Orchestration)**: Internally, the analytics module within `api-organizations` acts as an event orchestrator. It publishes request events (e.g., `AnalyticsDashboardSummaryRequested`) and subscribes to response events (e.g., `AnalyticsDashboardSummaryCompleted` from `api-debts`, `api-transactions`, etc.) to build dashboard summaries.

## Conclusion

The `api-organizations` microservice is essential for the multi-tenant architecture of the Verichron platform. Its robust feature set and clear boundaries enable scalable, secure, and compliant management of client organizations, forming a critical backbone for the entire SaaS ecosystem.

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- pnpm 9+
- GCP Pub/Sub emulator (for local dev)

### Installation

```bash
# Clone repo
git clone <repo-url>
cd verichron/apps/api-organizations

# Install dependencies
pnpm install

# Set up environment
cp ../../.env.example ../../.env.dev
# Edit .env.dev with your configuration
```

### Environment Variables

**Required**:
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/organizations_db

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=20m

# GCP Pub/Sub
PUBSUB_PROJECT_ID=local-dev
PUBSUB_EMULATOR_HOST=localhost:8085

# Node
NODE_ENV=development
```

### Database Setup

```bash
# Start PostgreSQL (if using Docker)
docker-compose up -d postgres

# Create database
createdb organizations_db

# Run migrations
pnpm migration:run
```

### Start GCP Pub/Sub Emulator

```bash
# Install emulator (one-time)
gcloud components install pubsub-emulator

# Start emulator
gcloud beta emulators pubsub start --host-port=localhost:8085
```

### Run Development Server

```bash
# Start with hot reload
pnpm start:dev

# Server runs on http://localhost:3000
# Swagger docs at http://localhost:3000/api
```

### Verify Setup

```bash
# Health check
curl http://localhost:3000/health

# Swagger UI
open http://localhost:3000/api
```

---

## Further Documentation

For a comprehensive understanding of this microservice, its architecture, and developer patterns, please refer to the following documents:

*   **High-Level Overviews**:
    *   [Feature Overview and System Context](docs/feature-overview.md)
    *   [Architectural Overview](docs/architecture/overview.md)

*   **Developer Guide**:
    *   [Guards Strategy](docs/developer-guide/guards.md)
    *   [Custom Decorators](docs/developer-guide/decorators.md)
    *   [Testing Philosophy](docs/testing-philosophy.md)
    *   [Error Codes Reference](docs/developer-guide/error-codes.md)

*   **Authorization & RBAC**:
    *   [Role-Based Access Control (RBAC) Guide](docs/rbac.md)

*   **Platform-Wide Architecture**:
    *   [Auth Architecture Documentation](../../docs/architecture/auth/README.md)
    *   [Onboarding Protocols Documentation](../../docs/architecture/onboarding.md)
    *   [E2E Testing Documentation](../../docs/testing/README.md)