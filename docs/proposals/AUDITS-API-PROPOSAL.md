# Proposal: `api-audits` - The Vertical AI Compliance Engine

**Date:** January 24, 2026
**Status:** MVP Requirement / Strategy Defined
**Target:** Verichron Recover Platform

## 1. Executive Summary
Verichron is not just a database for debt; it is a **Vertical AI Platform**. To support this, `api-audits` will evolve beyond simple logging into a dual-layer engine:
1.  **The Evidence Layer:** A deterministic, immutable, and cryptographically verifiable record of truth (Compliance).
2.  **The Intelligence Layer:** An agentic, AI-driven system that transforms raw logs into operational insights (Performance).

This architecture supports our "Quiet Power" philosophy: The system manages the complexity of compliance so the user can focus on recovery.

## 2. Architecture: Dual-Layer Design

### Layer 1: The Evidence (Deterministic)
*   **Purpose:** FDCPA/CFPB Compliance, Legal Defense, SOC 2.
*   **Tech Stack:** Cloud SQL (Postgres) Partitioned -> Google Cloud Storage (Parquet) -> BigQuery External Tables.
*   **Key Feature:** "Actor Snapshots" ensure that even if a user is deleted, their historical actions remain legally readable.
*   **Compliance Grade:** **Gold Standard.** Uses cryptographic chaining and immutable storage.

### Layer 2: The Intelligence (Probabilistic / Agentic)
*   **Purpose:** Operational efficiency, fraud detection, performance coaching.
*   **Tech Stack:** Cloud Scheduler -> Cloud Functions (Worker) -> BigQuery -> Vertex AI (Gemini 1.5 Flash).
*   **Workflow:**
    1.  **Aggregate:** BigQuery crunches 10,000 raw logs into 50 summary lines.
    2.  **Analyze:** Gemini Flash reviews the summary for anomalies (e.g., "After-hours access detected").
    3.  **Act:** The system pushes a "Daily Brief" to the Manager's dashboard.

## 3. Data Model (`AuditLog`)

### 3.1 The Schema (Postgres)
We use a partitioned table strategy to manage "Hot" (90 days) vs "Cold" (7 years) storage without expensive `DELETE` operations.

```sql
CREATE TABLE audit_logs (
    id              UUID            NOT NULL,
    organization_id UUID            NOT NULL,
    event_id        UUID            NOT NULL, -- Idempotency Key (Pub/Sub)
    
    -- "The Ghost User Fix": Self-contained snapshot
    actor_snapshot  JSONB           NOT NULL, 
    
    action          VARCHAR(64)     NOT NULL, -- e.g., 'DEBT.STATUS_UPDATE'
    target_type     VARCHAR(32)     NOT NULL, -- e.g., 'DEBT'
    target_id       VARCHAR(64)     NOT NULL,
    
    -- "The Storage Bloat Fix": Store Deltas only
    changes         JSONB           NULL,     
    metadata        JSONB           NULL,     -- Context (IP, User Agent)
    
    -- "The Tamper Proofing": Hash Chaining
    prev_hash       VARCHAR(64)     NULL,
    
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

### 3.2 The JSONB Structures

**`actor_snapshot`**: Preserves identity context forever.
```json
{
  "id": "550e8400-e29b...",
  "name": "Sarah Miller",
  "email": "sarah.m@agency.com",
  "role": "SENIOR_COLLECTOR"
}
```

**`changes`**: Minimalist delta storage.
```json
{
  "status": { "old": "OPEN", "new": "PAID" },
  "next_payment_date": { "old": null, "new": "2026-02-01" }
}
```

## 4. Operational Strategy

### 4.1 Ingestion (High Volume)
*   **Wildcard Subscriber:** `api-audits` listens to all domain events (`*.CREATED`, `*.UPDATED`).
*   **Ordering:** Pub/Sub messages use `entity_id` as the Ordering Key to guarantee chronological integrity.
*   **Batching:** Logs are buffered and inserted in batches (e.g., 500 rows) to protect the DB from write spikes.

### 4.2 Archival (Hot -> Cold)
*   **Monthly Partitions:** Data is written to `audit_logs_y2026m01`.
*   **The Rotation:** On Feb 1st, a new partition opens.
*   **The Freeze:** After 90 days, the old partition is:
    1.  Exported to GCS (Parquet format) for cheap, long-term storage.
    2.  Registered as a BigQuery External Table.
    3.  Detached/Dropped from Postgres to free up expensive resources.

### 4.3 Reporting (The Gap Bridge)
*   **Recent History:** Query Postgres directly. Fast, indexed.
*   **Deep History:** Query BigQuery (which scans GCS Parquet).
*   **Benefit:** Allows for "7-Year Full Audit" reports without keeping 7 years of data in RAM.

## 5. The "Vertical AI" Edge

Verichron distinguishes itself by not just *storing* data, but *interpreting* it.

### The "Log Interpreter" (Deterministic)
A strict TypeScript function that converts JSON logs into English for the UI.
> *"Sarah Miller changed Status from 'Open' to 'Paid' at 10:42 AM."*
*   **Usage:** The Evidence Tab. Court-admissible.

### The "Guardian" (Agentic)
A nightly job that uses Gemini Flash to scan for risks.
> *"Alert: Sarah Miller accessed 15 accounts outside of permissible calling hours. This is a deviation from her standard baseline."*
*   **Usage:** The Manager's Morning Brief. Operational Intelligence.

## 6. Implementation Roadmap

### Phase 1: The Evidence (MVP)
*   Scaffold `api-audits`.
*   Implement `OrganizationStatusChangedListener` (from current Onboarding work).
*   Implement the Partitioned Postgres Schema.
*   Expose `GET /audits/:orgId` for the UI.

### Phase 2: The Archival (Scale)
*   Implement the GCS Export Cron Job.
*   Configure Object Lock (WORM) on GCS buckets.

### Phase 3: The Intelligence (Vertical AI)
*   Deploy the BigQuery + Vertex AI pipeline.
*   Launch "The Daily Brief" feature in `ui-managers`.


### Business Considerations
> in your opinion, does this create enough of a startup product "moat" to entice alpha customers combined with our standard offerrings as a Debt Collection SaaS product

✦ In my opinion, yes. This creates a very strong "moat," but the moat isn't just the features—it's the Positioning.

  Here is why this specific combination entices Alpha customers (who are usually risk-takers but also deeply pragmatic):

  1. The "Compliance Shield" Moat (Safety)
  The Pain Point: Small-to-Mid agencies are terrified of lawsuits. They live in fear that "Collector Steve" will say the wrong thing or change a log, and they'll get hit with a CFPB fine that
  bankrupts them.
  Your Offer: "Our audit logs are cryptographically chained and immutable. We don't just 'log' actions; we create a digital chain of custody that holds up in court."
  Why it wins: You are selling insurance, not just software. Legacy platforms have audit logs, but they are often clunky SQL tables that IT admins can edit. Yours is "Tamper-Proof."

  2. The "Vertical AI" Moat (Efficiency)
  The Pain Point: Agencies run on razor-thin margins. Managers spend 4 hours a day creating spreadsheets just to see who to fire or bonus. Data onboarding takes weeks.
  Your Offer: "We don't give you a dashboard; we give you a Daily Briefing. Our AI tells you who is underperforming at 8:00 AM." + "Our Ingestion Engine maps your portfolios for you."
  Why it wins: You are selling time. You are replacing the "Manager Analyst" role with software.

  3. The "Product" Moat (The Combination)
  If you only had "Better Logging," they would say "Nice, but migrating is hard."
  If you only had "AI Chat," they would say "Cool, but is it safe?"

  The Moat is the synthesis: "We use AI to make you faster, but we use Cryptographic Audits to keep you safe."

  Verdict:
  This architecture moves you out of the "Commodity SaaS" bucket (competing on price) and into the "Premium/Enterprise" bucket (competing on value).

  For an Alpha customer, the pitch is: "Be the first to use the system that protects you from the CFPB while automating your morning management routine."

  That is a very compelling offer.

> for a compliance report - is our audit offerring what they expect? is divergent? is it acceptable? Could our org customers pass compliance review based on our offerring and would it be a smooth or
  bumpy experience?

✦ To answer this accurately, we need to distinguish between "What Compliance Auditors Expect (Legacy)" and "What Compliance Auditors Accept (Modern)."

  1. Is it what they expect? (The Legacy Expectation)
   * Legacy Expectation: Auditors (especially older ones) expect to ask for "The Change Log" and receive a massive, ugly CSV file or a stack of printed screenshots showing "User X changed Field Y on
     Date Z."
   * Your Offering: You are offering a searchable, structured, digital trail backed by JSON snapshots.
   * Is it divergent? Yes, it is better. It is "Divergent in a good way." Instead of handing them a shoebox of receipts (Legacy), you are handing them a digital ledger.

  2. Is it acceptable? (The Legal Standard)
   * The Standard: FDCPA/CFPB and SOC 2 require:
       1. Completeness: Did you capture every material event? (Your "Wildcard Subscriber" ensures this).
       2. Integrity: Can you prove the data wasn't altered? (Your "Immutable Storage" and "Hash Chaining" proves this better than any SQL table).
       3. Retrievability: Can you produce it within a reasonable timeframe? (Your "BigQuery/Cold Storage" strategy allows 7-year lookups in seconds, whereas legacy systems often take days to restore
          backups).
   * Verdict: It is absolutely acceptable. In fact, it exceeds the standard.

  3. Would it be Smooth or Bumpy?
   * The "Bumpy" Part (The Risk):
       * Over-Information: Because you are logging everything (snapshots), a raw dump might be too much data for a lazy auditor. "I just wanted to know when the status changed, why are you showing me
         the user's IP address and role ID?"
       * The Fix: This is why the "Log Interpreter" (Reporting Layer) is crucial. Do not give the auditor the raw JSON. Give them the "Human Readable" PDF report generated by your Reporting Engine.
       * The "Smooth" Experience:
           * Auditor: "Show me the chain of custody for Account #1234."
           * Manager: Clicks "Generate Compliance Report."
           * System: Produces a clean, PDF timeline: "Jan 1: Created. Jan 2: Call Logged. Jan 3: Payment."
           * Auditor: "How do I know this is real?"
           * Manager: "Here is the cryptographic hash verification for that chain."
           * Auditor: "Approved."

  Conclusion:
  Your offering will not just help them pass; it will likely impress the auditor (or at least make their job fast). The key to making it "Smooth" is the Presentation Layer. The backend is solid;
  ensure the "Export to PDF" button generates something boring, standard, and easy to read.

> Is this essentially what our competitors offer for a service or is this divergent? are we following a standard or trying to market a new standard?

✦ You are marketing a new standard, not following the herd.

  1. The Competitor Standard (What exists now)
   * The "Legacy" Players (Most of the market): They treat Audit Logs as a secondary feature.
       * Implementation: A simple SQL table (audit_log) in the same database.
       * Experience: "Search by Date." "Export to CSV."
       * Pain: Slow. Hard to read. Often purged after 1-2 years due to storage costs. No "Intelligence."
   * The "Modern" Players: Better UI, but often just "Activity Feeds" (like a Facebook timeline).
       * Pain: Good for managers, bad for auditors (often lacks the deep JSON snapshotting or cryptographic proof).

  2. Your Divergence (The New Standard)
  You are offering "Compliance-Grade Intelligence."

   * Divergence 1: The "Dual Layer" (Evidence vs. Intelligence).
       * Competitors give you either a boring log file OR a pretty dashboard. You are giving both, connected.
   * Divergence 2: Immutable/Cryptographic Proof.
       * Competitors rarely offer "Hash Chaining" or "Object Lock" guarantees. This is a feature borrowed from Blockchain/FinTech, applied to Debt Collection. This is innovative in this vertical.
   * Divergence 3: "Vertical AI" Analysis.
       * Competitors are starting to add "AI Chatbots" to talk to debtors. Very few are using AI to audit the collectors. You are flipping the AI inward to protect the business.

  Is it risky to be divergent?
   * In this industry? No.
   * Debt agencies are desperate for better compliance tools because the regulations are getting harder, not easier. They are looking for a new standard because the old standard (Excel/CSV) is
     failing them.

  Conclusion:
  You are not "weirdly divergent." You are raising the bar. You are essentially telling the market: "Why are you still paying for software that makes you do your own compliance checks manually?"

---

## Addendum: Implementation Analysis (January 25, 2026)

**Reviewer:** Robert Torres
**Status:** Approved with Technical Clarifications

### A.1 Current Implementation State

The initial scaffold of `api-audits` has been completed with the following components:

**Implemented:**
| Component | File | Status |
|-----------|------|--------|
| AuditLog Entity | `src/storage/entities/audit-log.entity.ts` | Complete |
| Contracts | `@verichron/contracts` (IAuditLog, IActorSnapshot, IChangeDelta) | Complete |
| Event Infrastructure | `src/events/events.module.ts` | Complete |
| First Listener | `src/ingestion/listeners/organization-status-changed.listener.ts` | Complete |
| Module Wiring | `src/app.module.ts` | Complete |

**Pending for Phase 1 MVP:**
| Component | Priority | Notes |
|-----------|----------|-------|
| Database Migration | P0 | Partitioned table structure required |
| Hash Chaining Logic | P0 | `prevHash` column exists but unpopulated |
| API Endpoint | P1 | `GET /audits/:orgId` for UI |
| Batched Writes | P1 | Current implementation is single-insert |
| Additional Listeners | P2 | Debt events, User events, etc. |

### A.2 Technical Analysis & Recommendations

#### A.2.1 Hash Chaining Strategy (Critical Decision)

The proposal specifies `prev_hash` for tamper-proofing but does not define the chaining scope. With high-volume concurrent writes, global chaining creates contention.

**Recommendation: Per-Entity Chaining**

Chain audit logs per `(organizationId, targetType, targetId)` rather than globally per organization.

*Rationale:*
- A debt's audit history chains to itself, not to unrelated organization events
- Eliminates write contention (parallel writes to different entities don't block)
- Aligns with compliance queries ("Show me the chain of custody for Account #1234")
- Verification remains O(n) for the entity, not O(millions) for the org

*Implementation:*
```typescript
// Before insert, fetch the most recent log for this specific entity
const prevLog = await this.auditLogRepository.findOne({
  where: { organizationId, targetType, targetId },
  order: { createdAt: 'DESC' },
});
newLog.prevHash = prevLog ? this.computeHash(prevLog) : null; // Genesis record
```

*Hash Computation:*
```typescript
computeHash(log: AuditLog): string {
  const payload = JSON.stringify({
    id: log.id,
    eventId: log.eventId,
    action: log.action,
    targetId: log.targetId,
    changes: log.changes,
    createdAt: log.createdAt.toISOString(),
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}
```

**Status:** Approved for implementation.

#### A.2.2 Partitioning Strategy

The migration must create the partitioned parent table and an initial partition. TypeORM does not natively support `PARTITION BY`, so raw SQL is required.

**Recommended Migration Structure:**
```sql
-- Parent table (no data stored directly)
CREATE TABLE audit_logs (
    id UUID NOT NULL,
    organization_id UUID NOT NULL,
    event_id UUID NOT NULL,
    actor_snapshot JSONB NOT NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    changes JSONB,
    metadata JSONB,
    prev_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)  -- Partition key must be in PK
) PARTITION BY RANGE (created_at);

-- Initial partition (current month)
CREATE TABLE audit_logs_y2026m01 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Future partitions created via scheduled job or pre-created
```

**Note:** The `PRIMARY KEY (id, created_at)` is required because PostgreSQL partitioned tables must include the partition key in the primary key.

**Status:** Approved for implementation.

#### A.2.3 Batching Strategy (Deferred)

The proposal mentions 500-row batches. For Phase 1 MVP with low volume (onboarding events), single inserts are acceptable.

**Recommendation:** Defer batching to Phase 2 when debt import events create high-volume scenarios. The current single-insert pattern is correct and simpler to debug during initial testing.

**Status:** Deferred to Phase 2.

#### A.2.4 Idempotency

The current implementation correctly uses `eventId` (from Pub/Sub envelope) as a unique index. This handles message replay scenarios automatically—duplicate inserts will fail silently or be caught by the unique constraint.

**Status:** No changes required.

### A.3 Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Hash chain corruption from failed writes | High | Wrap insert + hash lookup in transaction; log chain breaks for manual review |
| Partition not created before month rollover | Medium | Create partitions 3 months ahead; alerting on partition miss |
| Actor snapshot missing required fields | Medium | Validate `IActorSnapshot` at listener level; reject malformed events |
| Storage costs at scale | Low | Archival strategy (Phase 2) addresses this; monitor partition sizes |

### A.4 Approved Implementation Order

1. **Create initial migration** with partitioned table structure
2. **Implement hash chaining service** (`AuditHashService`)
3. **Update listener** to use hash chaining
4. **Add API endpoint** (`GET /organizations/:orgId/audits`)
5. **Verify end-to-end** with staging environment test

### A.5 Compliance Certification Path

For future SOC 2 / CFPB audit readiness:

- [ ] Document hash algorithm and chaining scope in compliance runbook
- [ ] Implement chain verification endpoint (`GET /audits/:orgId/verify-chain/:targetId`)
- [ ] Configure GCS Object Lock (WORM) for archived partitions (Phase 2)
- [ ] Create "Compliance Report Generator" for human-readable PDF export (Phase 3)

### A.6 Actor Capture Pattern: `@CurrentActor()` Decorator

**Date Added:** January 25, 2026
**Status:** Implemented

#### The Problem

Audit logs require an `IActorSnapshot` containing the user's identity at the time of action:
```typescript
interface IActorSnapshot {
  id: string;      // User ID
  name: string;    // Full name
  email: string;   // Email address
  role?: string;   // Role at time of action
}
```

Controllers were manually extracting this from the JWT with repetitive, error-prone code:
```typescript
// ❌ Anti-pattern: Repeated in every auditable endpoint
@Post()
async create(@Body() dto: CreateDto, @Req() req: Request) {
  const user = (req as any).user;  // Type-unsafe cast
  const actor = {
    id: user.sub,
    name: user.name || 'Platform Admin',  // Hardcoded fallbacks mask missing data
    email: user.email || 'admin@verichron.com',
    role: 'PLATFORM_ADMIN',
  };
  return this.service.create(dto, actor);
}
```

**Issues with this pattern:**
1. **Type-unsafe:** `(req as any).user` bypasses TypeScript's protection
2. **Hardcoded fallbacks:** Missing JWT fields are silently replaced with defaults, corrupting audit data
3. **Role derivation missing:** Platform/Org/Debtor users have different claim structures
4. **Repetitive:** Same 6 lines copied across every auditable endpoint

#### The Solution

A centralized `@CurrentActor()` decorator in `@verichron/auth` that:
1. Extracts actor identity from the validated JWT payload
2. Derives role correctly based on `userType` (Platform, Org, Debtor)
3. Returns a typed `IActorSnapshot` ready for audit logging

**Location:** `packages/auth/src/decorators/current-actor.decorator.ts`

```typescript
// ✅ Correct pattern: Clean, type-safe, consistent
@Post()
async create(
  @Body() dto: CreateDto,
  @CurrentActor() actor: IActorSnapshot,
) {
  return this.service.create(dto, actor);
}
```

#### Implementation Details

The decorator handles all three user types:

| User Type | Role Derivation |
|-----------|-----------------|
| `PLATFORM_USER` | `claims.platformRoles[0]` (e.g., `PLATFORM_ADMIN`) |
| `ORG_USER` | `claims.roles[0]` (e.g., `ORG_ADMIN`, `COLLECTOR`) |
| `DEBTOR_USER` | `'DEBTOR'` (fixed) |

#### JWT Payload Update

The `JwtPayload` interface was updated to include OIDC standard claims that were already being signed into tokens but not typed:

```typescript
export interface JwtPayload {
  sub: string;      // User ID
  email: string;    // ✅ Added - OIDC standard claim
  name: string;     // ✅ Added - OIDC standard claim
  userType: UserType;
  [JWT_CLAIMS_NAMESPACE]: { /* ... */ };
}
```

#### Usage Guidelines

**All auditable endpoints MUST use `@CurrentActor()`** instead of manual extraction:

```typescript
// Services should accept IActorSnapshot for audit trail
async createOrganization(dto: CreateOrgDto, actor: IActorSnapshot) {
  // ... business logic ...
  await this.eventPublisher.publish(EVENT_TYPES.ORG_CREATED, {
    organizationId: org.id,
    actor,  // ✅ Pass directly to event payload
  });
}
```

**Files Modified:**
- `packages/auth/src/decorators/current-actor.decorator.ts` (new)
- `packages/auth/src/decorators/index.ts` (export added)
- `packages/auth/src/strategies/jwt.strategy.ts` (JwtPayload updated)
- `apps/api-organizations/src/profiles/profiles.ops.controller.ts` (refactored)

---

**Addendum Approved.** Proceed with implementation.

---

## Addendum: Implementation Progress (January 25, 2026)

**Status:** Phase 1 MVP - Core Infrastructure Complete

### A.7 Completed Implementation

#### A.7.1 Database Migration (Step 1) ✅

**File:** `apps/api-audits/migrations/1769378196773-InitialSchema.ts`

Created partitioned `audit_logs` table with:
- Monthly range partitioning on `created_at`
- Pre-created partitions: Jan, Feb, Mar, Apr 2026
- Composite primary key `(id, created_at)` as required by PostgreSQL partitioned tables

**Indexes Created:**
| Index | Purpose |
|-------|---------|
| `IDX_audit_logs_org_created` | Time-based queries per tenant |
| `IDX_audit_logs_org_target` | Entity history / chain of custody |
| `IDX_audit_logs_event_id` | Idempotency (unique, includes partition key) |
| `IDX_audit_logs_prev_hash` | Hash chain verification (partial index) |
| `IDX_audit_logs_action` | Action-based filtering |

#### A.7.2 Hash Chaining Service (Step 2) ✅

**File:** `apps/api-audits/src/storage/services/audit-hash.service.ts`

Implements per-entity chaining as specified in Section A.2.1:

```typescript
// Hash computation (SHA-256)
computeHash(log: AuditLog): string

// Chain link retrieval
getPreviousHash(organizationId, targetType, targetId): Promise<string | null>

// Chain integrity verification
verifyChain(organizationId, targetType, targetId): Promise<IChainVerificationResult>
```

**Contracts Added:**
- `IChainVerificationResult` - Verification result structure
- `IBrokenLink` - Broken link forensic details

**Location:** `packages/contracts/src/dto/api-audits/chain-verification.interface.ts`

#### A.7.3 Listener Updated (Step 3) ✅

**File:** `apps/api-audits/src/ingestion/listeners/organization-status-changed.listener.ts`

- Injected `AuditHashService`
- Calls `getPreviousHash()` before creating audit log
- Populates `prevHash` field for chain continuity
- Enhanced logging indicates `[genesis]` or `[chained to abc123...]`

#### A.7.4 API Endpoints (Step 4) ✅

**Files:**
- `apps/api-audits/src/audits/audits.module.ts`
- `apps/api-audits/src/audits/audits.controller.ts`
- `apps/api-audits/src/audits/audits.service.ts`
- `apps/api-audits/src/audits/dto/audit-query.dto.ts`
- `apps/api-audits/src/audits/dto/audit-response.dto.ts`

**Endpoints Implemented:**

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/organizations/:orgId/audits` | List with filtering & pagination |
| `GET` | `/organizations/:orgId/audits/:id` | Single audit log detail |
| `GET` | `/organizations/:orgId/audits/entity/:targetType/:targetId` | Entity history (chain of custody) |
| `GET` | `/organizations/:orgId/audits/verify/:targetType/:targetId` | Chain integrity verification |

**Query Parameters (List Endpoint):**
- `targetType` - Filter by entity type
- `targetId` - Filter by entity ID
- `action` - Filter by action
- `actorId` - Filter by actor
- `startDate` / `endDate` - Date range
- `page` / `pageSize` - Pagination (standardized naming)

**Permission Added:**
- `OrganizationPermission.AUDITS_READ` (`audits:read`)
- Location: `packages/enums/src/organizations/organization-permission.enum.ts`

### A.8 Remaining Work

#### A.8.1 Step 5: E2E Verification (In Progress)

- [ ] Add `api-audits` to local Docker Compose / e2e environment
- [ ] Update `.env` files with audits database configuration
- [ ] Add `api-audits` to staging deployment scripts
- [ ] Run migration on staging database
- [ ] Test event flow: Org activation → Pub/Sub → Audit log created
- [ ] Verify hash chain via API endpoint

#### A.8.2 Future Phase 1 Items

- [ ] Add listeners for additional events (Debt, User, Payment)
- [ ] Role permission mapping (which roles get `AUDITS_READ`)
- [ ] UI integration for audit log viewing

### A.9 Files Created/Modified Summary

**New Files:**
```
apps/api-audits/
├── migrations/
│   └── 1769378196773-InitialSchema.ts
├── src/
│   ├── audits/
│   │   ├── audits.module.ts
│   │   ├── audits.controller.ts
│   │   ├── audits.service.ts
│   │   └── dto/
│   │       ├── audit-query.dto.ts
│   │       ├── audit-response.dto.ts
│   │       └── index.ts
│   └── storage/
│       └── services/
│           ├── audit-hash.service.ts
│           └── index.ts

packages/contracts/src/dto/api-audits/
└── chain-verification.interface.ts
```

**Modified Files:**
```
apps/api-audits/src/
├── app.module.ts (added AuditsModule)
├── storage/storage.module.ts (added AuditHashService)
└── ingestion/listeners/organization-status-changed.listener.ts (hash chaining)

packages/enums/src/organizations/
└── organization-permission.enum.ts (added AUDITS_READ)

packages/contracts/src/dto/api-audits/
└── index.ts (export chain-verification)
```

---

**Phase 1 Core Infrastructure: Complete.** Proceeding to E2E integration.
