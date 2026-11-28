# Verichron Recover — Enterprise FinTech Reference Architecture

**A cloud-native, multi-tenant enterprise debt recovery SaaS architecture featuring proactive regulatory compliance gating, sub-5ms Redis CQRS consumer read models, and a dual-layer cryptographic & Vertex AI audit engine.**

> **Architectural Archive Notice**
>
> **Verichron Recover** was engineered by **Robert Torres** (Founder & Lead Systems Architect, [Verichron Inc.](https://verichroninc.com)) to near-release readiness before making the strategic decision **not to bring the platform to market**. Entering regulated B2B debt recovery carries ongoing compliance operations and enterprise sales cycles that would have competed directly with Verichron Inc.’s flagship commercial release: **[Verichron](https://verichroninc.com)**, an air-gapped iOS digital forensics workbench.
>
> Rather than leave a substantial distributed systems architecture unexamined in a private repository, this codebase and its design documentation are curated and published as an open **Architectural Reference Archive** (`VR-ARC-2026-01`).

---

## Executive Overview

The debt recovery industry largely operates on legacy monolithic software where statutory compliance (FDCPA, CFPB Regulation F, TCPA, FCRA, SOC 2, and GDPR) is treated as an after-the-fact reporting exercise rather than a runtime invariant.

**Verichron Recover** was architected from first principles as a **PNPM workspace monorepo** comprising **12 domain-isolated NestJS microservices**, **6 role-scoped React (Vite) micro-frontends**, and **13 shared workspace packages**. Each microservice enforces a strict Domain-Driven Design (DDD) bounded context with its own isolated PostgreSQL 16 database, communicating asynchronously via **Google Cloud Pub/Sub** event choreography and **HMAC-SHA256** signed internal orchestrators.

### Core Architectural Innovations

1. **The "Pure Debt" Ledger vs. Tactical Collector Workstation**:
   - Decouples immutable financial chain-of-title and 50-state Statute of Limitations calculations (`api-debts`, `api-transactions`) from high-frequency operational collector queues and dial attempts (`api-collectors`), eliminating PostgreSQL MVCC write-amplification on the core financial ledger.
2. **Tri-Tier Context Authorization & Sub-5ms Cross-Agency Consumer CQRS**:
   - Enforces strict SOC 2 CC6.1 logical isolation between collection agencies (`ORG_USER`) while enabling consumer debtors (`DEBTOR_USER`) to view and settle accounts across multiple agencies in a single unified portal (`ui-consumers`) under GDPR Article 15 & FCRA § 604.
   - Solves cross-service ownership queries without violating bounded contexts via an event-driven **Redis 7 CQRS Read Model** (`DebtIndexService`) that serves cross-agency debtor queries in **< 5ms**.
3. **"Block, Don't Flag" Proactive Regulatory Gatekeeper**:
   - Splits responsibility between *The Brain* (`api-organizations` policy configuration) and *The Bouncer* (`api-communications` zero-latency runtime enforcement).
   - Evaluates the **5 Iron Rules** (FDCPA 08:00–21:00 debtor local time window, CFPB Reg F 7-in-7 call frequency cap, Cease & Desist, channel consent, and state-level overrides) before dispatch, exposing `POST /compliance/check` to physically disable workstation UI controls before a statutory violation can occur.
4. **Dual-Layer Vertical AI Cryptographic Audit Engine (`api-audits`)**:
   - **Layer 1 (Deterministic Evidence)**: Monthly range-partitioned PostgreSQL tables embedding self-contained `actor_snapshot` JSONB (*"The Ghost User Fix"*), minimal `{ old, new }` delta `changes` (*"The Storage Bloat Fix"*), and SHA-256 `prev_hash` cryptographic chaining. Partitions automatically offload after 90 days to **GCS Parquet** and **BigQuery External Tables** for 7-year court-admissible retention without transactional RAM bloat.
   - **Layer 2 (Agentic Intelligence)**: Nightly BigQuery pre-aggregation paired with **Vertex AI (Gemini Flash)** anomaly analysis to surface after-hours access patterns and compliance drift in the Manager's Morning Brief.
5. **Global/Local Creditor Master & Vertex AI Entity Resolution**:
   - Dual-entity master data governance (`GlobalCreditor` platform Gold List + tenant-scoped `Creditor` + `CreditorConflict` queue) using `VertexAiEntityMatcherService` with deterministic Levenshtein fallback.

---

## System Topology

### 1. Backend Microservices (`apps/api-*`)

Each microservice owns an isolated database schema and generates an OpenAPI specification (`generate-openapi.ts`) consumed by **Orval** to produce type-safe frontend clients.

| Service | Bounded Context | Persistence Tier | Primary Responsibility & Documentation |
| :--- | :--- | :--- | :--- |
| **`api-users`** | Identity & Access (IAM) | PostgreSQL (`users_db`) | Tri-tier identities (`PLATFORM_USER`, `ORG_USER`, `DEBTOR_USER`), MFA, sessions, and RBAC ([README](apps/api-users/README.md)) |
| **`api-organizations`** | Tenant & Policy Brain | PostgreSQL (`organizations_db`) + Redis | Tenant lifecycle, hierarchical corporate teams, dynamic JSONB compliance policy, and Socket.IO Redis bridge ([README](apps/api-organizations/README.md)) |
| **`api-debts`** | Financial Ledger | PostgreSQL (`debts_db`) + Redis CQRS | "Pure Debt" ledger, portfolio imports, 50-state SOL calculator, Global/Local Creditor Master & Vertex AI matching ([README](apps/api-debts/README.md)) |
| **`api-debtors`** | Consumer PII Vault | PostgreSQL (`debtors_db`) | Consumer identity, PII isolation, skip-tracing choreography, consent preferences, and `debtorId → userId` linking ([README](apps/api-debtors/README.md)) |
| **`api-transactions`** | Money & Legal State | PostgreSQL (`transactions_db`) | Stripe payment processing, installment plans, multi-round `SettlementOffer` history, and Chapter 7/11/13 `BankruptcyFiling` automatic stays ([README](apps/api-transactions/README.md)) |
| **`api-collectors`** | Tactical Workstation | PostgreSQL (`collectors_db`) + Redis | "Operational Brain" managing prioritized work queues, Debtor-360 focus orchestration, skills, territories, and action logs ([README](apps/api-collectors/README.md)) |
| **`api-communications`** | Compliant Dispatch | PostgreSQL (`communications_db`) + MongoDB | Omni-channel dispatch (Email, SMS, Letter) and the "Block, Don't Flag" 5 Iron Rules compliance gatekeeper ([README](apps/api-communications/README.md)) |
| **`api-voice`** | Telephony Connector | PostgreSQL (`voice_db`) | Twilio WebRTC JWTs, click-to-call routing, dual-party call recording disclosures, and real-time DNC enforcement ([README](apps/api-voice/README.md)) |
| **`api-workflows`** | Declarative Rules | PostgreSQL (`workflows_db`) | Rules engine defining **WHAT** to automate and **WHEN** across dunning cadences and stage transitions ([README](apps/api-workflows/README.md)) |
| **`api-automations`** | Execution Engine | PostgreSQL (`automations_db`) | High-throughput worker engine handling **HOW** automated collector assignments and batch escalations execute ([README](apps/api-automations/README.md)) |
| **`api-analytics`** | BI & Read Orchestration | PostgreSQL (`analytics_db`) + Redis Cache | 15+ Pub/Sub scatter-gather event orchestrators computing recovery trends, geographic creditor/debtor flows, and leaderboards ([README](apps/api-analytics/README.md)) |
| **`api-audits`** | Cryptographic Auditing | Partitioned Postgres → GCS Parquet → BigQuery | Hash-chained immutable evidence logs, 90-day Parquet archival, Audit Request Center, and Vertex AI compliance briefs ([Proposal](docs/proposals/AUDITS-API-PROPOSAL.md)) |

### 2. Role-Scoped Micro-Frontends (`apps/ui-*`)

| Application | Target Persona | Architectural Role |
| :--- | :--- | :--- |
| **`ui-collectors`** | Collection Specialists | Keyboard-centric workstation with Debtor-360 focus view, WebRTC softphone, and 60s `useComplianceCheck` hardware-locking |
| **`ui-managers`** | Org Admins, Managers & Leads | Portfolio Inventory, Vertex AI Creditor Resolver ("Green Strip"), Compliance Hub, Roster hierarchy, and Audit Request Center |
| **`ui-consumers`** | Consumers / Debtors | Empathetic multi-agency self-service portal powered by sub-5ms Redis CQRS read projections |
| **`ui-ops`** | Platform Engineers | Multi-tenant control plane, Global Creditor Gold List curation, and audited cross-tenant diagnostics |
| **`ui-auth`** | All Personas | Centralized authentication, MFA, passwordless consumer links, and dual-role context switching |
| **`ui-marketing`** | Public / Prospective Tenants | Product overview and self-service tenant onboarding intake |

### 3. Shared Workspace Libraries (`packages/*`)

* **`@verichron/auth`**: Tri-tier JWT Guard chain and `@ActiveContext()` / `@OrganizationId()` extractors.
* **`@verichron/security`**: HMAC-SHA256 service-to-service request signing and replay protection for `/internal/*` routes.
* **`@verichron/events`**: Canonical TypeScript event payload interfaces enforced across publishers and subscribers.
* **`@verichron/event-orchestrator`**: Asynchronous Pub/Sub scatter-gather engine with correlation IDs and reply-to topics.
* **`@verichron/event-publisher` & `@verichron/event-subscriber`**: GCP Pub/Sub transport wrappers with `entity_id` ordering keys and idempotency.
* **`@verichron/api-client` & `@verichron/contracts`**: Shared DTO contracts and Orval-generated React Query SDKs.
* **`@verichron/error-handling`**: Deterministic domain exception hierarchy (`BaseException` with machine-readable error codes).

---

## Architectural Monograph & Deep-Dive Documentation

Start with the **[Project & Technical Overview](docs/PROJECT-OVERVIEW.md)** and **[API Design Principles](docs/DESIGN_PRINCIPLES.md)**, or explore specific architectural specifications:

* **Multi-Tenancy & CQRS**:
  * [Multi-Organization Debtor Access & Compliance Strategy (SOC 2, GDPR Art. 15, FCRA)](docs/MULTI-ORG-DEBTOR-COMPLIANCE-STRATEGY.md)
  * [Redis CQRS Read-Model Architecture (`< 5ms` Cross-Agency Queries)](docs/architecture/REDIS-READ-MODEL.md)
  * [Centralized Authentication & Tri-Tier JWT Architecture](docs/Centralized-Auth.md)
* **Proactive Compliance & Cryptographic Auditing**:
  * [Communication Compliance Strategy: "Block, Don't Flag" (The 5 Iron Rules)](docs/COMMUNICATION-COMPLIANCE-STRATEGY.md)
  * [Proposal: `api-audits` — The Dual-Layer Vertical AI Compliance Engine](docs/proposals/AUDITS-API-PROPOSAL.md)
  * [Platform Admin Audit Case Supplement](docs/proposals/PLATFORM-ADMIN-AUDIT-CASE-SUPPLEMENT.md)
* **Domain Modeling & AI Entity Resolution**:
  * [Debt Lifecycle Entity Architecture (SOL, Settlements, Bankruptcy Stays)](docs/architecture/DEBT-LIFECYCLE-ENTITIES.md)
  * [Vertex AI Creditor Master & Global/Local Entity Resolution Strategy](recent-docs/APPROVED-VERTEX-AI-IMPORT-STRATEGY.md)
  * [Collector Workstation Architecture](docs/architecture/COLLECTOR-WORKSTATION.md)
  * [Scatter-Gather Event Orchestration Audit](docs/architecture/EVENT-ORCHESTRATION.md)
  * [Redis Standardization Proposal (`packages/redis`)](docs/proposals/REDIS-STANDARDIZATION-PROPOSAL.md)

---

## Local Verification & Reference Setup

All infrastructure dependencies (PostgreSQL 16 with 12 isolated databases via `scripts/postgres-init.sh`, Redis 7, MongoDB 6, and the GCP Pub/Sub emulator) are containerized in `docker-compose.test.yml`.

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Build shared domain packages and inject dist/ artifacts
pnpm --filter "{packages/*}" build
pnpm --filter "{libs/*}" build
pnpm install

# 3. Start local infrastructure containers
docker compose -f docker-compose.test.yml up -d postgres-test redis-test mongo-test pubsub-emulator-test

# 4. Run unit test suites across services
pnpm test
```

---

## Author & License

* **Lead Systems Architect**: **Robert Torres** — Founder, [Verichron Inc.](https://verichroninc.com) ([GitHub `@lucidityflows`](https://github.com/lucidityflows) · [Repository `lucidityflows/verichron-recover`](https://github.com/lucidityflows/verichron-recover) · `robert.torres@verichroninc.com`)
* **License**: Copyright © Verichron Inc. All rights reserved. Published as a public architectural reference portfolio; see [LICENSE](LICENSE) for details.
