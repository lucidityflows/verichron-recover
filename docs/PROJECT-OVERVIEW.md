# Verichron Recover: Technical & Product Architecture Overview

> **Note:** Verichron Recover was engineered to near-release readiness before Verichron Inc. made the strategic decision not to enter the debt collection SaaS market in order to focus exclusively on **[Verichron](https://verichroninc.com)** (our air-gapped iOS digital forensics workbench). This document serves as the high-level architectural map of the platform.

## 1. Architectural Vision

**Verichron Recover** is a multi-tenant enterprise SaaS platform designed to modernize regulated debt recovery through three engineering invariants:
* **Operational Efficiency:** High-speed, keyboard-centric workflows for collection specialists backed by CQRS read models.
* **Proactive Runtime Compliance ("Block, Don't Flag"):** Real-time enforcement of FDCPA, CFPB Regulation F, TCPA, and bankruptcy stay rules at the API and UI boundary before a violation can occur.
* **Cross-Agency Consumer Transparency:** An empathetic self-service consumer portal (`ui-consumers`) that aggregates a debtor's accounts across multiple agencies in `< 5ms` under GDPR Article 15 and FCRA § 604 while preserving strict SOC 2 CC6.1 isolation between agencies.

---

## 2. The Monorepo Ecosystem

The platform is structured as a **PNPM Workspace Monorepo**, ensuring end-to-end TypeScript contract safety from PostgreSQL entities and GCP Pub/Sub payloads to Orval-generated React Query hooks.

### Directory Structure
* **`apps/api-*`**: 12 independent NestJS microservices, each owning an isolated database schema.
* **`apps/ui-*`**: 6 role-scoped React (Vite) micro-frontends.
* **`packages/`**: 13 shared domain and infrastructure packages (`@verichron/auth`, `@verichron/security`, `@verichron/events`, `@verichron/event-orchestrator`, `@verichron/contracts`, etc.).

---

## 3. High-Level Architecture Strategy

### Bounded Contexts (12 Core Microservices)
We adhere to strict Domain-Driven Design (DDD). Each microservice owns its own database and communicates via asynchronous events (GCP Pub/Sub) or internal HMAC-SHA256 protected REST calls (`/internal/*`) for scatter-gather orchestration.

#### Core Identity & Financial Ledger Services
1. **`api-users`**: IAM Source of Truth. Manages multi-context identities (`PLATFORM_USER`, `ORG_USER`, `DEBTOR_USER`), authentication, and RBAC.
2. **`api-organizations`**: Tenant & Policy Brain. Handles onboarding, hierarchical team structures, tenant-specific JSONB compliance policies, and the centralized Socket.IO Redis notification bridge.
3. **`api-debts`**: Financial Ledger. Owns the "Pure Debt" model, portfolios, chain of title, 50-state Statute of Limitations calculator, Global/Local Creditor Master, and the Redis CQRS consumer read model.
4. **`api-debtors`**: Consumer PII Vault. Manages debtor identities, regulated PII, contact preferences, skip-tracing workflows, and the `debtorId → userId` link.
5. **`api-transactions`**: Money Movement & Legal Agreements. Handles payment plans, Stripe gateway integration, multi-round `SettlementOffer` negotiations, and Chapter 7/11/13 `BankruptcyFiling` automatic stays.

#### Collector Productivity & Omni-Channel Workstation
6. **`api-collectors`**: The Operational Brain. Manages prioritized work queues, Debtor-360 focus aggregation, action logging, skills, territories, and performance tracking.
7. **`api-voice`**: Telephony Connector. Manages Click-to-Call, Twilio WebRTC JWTs, call recording disclosures, and real-time DNC enforcement.
8. **`api-communications`**: Omni-Channel Dispatch & Compliance Bouncer. Manages email/SMS/letter templates and enforces the 5 Iron Rules pre-flight compliance gatekeeper (`POST /compliance/check`).

#### Automation, BI & Cryptographic Auditing
9. **`api-workflows`**: Declarative Rules Engine. Defines **WHAT** to automate and **WHEN** across the recovery lifecycle.
10. **`api-automations`**: Execution Engine. Handles **HOW** to execute heavy background logic (territory load-balanced account assignments and escalations).
11. **`api-analytics`**: Business Intelligence & Scatter-Gather Orchestrator. Aggregates cross-service metrics for recovery trends, geographic creditor/debtor flows, and team leaderboards.
12. **`api-audits`**: Dual-Layer Vertical AI Compliance Engine. Combines SHA-256 hash-chained partitioned PostgreSQL evidence logs (offloaded after 90 days to GCS Parquet / BigQuery for 7-year retention) with nightly Vertex AI (Gemini Flash) anomaly briefs.

---

## 4. User Types & Personas

| Persona | JWT Context Tier | Primary Goal |
| :--- | :--- | :--- |
| **Platform Admin** | `PLATFORM_USER` | Monitor system health, provision organizations, curate Global Creditor Gold List (with mandatory audit context). |
| **Org Admin** | `ORG_USER` | Configure agency settings, stricter-than-legal compliance rules, and organizational hierarchy. |
| **Org Manager** | `ORG_USER` | Strategic oversight, portfolio segmentation, Vertex AI creditor conflict resolution, and audit discovery. |
| **Team Lead** | `ORG_USER` | Daily team leadership, escalation handling, and real-time coaching. |
| **Collector** | `ORG_USER` | High-speed, compliant debtor engagement and payment resolution. |
| **Consumer Debtor** | `DEBTOR_USER` | Unified cross-agency self-service debt resolution, settlement negotiation, and consent management. |

---

## 5. Micro-Frontend (MFE) Mapping

| Micro-Frontend | User(s) | Primary Features |
| :--- | :--- | :--- |
| **`ui-collectors`** | Collectors | High-speed Collector Workstation, Debtor-360 view, and real-time compliance hardware locking. |
| **`ui-managers`** | Org Admins, Managers, Leads | Portfolio Inventory, Creditor Resolver, Compliance Hub, Team Roster, and Audit Request Center. |
| **`ui-consumers`** | Consumer Debtors | Mobile-first multi-agency portal for payments, settlements, disputes, and communication preferences. |
| **`ui-ops`** | Platform Admins | SaaS control plane, tenant provisioning monitor, and Global Creditor Gold List stewardship. |
| **`ui-auth`** | All Personas | Shared identity provider for login, MFA, and context switching. |
| **`ui-marketing`** | Public | Product showcase and automated tenant trial onboarding intake. |

---

## 6. Technical Stack Summary
* **Backend:** NestJS (Node.js / TypeScript), PostgreSQL 16 (12 isolated schemas + partitioned audit logs), MongoDB 6 (high-volume communication logs), Redis 7 (CQRS read models, BI cache, and WebSocket pub/sub adapter).
* **Frontend:** React 18, Vite, TypeScript, TanStack (Query / Router), Orval (OpenAPI client generation), Tailwind CSS v4.
* **Cloud & AI Infrastructure:** Google Cloud Platform (Pub/Sub, Cloud Run, Cloud SQL, Cloud Storage Parquet, BigQuery External Tables, Document AI, and Vertex AI Gemini Flash).
