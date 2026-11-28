# Event Orchestrator Audit & Reorganization Plan

**Generated:** 2025-12-19
**Purpose:** Audit existing orchestrators, identify what exists for team management, and reorganize for clarity

---

## Current State: All Orchestrators

### Collector-Focused Orchestrators (4 files)

| File | Topic | Purpose | Status |
|------|-------|---------|--------|
| `analytics-collector-leaderboard.orchestrator.ts` | COLLECTORS | Team leaderboard rankings by totalCollected | ✅ **IMPLEMENTED** |
| `analytics-collector-stats.orchestrator.ts` | COLLECTORS | Individual collector performance stats | ✅ **IMPLEMENTED** |
| `analytics-debtor-focus.orchestrator.ts` | ORGANIZATIONS | 360-degree debtor view for collectors | ✅ **IMPLEMENTED** |
| `collectors-data.orchestrator.ts` | AUTOMATIONS | Internal endpoints: workload, skills, territories | ✅ **IMPLEMENTED** |

### Organization-Focused Orchestrators (7 files)

| File | Topic | Purpose | Status |
|------|-------|---------|--------|
| `analytics-dashboard.orchestrator.ts` | ORGANIZATIONS | Organization dashboard summary | ✅ **IMPLEMENTED** |
| `analytics-flow.orchestrator.ts` | ORGANIZATIONS | Analytics flow (need to read) | ⚠️ **UNKNOWN** |
| `analytics-geographic-combined.orchestrator.ts` | ORGANIZATIONS | Combined geographic analytics | ✅ **IMPLEMENTED** |
| `analytics-geographic-creditors.orchestrator.ts` | ORGANIZATIONS | Creditor geographic analytics | ✅ **IMPLEMENTED** |
| `analytics-geographic-debtors.orchestrator.ts` | ORGANIZATIONS | Debtor geographic analytics | ✅ **IMPLEMENTED** |
| `analytics-portfolio-performance.orchestrator.ts` | ORGANIZATIONS | Portfolio performance analytics | ✅ **IMPLEMENTED** |
| `analytics-recovery-trends.orchestrator.ts` | ORGANIZATIONS | Recovery trend analytics | ✅ **IMPLEMENTED** |

### Automation-Focused Orchestrators (2 files)

| File | Topic | Purpose | Status |
|------|-------|---------|--------|
| `collectors-data.orchestrator.ts` | AUTOMATIONS | Collector data for auto-assignment | ✅ **IMPLEMENTED** |
| `work-queue-data.orchestrator.ts` | AUTOMATIONS | Work queue data (need to read) | ⚠️ **UNKNOWN** |

### Other Orchestrators (2 files)

| File | Topic | Purpose | Status |
|------|-------|---------|--------|
| `onboarding.orchestrator.ts` | ORGANIZATIONS | New organization onboarding | ✅ **IMPLEMENTED** |
| `transaction.orchestrator.ts` | TRANSACTIONS | Transaction orchestration | ✅ **IMPLEMENTED** |

---

## Deep Dive: Collector Orchestrators

### 1. `analytics-collector-stats.orchestrator.ts`

**What it does:**
- Fetches **individual collector** stats for a specific collector
- Aggregates data from:
  - `api-communications` - Communication metrics (calls, emails, SMS, response rates)
  - `api-transactions` - Payment metrics (total collected, successful payments, payment plans)
  - `api-collectors` - Action stats (TODO: not yet implemented)

**Event Flow:**
- **Listens to:** `ANALYTICS_COLLECTOR_STATS_REQUESTED` (COLLECTORS topic)
- **Publishes:** `ANALYTICS_COLLECTOR_STATS_COMPLETED` (reply-to topic)

**Request Payload:**
```typescript
{
  organizationId: string;
  collectorUserId: string;  // ⚠️ Single collector only
  periodStart: string;
  periodEnd: string;
  correlationId: string;
}
```

**Response Payload:**
```typescript
{
  stats: CollectorStats {
    // Communication metrics
    callsMade: number;
    emailsSent: number;
    smsSent: number;
    accountsContacted: number;
    emailResponseRate: number;

    // Payment metrics
    totalCollected: number;
    successfulPayments: number;
    paymentPlansCreated: number;
    uniquePayingAccounts: number;
    collectedToday: number;

    // Action metrics (TODO)
    totalActions: number;
    notesAdded: number;
  }
}
```

**Used By:** `api-collectors` → `collectorService.getTodayStats()` and `getWeekStats()`

**⚠️ Limitation:** Only supports **one collector at a time** - cannot get team-wide stats in single call

---

### 2. `analytics-collector-leaderboard.orchestrator.ts`

**What it does:**
- Fetches **organization-wide** stats for **all collectors**
- Aggregates data from:
  - `api-communications` - Organization-wide communication stats by collector
  - `api-transactions` - Organization-wide payment stats by collector
- Ranks collectors by `totalCollected` descending

**Event Flow:**
- **Listens to:** `ANALYTICS_COLLECTOR_LEADERBOARD_REQUESTED` (COLLECTORS topic)
- **Publishes:** `ANALYTICS_COLLECTOR_LEADERBOARD_COMPLETED` (reply-to topic)

**Request Payload:**
```typescript
{
  organizationId: string;
  collectorUserId: string;  // For marking current user
  period: TrendGranularity;  // DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY
  limit: number;  // Max entries to return
  correlationId: string;
}
```

**Response Payload:**
```typescript
{
  leaderboard: CollectorLeaderboard {
    period: TrendGranularity;
    periodStart: string;
    periodEnd: string;
    entries: LeaderboardEntry[] {
      collectorId: string;
      collectorName: string;  // ⚠️ TODO: Currently "Collector {rank}" - not real names
      totalCollected: number;
      rank: number;
      isCurrentUser: boolean;
      accountsResolved: number;  // ⚠️ TODO: Not yet tracked
      totalContacts: number;
      successfulPayments: number;
      paymentPlansCreated: number;
    };
    totalCollectors: number;
    currentUserRank: number;
  }
}
```

**Used By:** `api-collectors` → `collectorService.getLeaderboard()`

**✅ THIS IS WHAT WE NEED FOR TEAM OVERVIEW!** But has gaps:
- ❌ Missing real collector names (TODO in code)
- ❌ Missing `accountsResolved` (TODO in code)
- ❌ Missing workload/capacity data
- ❌ Missing last activity timestamp
- ✅ Has totalContacts
- ✅ Has totalCollected
- ✅ Has successfulPayments
- ✅ Has paymentPlansCreated

---

### 3. `analytics-debtor-focus.orchestrator.ts`

**What it does:**
- Provides 360-degree view of a single debtor for collector workstation
- Aggregates data from:
  - `api-debtors` - Debtor profile, contact info
  - `api-debts` - All debts for debtor
  - `api-transactions` - Payment history, payment plans
  - `api-communications` - Communication history

**Event Flow:**
- **Listens to:** `ANALYTICS_DEBTOR_FOCUS_REQUESTED` (ORGANIZATIONS topic)
- **Publishes:** `ANALYTICS_DEBTOR_FOCUS_COMPLETED` (reply-to topic)

**Used By:** `api-collectors` → `collectorService.getDebtorFocus()`

**Not relevant for team management** - this is for individual debtor views

---

### 4. `collectors-data.orchestrator.ts`

**What it does:**
- Provides internal endpoints for automation system
- Used by `api-automations` for auto-assignment strategies
- Fetches from `api-collectors`:
  - Workload counts per collector
  - Skills per collector
  - Territories per collector

**Event Flow:**
- **Listens to:** `AUTOMATIONS_COLLECTORS_DATA_REQUESTED` (AUTOMATIONS topic)
- **Publishes:** Same event type back to reply-to topic

**Request Payload:**
```typescript
{
  organizationId: string;
  action: 'getCollectorWorkload' | 'getCollectorSkills' | 'getCollectorTerritories';
  collectorIds: string[];
  correlationId: string;
}
```

**Used By:** `api-automations` for auto-assignment execution

**Not relevant for team management** - this is internal automation infrastructure

---

## What We Have vs What We Need for Team Management

### ✅ What Exists (Can Use Today)

| Data Point | Source | Notes |
|------------|--------|-------|
| Total collectors | Leaderboard | ✅ Available |
| Collector IDs | Leaderboard | ✅ Available |
| Total collected (today/week) | Leaderboard | ✅ Available per period |
| Total contacts | Leaderboard | ✅ Available |
| Successful payments count | Leaderboard | ✅ Available |
| Payment plans created | Leaderboard | ✅ Available |
| Workload counts | collectors-data (internal) | ✅ Available but internal-only |
| Skills | collectors-data (internal) | ✅ Available but internal-only |
| Territories | collectors-data (internal) | ✅ Available but internal-only |

### ❌ What's Missing (Need to Add)

| Data Point | Why Missing | Solution |
|------------|-------------|----------|
| **Collector names** | Leaderboard has TODO placeholder | Fetch from api-users |
| **Collector emails** | Not in any orchestrator | Fetch from api-users |
| **Accounts resolved** | TODO in leaderboard | Query CollectorResponseTracking |
| **Workload breakdown** (in-progress vs completed) | Not tracked in orchestrators | Query work queue by status |
| **Promises secured count** | Not in orchestrators | Add to api-transactions internal endpoint |
| **Payments logged count** (vs amount) | Not separated | Add to api-transactions internal endpoint |
| **Last activity timestamp** | Not in orchestrators | Query latest CollectorAction |
| **Availability status** | Not in orchestrators | Fetch from CollectorProfile.availabilityStatus |
| **Capacity metrics** | Workload exists but not capacity limits | Fetch from CollectorProfile capacity fields |

---

## Reorganization Plan

### Proposed Directory Structure

```
packages/event-orchestrator/src/orchestrators/
├── organizations/
│   ├── analytics-dashboard.orchestrator.ts
│   ├── analytics-flow.orchestrator.ts
│   ├── analytics-geographic-combined.orchestrator.ts
│   ├── analytics-geographic-creditors.orchestrator.ts
│   ├── analytics-geographic-debtors.orchestrator.ts
│   ├── analytics-portfolio-performance.orchestrator.ts
│   ├── analytics-recovery-trends.orchestrator.ts
│   └── onboarding.orchestrator.ts
│
├── collectors/
│   ├── analytics-collector-leaderboard.orchestrator.ts
│   ├── analytics-collector-stats.orchestrator.ts
│   ├── analytics-debtor-focus.orchestrator.ts
│   └── collectors-data.orchestrator.ts (internal)
│
├── automations/
│   ├── collectors-data.orchestrator.ts (symlink or move)
│   └── work-queue-data.orchestrator.ts
│
├── transactions/
│   └── transaction.orchestrator.ts
│
└── index.ts (re-export all)
```

### Migration Steps

1. **Create subdirectories:**
   ```bash
   mkdir -p packages/event-orchestrator/src/orchestrators/organizations
   mkdir -p packages/event-orchestrator/src/orchestrators/collectors
   mkdir -p packages/event-orchestrator/src/orchestrators/automations
   mkdir -p packages/event-orchestrator/src/orchestrators/transactions
   ```

2. **Move files:**
   - Move 8 files to `organizations/`
   - Move 4 files to `collectors/`
   - Move 2 files to `automations/`
   - Move 1 file to `transactions/`

3. **Update index.ts:**
   ```typescript
   // Re-export all orchestrators from subdirectories
   export * from './organizations/analytics-dashboard.orchestrator';
   export * from './collectors/analytics-collector-stats.orchestrator';
   // ... etc
   ```

4. **Update imports in event-orchestrator.module.ts**

5. **Test all orchestrators still work**

---

## Recommendation for Team Management

### Option A: Extend Leaderboard Orchestrator (Recommended)

**Add a new endpoint:** `ANALYTICS_TEAM_OVERVIEW_REQUESTED`

**New orchestrator:** `collectors/analytics-team-overview.orchestrator.ts`

**What it does:**
1. Fetch leaderboard data (existing logic)
2. Fetch collector profiles from api-collectors (names, emails, capacity, availability)
3. Fetch workload breakdown from api-collectors
4. Fetch collector names from api-users
5. Aggregate into comprehensive team overview

**Benefits:**
- Reuses existing leaderboard logic
- Single network request from UI
- Properly separated orchestrator for team management
- Clean separation of concerns

---

### Option B: Use Existing Leaderboard + Fill Gaps

**Keep leaderboard as-is, but:**
1. Fix TODO: Fetch real collector names from api-users
2. Fix TODO: Track accountsResolved in api-transactions
3. Add workload/capacity data to response

**Benefits:**
- Smaller change
- Reuses existing infrastructure

**Drawbacks:**
- Leaderboard becomes bloated with non-ranking data
- Mixed concerns (ranking vs team overview)

---

## Next Steps

1. ✅ **Audit complete** - We know what exists
2. **Decide:** Option A (new orchestrator) vs Option B (extend leaderboard)
3. **Reorganize orchestrators** into subdirectories
4. **Implement chosen option** for team management
5. **Update UI** to use new/updated orchestrator

---

**Recommendation:** Go with **Option A** - create dedicated `analytics-team-overview.orchestrator.ts` for clean separation of concerns. Leaderboard stays focused on rankings, team overview provides comprehensive management data.
