# UI-Ops Redesign: Utility & Management Hub

## Overview

The `ui-ops` application (formerly `ui-platform`) is pivoting to a "Utility Ops" focus. It serves **exclusively as an internal tool for Platform Admins** to manage the SaaS platform. It is NOT a tenant-facing feature.

The core philosophy is to leverage our own microservices to manage our business operations (dogfooding), while providing a "Super Admin" view for troubleshooting and white-glove customer support.

## 1. Navigation Structure ✅

The sidebar navigation reflects platform-level priorities:

- **Dashboard**: High-level platform health and business metrics.
- **Organizations**: Manage tenant lifecycles (Onboarding, Troubleshooting, Auditing).
- **Communications**: The platform's **Dispatch Center**. (Functional)
- **Creditors**: Master Data Management for the global matching engine. (In Progress)
- **QA Sandbox**: Internal sandbox for safe testing of system integrations. (Implemented)
- **System**: Detailed deep-dives into microservice health and global audit logs. (Implemented)

## 2. Feature Specifications

### A. Communications Hub / Dispatch Center (Priority #1) ✅
- **Status**: Implemented.
- **Features**:
  - **Global Logs**: Troubleshooting view. See all dispatches system-wide.
  - **Platform Templates**: Manage our own outreach templates (scoping to `SYSTEM` organization).
  - **New Template**: Functional creation flow for platform-to-client templates.
  - **Compose**: (Placeholder) Ready for manual outreach implementation.

### B. Organizations Hub (Priority #2) ✅
- **Status**: Implemented.
- **Detail View**: Functional route-based navigation (`/organizations/$id`) with tabs:
  - **Overview**: Key metrics and quick stats (wired to live portfolio counts).
  - **Audits**: Full org-specific audit trail (fixed platform-admin permissions).
  - **Imports**: Direct view of portfolio ingestion status via `VirtualTable`.
  - **Integrations**: Raw JSONB settings viewer.
  - **Actions**: Functional Suspend/Activate organization toggles.

### C. Master Creditor MDM (Priority #3) 🚧
- **Status**: Foundation Implemented / Testing.
- **Goal**: Maintain the "Master List" of creditors.
- **Current State**:
  - **Backend**: `PlatformCreditorsController` created in `api-debts`. Currently blocked by a UUID format mismatch when using "SYSTEM" as an ID.
  - **Frontend**: `CreditorsPage.tsx` implemented using `VirtualTable` with support for legal names, EINs, and industry categories.

### D. System Health & Audits ✅
- **Status**: Implemented.
- **Microservices**: Monitoring all 10 platform APIs (Users, Orgs, Debts, Debtors, Transactions, Comms, Collectors, Voice, Workflows, Automations).
- **Infrastructure**: Live monitoring of PostgreSQL, Redis, GCP Pub/Sub Emulator, and MongoDB (via `api-automations`).
- **Audit Logs**: Immutable global audit trail using `VirtualTable`.

## 3. Technical Strategy

### Dogfooding API Integrations ✅
- Microfrontends strictly import enums from Orval-generated models to prevent build breakage.
- Service paths standardized across `organizationService` and `userService`.
- **Custom Client Routing**: Specific resources like `/portfolios`, `/auditing`, and `/platform` are correctly routed.
- **Infrastructure Monitor**: `api-automations` serves as the primary probe for shared databases and messaging layers.

### Component Architecture ✅
- **VirtualTable**: Standardized high-performance rendering. Optimized with a `rowHeight` of `64` and `py-4` padding for professional density.
- **Professional Compact Styling**:
  - **StatsCard**: Reduced text to `2xl`, titles to `text-[10px]`, and padding to `p-4` for a shorter, more integrated look.
  - **Card**: Compacted padding and spacing.
  - **Shared Components**: Ported `LoadingSpinner` and `EmptyState` from `ui-collectors`.