# Ops Module Microservice Migration Strategy

**Date:** January 7, 2026
**Status:** Approved for Implementation
**Scope:** System-Wide (All 10 Microservices + `ui-ops`)

---

## 1. Executive Summary

As the Verichron platform approaches MVP, the operational requirements for Platform Admins (internal staff) have diverged significantly from the requirements of Tenant Users (external customers). 

Currently, `ui-ops` leverages existing tenant endpoints (`/api/v1/*`), often bypassing tenant-scoped security guards via "Platform Permission" overrides. This has created a fragile "God Mode" within tenant controllers that pollutes business logic, complicates security audits, and risks data leakage or accidental side-effects (e.g., triggering billing events during admin troubleshooting).

This document outlines the strategy to strictly separate **Tenant Logic** from **Ops Logic** using the **Dual-Module Pattern**. This ensures that our "Super Admin" capabilities are secure, maintainable, and architecturally distinct from the product we sell to customers.

---

## 2. The Problem: "God Mode" Pollution

### Current Pain Points
1.  **Dangerous Side Effects:** Using a tenant endpoint (e.g., `updateUser`) as an admin runs the risk of triggering user-facing workflows (emails, webhooks) that should be suppressed during administrative actions.
2.  **Security Complexity:** Tenant endpoints rely on `OrgContextGuard` to implicitly filter data by `organizationId`. To support admins (who have no `organizationId`), we inject conditional logic (`if (isPlatformAdmin)`) into services and repositories, creating potential bypass vulnerabilities.
3.  **Dependency Pollution:** "Admin-only" features often require heavy dependencies (e.g., raw SQL access, system-wide aggregators) that bloat the lightweight tenant modules.
4.  **Blocked Features:** Features like **Master Creditor MDM** are currently blocked because the tenant controllers cannot handle system-level IDs (e.g., "SYSTEM" UUID mismatch).

### The Goal
To migrate from a "Shared Endpoint" model to a **"Strict Separation" model**, where Platform Admins work exclusively in a dedicated **Ops Lane** that never intersects with the Tenant Lane.

---

## 3. The Solution: Dual-Module Pattern

We will adopt a **Colocated but Distinct** architecture. Ops logic will live alongside the feature it manages but will be encapsulated in its own Module, Controller, and Service.

### Directory Structure (Example: `api-users`)

```text
apps/api-users/src/rbac/
├── dto/
│   ├── create-role.dto.ts      <-- Tenant DTO
│   └── ops-update-role.dto.ts  <-- Ops DTO (New)
├── entities/                   <-- Shared Data Layer (Single Source of Truth)
│   └── role.entity.ts
├── rbac.controller.ts          <-- Tenant Controller (Protected by OrgContext)
├── rbac.service.ts             <-- Tenant Service (Scoped to Org)
├── rbac.module.ts              <-- Tenant Module
├── rbac.ops.controller.ts      <-- Ops Controller (Protected by PlatformAuth)
├── rbac.ops.service.ts         <-- Ops Service (Unscoped / Explicit Scope)
└── rbac.ops.module.ts          <-- Ops Module (New - Isolated Dependency Tree)
```

### Module Isolation
*   **Tenant Modules (`*.module.ts`)** MUST NOT import Ops Modules. This prevents accidental "God Mode" injection into customer-facing code.
*   **Ops Modules (`*.ops.module.ts`)** can import Tenant Modules (rarely) but typically operate directly on Shared Entities/Repositories to avoid side-effect triggers.

---

## 4. Security Architecture

The **Ops Lane** will utilize a distinct security posture from the Tenant Lane.

| Feature | Tenant Lane (`/api/v1/*`) | Ops Lane (`/ops/*`) |
| :--- | :--- | :--- |
| **Authentication** | `JwtAuthGuard` | `JwtAuthGuard` |
| **Context Guard** | `OrgContextGuard` (Required) | **`@SkipOrgContext()`** (Bypassed) |
| **Authorization** | `OrganizationRole` / `Permission` | **`PlatformRole` / `PlatformPermission`** |
| **Data Scope** | Implicit (`req.user.orgId`) | **Explicit** (Argument-based) |
| **Side Effects** | **Enabled** (Emails, Webhooks) | **Suppressed** (Silent Audits) |

### Sample Ops Controller
```typescript
@Controller('ops/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@SkipOrgContext() // <--- The Key Differentiator
export class UsersOpsController {
  constructor(private readonly opsService: UsersOpsService) {}

  @Get()
  @Permissions(PlatformPermission.USERS_READ)
  async findAll(@Query('orgId') orgId?: string) {
    // Explicitly handles cross-org or specific-org queries
    return this.opsService.findAll(orgId);
  }
}
```

---

## 5. Benefits

1.  **Security by Design:** It is impossible for a tenant user to access an `/ops/*` endpoint (guarded by Platform Roles), and impossible for a tenant developer to accidentally inject Admin powers (guarded by Module separation).
2.  **Unhindered Operations:** `ui-ops` features (like Master Creditor MDM) are no longer constrained by the rigid multi-tenancy rules designed for customers.
3.  **Clear Auditing:** Logs will clearly distinguish between "Customer Activity" and "Staff Activity" based on the URL path.
4.  **System Stability:** Admin actions will no longer accidentally trigger billing/notification workflows.

---

## 6. Phased Implementation Plan

We will roll this out microservice by microservice in a strict order.

### Phase 1: api-users (Completed ✅)
*   **Feature:** Profiles & RBAC
*   **Status:** Ops Modules (`ProfilesOpsModule`, `RbacOpsModule`) implemented. `PlatformUsersController` removed. Build verified. `ui-ops` service clients updated and verified against test container.

### Phase 2: api-organizations (Completed ✅)
*   **Feature:** Organization Lifecycle (Onboarding, Suspension), Auditing, and Settings.
*   **Status:** Ops Modules (`ProfilesOpsModule`, `AuditingOpsModule`, `SettingsOpsModule`) implemented. `ui-ops` service clients and detail pages updated and verified.

### Phase 3: api-debts (Completed ✅)
*   **Feature:** Creditors & Portfolios
*   **Status:** Ops Module (`CreditorsOpsModule`) implemented. `GlobalCreditor` management unblocked. `PlatformCreditorsController` removed. Build verified. `ui-ops` updated to use `/ops/creditors/global`.

### Phase 4: api-debtors
*   **Feature:** Debtor Identity & Merging
*   **Goal:** Allow admins to merge/split debtor identities.

### Phase 5: api-transactions
*   **Feature:** Payment & Settlement Oversight
*   **Goal:** Transaction troubleshooting.

### Phase 6: api-communications
*   **Feature:** Template Management & Dispatch Logs
*   **Goal:** Global template management.

### Phase 7: api-collectors
*   **Feature:** Agent Performance & Assignment
*   **Goal:** Global agent oversight.

### Phase 8: api-voice
*   **Feature:** Call Logs & Recordings
*   **Goal:** Compliance auditing.

### Phase 9: api-workflows
*   **Feature:** Workflow Orchestration
*   **Goal:** Retry/Resume failed workflows.

### Phase 10: api-automations
*   **Feature:** Cron Jobs & Triggers
*   **Goal:** Manual trigger of system jobs.

### Phase 11: UI Refactor & Verification
*   **Target:** `ui-ops`
*   **Goal:** Update all API clients in `ui-ops` to point to the new `/ops/*` endpoints.
*   **Process:** After each service migration, rebuild the test environment and verify `ui-ops` integration.

---

## 7. Definition of Done

For each microservice, the migration is considered complete when:
1.  [ ] A dedicated `*.ops.module.ts`, `*.ops.controller.ts`, and `*.ops.service.ts` exists for relevant features.
2.  [ ] Ops endpoints are prefixed with `/ops/`.
3.  [ ] Ops endpoints are guarded by `@SkipOrgContext()` and `PlatformPermission`.
4.  [ ] No standard controller uses `PlatformPermission` (except strictly shared stateless utilities).
5.  [ ] `ui-ops` consumes the new endpoints successfully.
6.  [ ] Unit tests cover the new Ops Service logic.

---
