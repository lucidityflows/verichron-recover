# ✅ APPROVED: Vertex AI Import Strategy & Architecture

**Document Type:** Design & Implementation Strategy (Living Document)
**Status:** 🟢 Phase 1 Backend Complete - Ready for Testing
**Last Updated:** December 27, 2025
**Approval Date:** December 27, 2025
**Target Release:** Q1 2026 (MVP)

---

## 🎉 Implementation Progress Summary

**Phase 1: Backend Foundation** - ✅ **COMPLETE** (December 27, 2025)

- ✅ **Entities Created:** GlobalCreditor, Creditor (updated), CreditorConflict
- ✅ **Enums Created:** CreditorConflictStatus, ConflictResolutionAction
- ✅ **DTOs Created:** 6 DTOs for CRUD and conflict resolution
- ✅ **Services Implemented:**
  - VertexAiEntityMatcherService (with Levenshtein fallback)
  - CreditorResolutionService (v2.0 - Global/Local architecture)
  - CreditorsService (v2.0 - full CRUD with merge)
  - CreditorConflictsService (conflict resolution workflow)
- ✅ **Controllers Implemented:**
  - CreditorsController (public REST API)
  - CreditorConflictsController (conflict queue API)
  - InternalGlobalCreditorsController (platform admin - placeholder)
- ✅ **Module Wired:** CreditorsModule with all providers and controllers

**Next Steps:**
1. ✅ Generate OpenAPI spec (`npm run openapi:generate` in api-debts)
2. ✅ Generate Orval clients (`npm run orval:generate` in ui-organizations)
3. ✅ Create v0.1 Gold List seed data (30 platform creditors - integrated into `pnpm e2e setup`)
4. ✅ Verify seeding workflow (schemas created, global creditors seeded)
5. ✅ Create test CSV files (exact matches + realistic variations)
6. 🔄 Test import flow with CSV data
7. 🔄 Wire frontend UI components (CreditorMaster, CreditorResolver)

---

## 📋 Document Purpose

This document defines the approved architecture and implementation strategy for the **Creditor Master + Vertex AI Entity Resolution** feature. It serves as:

1. **Decision Record:** Why we chose Global/Local architecture over single-entity
2. **Implementation Guide:** Step-by-step checklist for development
3. **Quality Assurance:** Success criteria and testing requirements
4. **Post-Launch Reference:** Will be rewritten as pure architecture doc after completion

---

## 🎯 Executive Summary

### The Problem
Debt collection agencies import creditor data from multiple sources, leading to:
- Duplicate creditor records ("Chase Bank", "JPM Chase", "JPMorgan Chase N.A.")
- Poor data hygiene (missing EINs, incomplete addresses)
- Manual cleanup costing 5-10 hours/week per agency
- Analytics corruption (debts split across duplicate creditors)

### The Solution
**AI-Augmented Entity Resolution with Human-in-the-Loop Approval**

- **Vertex AI Matching:** Semantic entity resolution (95%+ accuracy)
- **Global Gold List:** Platform-maintained source of truth for top 500 creditors
- **Green Strip UI:** Bulk approval for high-confidence matches (95-100%)
- **Noise Floor:** Silent auto-create for <40% matches (no alert fatigue)
- **Trust-First Philosophy:** AI suggests, human decides (never auto-merge)

### Business Impact
- ⏱️ **Time Savings:** 80% reduction in manual creditor cleanup (10 hrs/week → 2 hrs/week)
- 📊 **Data Quality:** 95%+ creditor hygiene scores across all agencies
- 🎯 **Accuracy:** 98% match accuracy for top 500 creditors (Gold List)
- 🔒 **Compliance:** Full audit trail for every merge decision

---

## 🏗️ Architectural Decisions

### Decision 1: Global/Local Schema (Not Phased Migration)

#### ❌ REJECTED: Single Entity with Phased Migration
```typescript
// Bad: Single table, migrate later
@Entity('creditors')
class Creditor {
  organizationId: string
  legalName: string
  isMasterRecord: boolean
  // Problem: No global intelligence, migration nightmare after 50+ tenants
}
```

**Why Rejected:**
- Migration after 50+ tenants with divergent data = **impossible**
- Each org reinvents the wheel (Agency A's "Chase" cleanup doesn't help Agency B)
- AI can't learn cross-tenant patterns
- Technical debt compounds over time

#### ✅ APPROVED: Global/Local Architecture from Day 1
```typescript
// Good: Two tables, correct from start
@Entity('global_creditors')
class GlobalCreditor {
  id: string
  canonicalName: string // "JPMorgan Chase N.A."
  verifiedEIN: string
  knownAliases: string[] // ["JPM", "Chase Bank"]
  isReferenceOnly: boolean // TRUE for Gold List
}

@Entity('creditors') // Now: OrganizationCreditor
class Creditor {
  organizationId: string
  legalName: string
  globalCreditorId?: string // FK to GlobalCreditor
  isPlatformVerified: boolean
}
```

**Why Approved:**
- **Zero Migration Risk:** FK exists from Day 1
- **Cross-Tenant Intelligence:** Platform learns from all agencies
- **Privacy Isolation:** Global list is public data (banks), not tenant secrets
- **Future-Proof:** Enables "Use Platform Data" features later

**Trade-off Accepted:**
- More complex schema (2 tables vs 1)
- Requires JOIN queries (acceptable performance cost)
- Need to seed/maintain Global list

---

### Decision 2: Static Gold List (Not Cross-Tenant Learning)

#### ❌ REJECTED: Full AI Crowd-Sourcing (Phase 2 Scope)
```typescript
// Complex: Learn from all tenants
globalCreditor.confidenceScore = aggregateFromAllTenants();
globalCreditor.usageCount = countLinkedOrganizations();
// Problem: Privacy concerns, complex implementation
```

**Why Deferred:**
- Privacy review required (can other agencies see my creditor list?)
- Requires ML pipeline infrastructure (data warehouse, model training)
- Unknown if agencies want this feature
- Over-engineering before validation

#### ✅ APPROVED: Static Gold List (Platform-Seeded)
```typescript
// Simple: Static list of top 500 creditors
const goldList = [
  { name: "JPMorgan Chase N.A.", ein: "12-3456789", aliases: ["JPM", "Chase Bank"] },
  { name: "Bank of America N.A.", ein: "98-7654321", aliases: ["BofA", "BoA"] },
  // ... 498 more
];
```

**Why Approved:**
- **80/20 Rule:** Top 500 creditors cover 80% of all debt imports
- **Zero Privacy Risk:** Public data (major banks/debt buyers)
- **Low Complexity:** Just seed a table, no AI training needed
- **Dogfooding:** ui-platform uploads/manages list before customer launch

**Future Path (Post-MVP):**
- Phase 2: Add crowd-sourced confidence scoring
- Phase 3: ML pipeline for automatic alias detection

---

### Decision 3: Human-in-the-Loop (Not Auto-Resolve)

#### ❌ REJECTED: Auto-Merge High Confidence Matches
```typescript
// Bad: AI decides
if (confidence >= 0.90) {
  autoMerge(duplicate, master); // 🚨 Black Box anxiety
}
```

**Why Rejected:**
- **User Research:** "AI Black Box" is #1 concern in debt collection
- **Legal Liability:** System error = class action lawsuit
- **Trust Erosion:** Managers want agency (control)

#### ✅ APPROVED: Green Strip Bulk Approval
```typescript
// Good: AI suggests, human decides
if (confidence >= 0.95) {
  showGreenStrip(suggestions); // User clicks "Approve All"
}
```

**Why Approved:**
- **User Agency:** Manager feels in control ("I approved this")
- **Efficiency:** One click to approve 50 matches (vs manual entry)
- **Audit Trail:** Every decision logged with user attribution
- **Trust Building:** "AI suggests, I decide" = collaborative intelligence

**UX Implementation:**
```
┌─────────────────────────────────────────────────────────┐
│ ✓ High Confidence Matches (14)                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ 🛡️ Platform verified creditors from Gold List          │
│                                                         │
│ "JPM Chase"      →  JPMorgan Chase N.A.  [97.3%]      │
│ "Chase Bank"     →  JPMorgan Chase N.A.  [99.1%]      │
│ "BofA"           →  Bank of America N.A. [96.8%]      │
│                                                         │
│ [✓ Verify & Accept All (14) Suggestions]              │
└─────────────────────────────────────────────────────────┘
```

---

### Decision 4: Confidence Thresholds & Noise Floor

#### ✅ APPROVED: Four-Tier Resolution Strategy

```
95-100%: 🟢 Green Strip (Bulk approve available)
70-94%:  🟡 Amber Zone (Individual review required)
40-69%:  🔴 Red Zone (Confirm new creditor creation)
<40%:    ⚫ Noise Floor (Silent auto-create, no conflict)
```

**Rationale:**

**Green Strip (95-100%):**
- Platform Verified (linked to Gold List)
- High confidence, low risk
- Batch approval saves 90% of time

**Amber Zone (70-94%):**
- Borderline matches need human judgment
- Show confidence score, let user decide
- Example: "FNB California" vs "First National Bank of California"

**Red Zone (40-69%):**
- Low confidence, likely different creditor
- Ask user to confirm new creation
- Example: "Regional Paving Co." vs "Regal Cinemas" (62% similarity)

**Noise Floor (<40%):**
- Obviously different creditors
- Don't spam user with false matches
- Example: "Regional Paving Co." vs "JPMorgan Chase" (10% similarity)

**Why 40% Threshold:**
- Below 40%, matches are statistical noise
- User Research: Alert fatigue when every new creditor triggers conflict
- "Quiet Power" philosophy: Only escalate real decisions

---

### Decision 5: EIN Match = Critical Audit (Not Auto-Merge)

#### ❌ REJECTED: Force EIN Merges
```typescript
// Bad: Force merge on EIN match
if (ein === existingCreditor.ein) {
  forceAutoMerge(); // 🚨 Breaks legitimate use cases
}
```

**Why Rejected:**
- **Edge Case:** Same EIN, different business units ("Chase Pre-Legal" vs "Chase Post-Judgment")
- **User Resentment:** Blocking legitimate workflows breeds resistance
- **Regulatory:** Some reporting requires separate records per desk

#### ✅ APPROVED: EIN Override Modal (Hard Audit)
```typescript
// Good: Allow override with documented reason
if (ein === existingCreditor.ein && userRejects) {
  showEinOverrideModal({
    requireReason: [
      'Distinct Legal Strategy',
      'Different Portfolio/Desk',
      'Client Reporting Requirement',
      'Other (explain)'
    ]
  });
}
```

**Modal UX:**
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Critical: EIN Match Detected                        │
│                                                         │
│ The EIN (12-3456789) exactly matches:                  │
│ ┌─────────────────────────────────────────────────┐   │
│ │ JPMorgan Chase N.A.                             │   │
│ │ EIN: 12-3456789                                 │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ⚠️ Creating a duplicate may break regulatory reporting │
│                                                         │
│ Reason for Override (Required):                        │
│ [Select: Distinct Legal Strategy            ▼]        │
│                                                         │
│ [Cancel]  [Create Duplicate Anyway]                   │
└─────────────────────────────────────────────────────────┘
```

**Audit Log Entry:**
```json
{
  "eventType": "CREDITOR_EIN_OVERRIDE",
  "severity": "HIGH",
  "userId": "user-123",
  "meta": {
    "existingCreditor": "JPMorgan Chase N.A.",
    "newCreditor": "Chase Pre-Legal Dept",
    "sharedEIN": "12-3456789",
    "overrideReason": "DISTINCT_LEGAL_STRATEGY",
    "aiConfidence": 0.99
  }
}
```

---

### Decision 6: Temp Creditor Pattern (Deferred Merge)

#### ✅ APPROVED: Create Temp → Merge Later

**Why:**
- **Non-Blocking Imports:** Debt import succeeds even if AI unavailable
- **Async Conflict Resolution:** User processes conflicts in batches
- **Performance:** Import doesn't wait for AI/user decisions

**Data Hygiene Protection:**

1. **Visual Indicators:**
   - Badge: `🟡 Unverified` on all temp creditors
   - Debt Detail: Warning banner "This debt is assigned to unverified creditor"

2. **Escalation Inbox Persistence:**
   - Non-dismissible item: "14 Unverified Creditors Need Review"
   - Priority: Impact-based (# of debts affected)

3. **Hygiene Score Penalty:**
   - Temp creditors lower org hygiene score
   - Control Tower widget shows: "72% - Needs Attention"

**Implementation:**
```typescript
@Column({ type: 'boolean', default: false })
hasUnresolvedConflict: boolean;

// Set to TRUE when creating temp creditor
// Set to FALSE when conflict resolved
```

---

## 📊 Data Architecture

### Schema Overview

```
┌─────────────────────────────────────────────────────────┐
│                   global_creditors                      │
│  (Platform-owned, no organizationId)                    │
├─────────────────────────────────────────────────────────┤
│ • id (UUID)                                             │
│ • canonical_name (VARCHAR UNIQUE)                       │
│ • verified_ein (VARCHAR UNIQUE)                         │
│ • known_aliases (TEXT[])                                │
│ • is_reference_only (BOOLEAN - TRUE for Gold List)      │
│ • industry (VARCHAR)                                    │
│ • created_by_platform_user_id (UUID)                    │
└─────────────────────────────────────────────────────────┘
                          ↑
                          │ FK: global_creditor_id
                          │
┌─────────────────────────────────────────────────────────┐
│                      creditors                          │
│  (Organization-owned, tenant isolated)                  │
├─────────────────────────────────────────────────────────┤
│ • id (UUID)                                             │
│ • organization_id (UUID) ← Tenant isolation             │
│ • legal_name (VARCHAR)                                  │
│ • ein (VARCHAR)                                         │
│ • global_creditor_id (UUID, nullable) ← Platform link   │
│ • is_platform_verified (BOOLEAN)                        │
│ • global_link_confidence (FLOAT)                        │
│ • has_unresolved_conflict (BOOLEAN)                     │
│ • is_master_record (BOOLEAN)                            │
│ • master_creditor_id (UUID, nullable) ← Local dedup     │
└─────────────────────────────────────────────────────────┘
```

### Resolution Flow

```
┌─────────────────┐
│ Import Debt     │
│ "JPM Chase"     │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ Step 1: Check Global Gold List (EIN match)      │
│ ✓ Found: "JPMorgan Chase N.A." (EIN: 12-34...)  │
└────────┬────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ Step 2: Check Org Has Local Linked to Global    │
│ ✗ Not Found                                      │
└────────┬────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ Step 3: Create Conflict (HIGH_CONFIDENCE)        │
│ • Raw Name: "JPM Chase"                          │
│ • Suggested: Global ID 101                       │
│ • Confidence: 1.0 (EIN match)                    │
│ • Is Platform Match: TRUE                        │
└────────┬────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ Step 4: Create Temp Local Creditor              │
│ • legal_name: "JPM Chase"                        │
│ • has_unresolved_conflict: TRUE                  │
│ • global_creditor_id: NULL (pending approval)    │
└────────┬────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ Import Succeeds → 100 debts linked to temp      │
└─────────────────────────────────────────────────┘

         [User Reviews Conflict Later]
                      │
                      ↓
         ┌────────────────────────┐
         │ User Approves Merge    │
         └────────┬───────────────┘
                  │
                  ↓
         ┌────────────────────────────────────────┐
         │ Update Local Creditor:                 │
         │ • global_creditor_id: 101              │
         │ • is_platform_verified: TRUE           │
         │ • has_unresolved_conflict: FALSE       │
         │ Mark Conflict: RESOLVED                │
         └────────────────────────────────────────┘
```

---

## 🛠️ Implementation Checklist

### Phase 1: Backend Foundation (api-debts)

#### 1.1 Database Schema ⚠️ Deferred (TypeORM Auto-Sync)

> **Note:** Migrations deferred - using TypeORM `synchronize: true` in dev. Tables auto-created from entities. Production migrations can be generated later if needed.

- [ ] Create `global_creditors` table migration (DEFERRED - entity created ✅)
  - [x] Schema: id, canonical_name, verified_ein, known_aliases, is_reference_only
  - [x] Indexes: ein, canonical_name
  - [ ] Seed script for Gold List (top 500 creditors)

- [ ] Alter `creditors` table migration (DEFERRED - entity updated ✅)
  - [x] Add `global_creditor_id` (UUID, nullable, FK)
  - [x] Add `is_platform_verified` (BOOLEAN, default FALSE)
  - [x] Add `global_link_confidence` (FLOAT, nullable)
  - [x] Add `has_unresolved_conflict` (BOOLEAN, default FALSE)
  - [x] Add `hygiene_score` (INTEGER, nullable)
  - [x] Add FK constraint to global_creditors

- [ ] Create `creditor_conflicts` table migration (DEFERRED - entity created ✅)
  - [x] Schema: id, organization_id, raw_creditor_name, normalized_name
  - [x] AI fields: suggested_master_ids (JSONB), confidence_scores (JSONB), ai_match_reason
  - [x] Resolution: status (enum), resolved_by_user_id, resolved_at, resolution (JSONB)
  - [x] Metadata: is_platform_match (BOOLEAN), debt_count, total_principal_affected
  - [x] Indexes: (organization_id, status), organization_id

#### 1.2 Entities & DTOs ✅ COMPLETE

- [x] Create `GlobalCreditor` entity
  - [x] TypeORM entity with relations
  - [x] Validation decorators
  - [x] Location: `apps/api-debts/src/creditors/entities/global-creditor.entity.ts`

- [x] Update `Creditor` entity
  - [x] Add global link fields (globalCreditorId, isPlatformVerified, globalLinkConfidence, hasUnresolvedConflict, hygieneScore)
  - [x] Add @ManyToOne relation to GlobalCreditor (implicit via FK)

- [x] Create `CreditorConflict` entity
  - [x] Status enum: HIGH_CONFIDENCE | MEDIUM_CONFIDENCE | LOW_CONFIDENCE | RESOLVED | DISMISSED
  - [x] JSON fields for suggestions/scores
  - [x] Location: `apps/api-debts/src/creditors/entities/creditor-conflict.entity.ts`

- [x] Create Enums in `packages/enums/src/debts/`
  - [x] `CreditorConflictStatus` enum
  - [x] `ConflictResolutionAction` enum

- [x] Create DTOs
  - [x] `CreateCreditorDto` - legalName, ein?, dbaName?, address
  - [x] `UpdateCreditorDto` - PartialType(CreateCreditorDto)
  - [x] `MergeCreditorDto` - masterCreditorId, notes?
  - [x] `ResolveConflictDto` - action (MERGE | CREATE_NEW | DISMISS), targetMasterId?, targetGlobalId?, notes?
  - [x] `CreditorResponseDto` - Full creditor with computed fields
  - [x] `ConflictResponseDto` - Conflict with populated suggestions
  - [x] Location: `apps/api-debts/src/creditors/dto/`

#### 1.3 Vertex AI Service ✅ COMPLETE

- [x] Create `VertexAiEntityMatcherService`
  - [x] Initialize Gemini Flash client (vertex-ai SDK) - Placeholder for package installation
  - [x] Environment config: GCP_PROJECT_ID, VERTEX_AI_LOCATION, VERTEX_AI_MODEL, VERTEX_AI_ENABLED
  - [x] `matchCreditor(inputName, inputEin, inputAddress, candidates)` → Match[]
  - [x] Prompt engineering for entity resolution (buildPrompt method)
  - [x] Timeout: 5 seconds max
  - [x] Circuit breaker fallback to Levenshtein
  - [x] Error handling & logging
  - [x] Location: `apps/api-debts/src/creditors/ai/vertex-ai-entity-matcher.service.ts`

- [ ] Test fixtures
  - [ ] Mock Vertex AI responses
  - [ ] Test fallback behavior
  - [ ] Validate confidence score calibration

#### 1.4 Resolution Service Updates ✅ COMPLETE

- [x] Update `CreditorResolutionService.findOrCreate()`
  - [x] Step 1: Check Global Gold List (EIN match)
  - [x] Step 2: Check org has local linked to global
  - [x] Step 3: Vertex AI match against Global + org-local creditors (combined)
  - [x] Step 4: Four-tier confidence classification (95%/70%/40%/noise)
  - [x] Step 5: Apply noise floor (<40% = silent create)
  - [x] Step 6: Create conflict records with correct status
  - [x] Step 7: Create temp creditor (hasUnresolvedConflict = TRUE)
  - [x] Location: `apps/api-debts/src/creditors/creditor-resolution.service.ts`

- [x] Add `createConflictRecord()` helper (createConflict method)
  - [x] Store AI suggestions, scores, reasoning
  - [x] Flag if Platform match (vs local match)
  - [x] Link to source import job

- [x] Add temp/permanent creditor creation helpers
  - [x] `createTempCreditor()` - hasUnresolvedConflict = TRUE
  - [x] `createNewCreditor()` - hasUnresolvedConflict = FALSE
  - [x] Auto-link to Global when EIN match (handled in findOrCreate)
  - [x] Set isPlatformVerified = TRUE for global matches
  - [x] Set globalLinkConfidence from AI scores

#### 1.5 CRUD Controllers ✅ COMPLETE

- [x] `CreditorsController` - `/organizations/:orgId/creditors`
  - [x] GET / - List creditors (search, onlyMasters, pagination)
  - [x] GET /:id - Creditor detail
  - [x] POST / - Create creditor manually
  - [x] PATCH /:id - Update creditor
  - [x] DELETE /:id - Soft delete (validates no active debts)
  - [x] POST /:id/merge - Merge duplicate into master
  - [x] Permission guards: DEBTS_READ, DEBTS_WRITE, DEBTS_DELETE
  - [x] OpenAPI decorators (@ApiTags, @ApiOperation, @ApiResponse)
  - [x] Location: `apps/api-debts/src/creditors/creditors.controller.ts`

- [x] `CreditorConflictsController` - `/organizations/:orgId/creditor-conflicts`
  - [x] GET / - List conflicts (filter by status, impact-based sorting)
  - [x] GET /:id - Conflict detail with populated suggestions
  - [x] POST /:id/resolve - Resolve single conflict
  - [ ] POST /bulk-resolve - Resolve multiple conflicts (Green Strip) - Deferred to UI implementation
  - [x] Permission guards: DEBTS_READ, DEBTS_WRITE
  - [x] Location: `apps/api-debts/src/creditors/creditor-conflicts.controller.ts`

- [x] `InternalGlobalCreditorsController` - `/internal/global-creditors`
  - [x] POST /bulk-import - Upload Gold List CSV (placeholder)
  - [x] GET / - List all global creditors (placeholder)
  - [x] GET /:id - Global creditor detail (placeholder)
  - [x] PATCH /:id - Update global creditor (placeholder)
  - [x] Auth guards placeholder (requires PlatformAdminGuard implementation)
  - [x] Location: `apps/api-debts/src/creditors/internal/global-creditors.controller.ts`

#### 1.6 Services ✅ COMPLETE

- [x] `CreditorsService` enhancements
  - [x] Complete rewrite with Global/Local support
  - [x] `findAll()` with search and pagination
  - [x] `findById()` tenant-scoped
  - [x] `create()` manual creditor entry
  - [x] `update()` creditor editing
  - [x] `delete()` soft delete with debt validation
  - [x] `merge()` duplicate merge with debt reassignment
  - [x] `updateStats()` debt count and principal calculation
  - [x] `calculateHygieneScore()` inline in creditor creation (EIN + address completeness)
  - [x] Location: `apps/api-debts/src/creditors/creditors.service.ts`

- [x] `CreditorConflictsService` (new - replaces ConflictResolutionService)
  - [x] `findAll()` with status filtering and impact-based sorting
  - [x] `findById()` conflict detail
  - [x] `resolve()` single conflict resolution
  - [x] MERGE: Update local creditor, link to global/master, reassign debts
  - [x] CREATE_NEW: Confirm temp creditor as permanent, mark conflict resolved
  - [x] DISMISS: Mark conflict as dismissed (reopenable)
  - [x] Audit trail via resolvedByUserId and resolution JSON
  - [x] Location: `apps/api-debts/src/creditors/creditor-conflicts.service.ts`

- [ ] `BulkConflictService` (deferred)
  - [ ] `bulkResolve(conflictIds[], userId, auditContext)` - Can be added to CreditorConflictsService
  - [ ] Validate all conflicts are HIGH_CONFIDENCE
  - [ ] Transaction: All-or-nothing merge
  - [ ] Return summary: merged count, debts reassigned count
  - [ ] Undo capability (30-second window)

#### 1.7 Tests ✅ Ready for Implementation

- [ ] Unit tests: `VertexAiEntityMatcherService`
  - [ ] Mock Vertex AI API responses
  - [ ] Test fallback to Levenshtein
  - [ ] Test timeout handling
  - [ ] Test confidence score mapping

- [ ] Unit tests: `CreditorResolutionService`
  - [ ] Test Global EIN match
  - [ ] Test noise floor (<40%)
  - [ ] Test conflict creation logic
  - [ ] Test temp creditor creation

- [ ] Integration tests: `CreditorsController`
  - [ ] CRUD operations with permission guards
  - [ ] Merge operation reassigns debts
  - [ ] Soft delete doesn't affect linked debts

- [ ] Integration tests: `CreditorConflictsController`
  - [ ] List filters by status
  - [ ] Resolve creates audit log
  - [ ] Bulk resolve validates confidence
  - [ ] EIN override requires reason

- [ ] E2E tests: Full import → conflict → merge flow
  - [ ] Import CSV with duplicate creditors
  - [ ] Verify conflicts created
  - [ ] Approve via Green Strip
  - [ ] Verify debts reassigned correctly

---

### Phase 2: OpenAPI & Code Generation

#### 2.1 OpenAPI Spec Generation ✅ Ready for Implementation

- [ ] Run `npm run openapi:generate` in api-debts
- [ ] Verify `/apps/docs/openapi/openapi-debts.json` updated
- [ ] Validate tags: "Creditors", "Creditor Conflicts", "Global Creditors"
- [ ] Verify DTOs documented with examples

#### 2.2 Orval Code Generation ✅ Ready for Implementation

- [ ] Run `npm run orval:generate` in ui-organizations
- [ ] Verify generated files:
  - [ ] `/api/generated/debts/endpoints/creditors.ts`
  - [ ] `/api/generated/debts/endpoints/creditor-conflicts.ts`
  - [ ] `/api/generated/debts_models/*.ts`
- [ ] Commit generated files to version control

---

### Phase 3: Frontend - Data Layer (ui-organizations)

#### 3.1 Custom Hooks ✅ Ready for Implementation

- [ ] Create `useCreditors.ts`
  - [ ] `useCreditors(search?, onlyMasters?)` - Query hook
  - [ ] `useCreditorDetail(id)` - Single creditor query
  - [ ] `useCreateCreditor()` - Mutation with invalidation
  - [ ] `useUpdateCreditor()` - Mutation
  - [ ] `useMergeCreditor()` - Mutation with optimistic update
  - [ ] `useDeleteCreditor()` - Soft delete mutation

- [ ] Create `useCreditorConflicts.ts`
  - [ ] `useCreditorConflicts(status?)` - Query with 10s polling
  - [ ] `useConflictDetail(id)` - Single conflict query
  - [ ] `useResolveConflict()` - Mutation
  - [ ] `useBulkResolveConflicts()` - Bulk mutation
  - [ ] `useDismissConflict()` - Delete mutation
  - [ ] Query invalidation on success

- [ ] Create `useHygieneScore.ts`
  - [ ] `useOrganizationHygieneScore()` - Query hook
  - [ ] Refetch on conflict resolution

#### 3.2 Service Layer ✅ Ready for Implementation

- [ ] Update `creditorService.ts`
  - [ ] Wrap Orval-generated functions
  - [ ] Add error handling
  - [ ] Add request/response interceptors

---

### Phase 4: Frontend - UI Layer (ui-organizations)

#### 4.1 CreditorMaster Component ✅ Ready for Implementation

- [ ] Wire to `useCreditors()` hook
  - [ ] Remove hardcoded mock data
  - [ ] Add loading skeleton (shimmer effect)
  - [ ] Add error boundary with retry
  - [ ] Add pagination controls
  - [ ] Add search with 300ms debounce

- [ ] Add conflict count display
  - [ ] Query `useCreditorConflicts('PENDING')`
  - [ ] Update "Vertex AI identified X duplicates" text
  - [ ] Link to resolver tab

- [ ] Platform Verified badges
  - [ ] Show `🛡️ Platform Verified` for isPlatformVerified creditors
  - [ ] Tooltip: "Matched to platform Gold List"

- [ ] Hygiene score widget
  - [ ] Query `useOrganizationHygieneScore()`
  - [ ] Display badge: Excellent (90%+), Good (80-89%), Fair (70-79%), Needs Attention (<70%)
  - [ ] Progress bar visualization
  - [ ] Link to hygiene tab if <80%

- [ ] Empty states
  - [ ] No creditors: "Import debts to populate registry"
  - [ ] No conflicts: "All creditors verified ✓"

#### 4.2 CreditorResolver Component ✅ Ready for Implementation

- [ ] Wire to `useCreditorConflicts()` hook
  - [ ] Remove hardcoded mock data
  - [ ] Real-time updates (10s polling)
  - [ ] Loading states

- [ ] Green Strip UI (HIGH_CONFIDENCE)
  - [ ] Header: Count, Platform Verified indicator
  - [ ] Compact list: Input → Suggested Master → Confidence %
  - [ ] "Verify & Accept All (X) Suggestions" button
  - [ ] Hook to `useBulkResolveConflicts()`
  - [ ] Optimistic update (remove from queue immediately)
  - [ ] Toast with Undo button (30s window)

- [ ] Amber Zone UI (MEDIUM_CONFIDENCE)
  - [ ] Card layout: One conflict per card
  - [ ] Side-by-side comparison: Raw input | AI Suggestions
  - [ ] Individual approve/reject buttons
  - [ ] Confidence score badge

- [ ] Red Zone UI (LOW_CONFIDENCE)
  - [ ] Warning indicator
  - [ ] "Confirm New Creditor" workflow
  - [ ] Show why match is weak

- [ ] EIN Override Modal
  - [ ] Trigger when user rejects EIN match
  - [ ] Show existing creditor with matching EIN
  - [ ] Require reason selection (dropdown)
  - [ ] "Other" requires text explanation
  - [ ] "Create Duplicate Anyway" button (destructive variant)
  - [ ] Audit log backend call

- [ ] Progress indicator
  - [ ] "Reviewing 1 of 14 conflicts"
  - [ ] Next/Previous navigation
  - [ ] Keyboard shortcuts: Enter (approve top), Esc (skip)

- [ ] Empty states
  - [ ] No conflicts: Success celebration with checkmark
  - [ ] All resolved: "Great work! All creditors verified."

#### 4.3 Control Tower Widget ✅ Ready for Implementation

- [ ] Add Data Hygiene card
  - [ ] Display hygiene score with badge
  - [ ] Progress bar
  - [ ] Warning if <80%: "Review X potential duplicates"
  - [ ] Link to creditor resolver

#### 4.4 Escalation Inbox Item ✅ Ready for Implementation

- [ ] Add "Creditor Conflicts" escalation
  - [ ] Query conflict count and impacted debt count
  - [ ] Priority logic:
    - [ ] HIGH: Platform matches >10 OR debts affected >1000
    - [ ] MEDIUM: Platform matches >0 OR debts affected >100
    - [ ] LOW: Local matches only
  - [ ] Title: "X Unverified Creditors (Y match Gold List)"
  - [ ] Description: "Z debts awaiting verification"
  - [ ] Non-dismissible
  - [ ] Link to `/inventory/creditors?tab=resolving`

#### 4.5 Creditor Badges (Shared Component) ✅ Ready for Implementation

- [ ] Create `CreditorBadge.tsx`
  - [ ] Unverified (hasUnresolvedConflict): 🟡 Warning badge
  - [ ] Platform Verified (isPlatformVerified): 🟢 Success badge with shield icon
  - [ ] EIN Verified (einVerified): 🟢 Success badge
  - [ ] Pending: 🔵 Secondary badge

- [ ] Use throughout app
  - [ ] Debt Detail view
  - [ ] Portfolio Detail view
  - [ ] Creditor Master table
  - [ ] Search results

#### 4.6 Tests ✅ Ready for Implementation

- [ ] Unit tests: Components
  - [ ] CreditorMaster renders list from API
  - [ ] CreditorResolver shows Green Strip
  - [ ] EIN Override Modal validates reason
  - [ ] Badges display correct variants

- [ ] Integration tests: Workflows
  - [ ] Search filters creditors
  - [ ] Bulk approve triggers mutation
  - [ ] Undo reverts merge
  - [ ] Keyboard shortcuts work

---

### Phase 5: Frontend - Platform Admin (ui-platform)

#### 5.1 Global Creditor Manager ✅ Ready for Implementation

- [ ] Create `GlobalCreditorManager.tsx`
  - [ ] Route: `/platform/global-creditors`
  - [ ] Permission: PLATFORM_ADMIN only

- [ ] Bulk Upload UI
  - [ ] File upload: CSV format
  - [ ] Columns: canonical_name, verified_ein, known_aliases (pipe-separated), industry
  - [ ] Validation preview before import
  - [ ] Progress bar during upload
  - [ ] Summary: X created, Y updated, Z errors

- [ ] Gold List Table
  - [ ] Columns: Canonical Name, EIN, Aliases, Industry, Usage Count
  - [ ] Usage Count: How many orgs linked to this global
  - [ ] Actions: Edit, View Usage, Delete
  - [ ] Search/filter by name or industry
  - [ ] Pagination

- [ ] Edit Global Modal
  - [ ] Update name, EIN, aliases
  - [ ] Add/remove aliases
  - [ ] Industry dropdown
  - [ ] Version history

- [ ] View Usage Modal
  - [ ] List all organizations linked to this global
  - [ ] Show their local creditor names
  - [ ] Link confidence scores
  - [ ] Last linked date

#### 5.2 Gold List Seed Data ✅ COMPLETE (v0.1)

**Status:** Gold List v0.1 created and integrated into `pnpm setup` workflow

- [x] Create seed script (v0.1 - Preliminary Testing)
  - [x] File: `e2e/seeding/core/global-creditors.seed.ts`
  - [x] 30 platform creditors across 9 industry tiers
  - [x] Verified EINs for major national institutions
  - [x] Known aliases for semantic matching
  - [x] Idempotent (upsert by verified_ein)

**Gold List v0.1 Coverage (30 Creditors):**
- Tier 1: Major National Banks (5) - Chase, BofA, Wells Fargo, Citi, US Bank
- Tier 2: Credit Card Issuers (4) - Capital One, Discover, Amex, Synchrony
- Tier 3: Auto Finance (3) - Ally, Toyota Credit, Ford Credit
- Tier 4: Telecommunications (5) - Verizon, AT&T, T-Mobile, Comcast, Spectrum
- Tier 5: Utilities (5) - ComEd, PG&E, FPL, Con Edison, Duke Energy
- Tier 6: Healthcare (2) - HCA, Community Health Systems
- Tier 7: Student Loans (2) - Navient, Sallie Mae
- Tier 8: Retail (2) - Target, Macy's
- Tier 9: Debt Buyers (1) - Portfolio Recovery Associates

**Next Steps (v1.0 - Official Release):**
- [ ] Research top 500 creditors (Federal Reserve, Debt Buyers Assoc.)
- [ ] Verify all EINs against IRS Business Master File
- [ ] Add regional banks, credit unions, regional utilities
- [ ] Create platform admin UI for Gold List maintenance

---

### Phase 6: Integration & Polish

#### 6.1 E2E Testing ✅ Ready for Implementation

- [ ] Scenario 1: Happy Path (Platform Match)
  - [ ] Import CSV with "JPM Chase Bank"
  - [ ] Verify conflict created (HIGH_CONFIDENCE, isPlatformMatch=TRUE)
  - [ ] Navigate to Creditor Resolver
  - [ ] See Green Strip with Platform Verified badge
  - [ ] Click "Approve All"
  - [ ] Verify debts reassigned
  - [ ] Verify conflict marked RESOLVED
  - [ ] Verify local creditor isPlatformVerified=TRUE

- [ ] Scenario 2: Manual Override
  - [ ] Import CSV with "Regional Medical Center"
  - [ ] AI suggests "Regional Health Systems" (85%)
  - [ ] User rejects in Amber Zone
  - [ ] Click "Create New"
  - [ ] Verify new master created
  - [ ] Verify conflict marked DISMISSED

- [ ] Scenario 3: EIN Override
  - [ ] Import CSV with "Chase Pre-Legal Dept" (EIN: 12-3456789)
  - [ ] System finds existing "JPMorgan Chase N.A." (same EIN)
  - [ ] User rejects match
  - [ ] EIN Override Modal appears
  - [ ] User selects "Distinct Legal Strategy"
  - [ ] Duplicate created with audit log

- [ ] Scenario 4: Noise Floor
  - [ ] Import CSV with "Bob's Bail Bonds"
  - [ ] No match above 40%
  - [ ] New creditor created silently (no conflict)
  - [ ] Verify hasUnresolvedConflict=FALSE

- [ ] Scenario 5: Bulk Undo
  - [ ] Approve 10 Green Strip conflicts
  - [ ] Toast appears with Undo button
  - [ ] Click Undo within 30 seconds
  - [ ] Verify merges reverted
  - [ ] Verify conflicts restored to PENDING

#### 6.2 Performance Testing ✅ Ready for Implementation

- [ ] Vertex AI timeout
  - [ ] Simulate 10-second API delay
  - [ ] Verify circuit breaker activates
  - [ ] Verify fallback to Levenshtein

- [ ] Large conflict queue
  - [ ] Create 500 conflicts
  - [ ] Verify UI remains responsive (virtualized list)
  - [ ] Bulk approve 100 conflicts
  - [ ] Verify transaction completes <5 seconds

- [ ] Hygiene score calculation
  - [ ] 10,000 creditors in single org
  - [ ] Calculate hygiene score
  - [ ] Target: <10 seconds

#### 6.3 Documentation ✅ Ready for Implementation

- [ ] Internal README
  - [ ] `/apps/api-debts/src/creditors/README.md`
  - [ ] Architecture overview
  - [ ] Vertex AI setup instructions
  - [ ] Environment variables
  - [ ] Resolution algorithm explanation
  - [ ] Gold List maintenance guide

- [ ] User Guide (Product Docs)
  - [ ] "How to Resolve Creditor Conflicts"
  - [ ] "Understanding the Green Strip"
  - [ ] "When to Override EIN Matches"
  - [ ] Screenshots and videos

- [ ] Update Product Checkpoint
  - [ ] `/PRODUCT-DESIGN-IMPLEMENTATION-CHECKPOINT-3.md`
  - [ ] Mark "Creditor Master & Resolver" as 100%
  - [ ] Remove from gaps section
  - [ ] Add completion date

#### 6.4 Monitoring & Observability ✅ Ready for Implementation

- [ ] Metrics
  - [ ] Vertex AI API call count/day
  - [ ] Vertex AI success rate
  - [ ] Fallback to Levenshtein count
  - [ ] Conflict resolution rate (resolved/created)
  - [ ] Average time to resolve conflict
  - [ ] Hygiene score distribution

- [ ] Alerts
  - [ ] Vertex AI failure rate >10%
  - [ ] Unresolved conflict count >100 per org
  - [ ] Hygiene score drops below 60%
  - [ ] GCP budget alert ($50/month threshold)

- [ ] Dashboards
  - [ ] Platform Admin: Global creditor usage heatmap
  - [ ] Platform Admin: Vertex AI performance
  - [ ] Per-Org: Creditor hygiene trends

---

## ✅ Success Criteria

### Functional Requirements

- [ ] **Import Flow:** Debt import succeeds even if Vertex AI unavailable
- [ ] **Conflict Creation:** 95%+ matches create HIGH_CONFIDENCE conflicts
- [ ] **Green Strip:** Batch approval works for 50+ conflicts
- [ ] **Platform Verification:** Creditors linked to Gold List show badge
- [ ] **EIN Override:** Duplicate EIN triggers modal with required reason
- [ ] **Noise Floor:** <40% matches create creditor silently (no conflict)
- [ ] **Hygiene Score:** Calculated daily, displayed in Control Tower
- [ ] **Escalation:** Unresolved conflicts appear in Escalation Inbox (non-dismissible)
- [ ] **Undo:** Bulk merge can be undone within 30 seconds
- [ ] **Audit Trail:** Every resolution logged with user ID and timestamp

### Performance Requirements

- [ ] **Vertex AI Latency:** P95 <5 seconds (or fallback)
- [ ] **Conflict Resolution:** Bulk merge of 100 conflicts <5 seconds
- [ ] **Hygiene Calculation:** 10,000 creditors <10 seconds
- [ ] **UI Responsiveness:** 500-item conflict list renders instantly (virtualized)

### Data Quality Requirements

- [ ] **Match Accuracy:** 98%+ for Gold List creditors (manual validation of 100 samples)
- [ ] **Hygiene Score:** 90%+ organizations achieve "Good" (80%+) score within 30 days
- [ ] **False Positives:** <2% of Green Strip suggestions rejected by users
- [ ] **Duplicate Prevention:** <1% duplicate creditors after conflict resolution

### User Adoption Requirements

- [ ] **Time Savings:** 80% reduction in manual creditor cleanup time (survey)
- [ ] **Trust Score:** >90% of users "trust AI suggestions" (survey after 30 days)
- [ ] **Resolution Rate:** >80% of conflicts resolved within 7 days of creation
- [ ] **Undo Usage:** <5% of bulk merges undone (indicates high confidence)

---

## 🎯 Post-MVP Enhancements (Phase 2 Roadmap)

### Phase 2A: Cross-Tenant Learning (6-12 months)

**Prerequisites:**
- 20+ agencies actively using creditor resolution
- Legal/privacy review complete
- Data warehouse infrastructure deployed

**Features:**
- [ ] Crowd-sourced confidence scoring (aggregate from all tenants)
- [ ] `usageCount` field on GlobalCreditor (how many orgs linked)
- [ ] "Popular Match" indicator (used by 50+ agencies)
- [ ] Feedback loop: User rejections update model weights

### Phase 2B: Advanced Features (12-18 months)

- [ ] **Split Creditor:** Undo merge by moving debts to new creditor
- [ ] **Bulk Merge UI:** Select multiple local creditors, merge into one
- [ ] **Creditor Detail Page:** View all debts, edit contact info, upload contracts
- [ ] **Analytics Dashboard:** Top creditors by collection rate, geographic distribution
- [ ] **EIN Validation API:** IRS Business Master File integration
- [ ] **Alias Auto-Detection:** ML model suggests aliases based on import patterns

### Phase 2C: Event-Driven Architecture (18-24 months)

- [ ] Publish `CreditorMerged` event → Auto-update analytics
- [ ] Publish `ConflictCreated` event → Trigger Slack notification
- [ ] Publish `HygieneScoreChanged` event → Dashboard refresh
- [ ] Webhook support for external CRM sync

---

## 📊 Metrics to Track (Weekly)

### Development Velocity
- [ ] Features completed vs planned (this doc checklist)
- [ ] Blocker count and resolution time
- [ ] Test coverage % (target: 80%+)

### AI Performance
- [ ] Vertex AI success rate (target: 99%+)
- [ ] Average response time (target: <2s)
- [ ] Fallback rate (target: <1%)
- [ ] Cost per 1000 matches (target: <$1)

### User Engagement (Post-Launch)
- [ ] Daily active users in Creditor Resolver
- [ ] Conflicts created per day
- [ ] Conflicts resolved per day
- [ ] Time to first resolution (new org)

---

## 🚨 Risk Register

### Risk 1: Vertex AI Cost Overrun
**Likelihood:** Medium | **Impact:** Low
**Mitigation:**
- GCP budget alert at $50/month
- Cache results 24 hours (avoid re-matching)
- Batch API calls where possible
- Monitor cost per match (target: <$0.001)

### Risk 2: Gold List Maintenance Burden
**Likelihood:** Medium | **Impact:** Medium
**Mitigation:**
- Start with top 500 (covers 80% of imports)
- Automate alias detection in Phase 2
- Community contribution model (agencies suggest additions)
- Quarterly review by Platform Admins

### Risk 3: User Resistance to AI
**Likelihood:** Low | **Impact:** High
**Mitigation:**
- "Human-in-the-Loop" philosophy (AI suggests, user decides)
- Platform Verified badge builds trust
- Full audit trail for compliance
- Option to disable AI matching per-org (manual mode)

### Risk 4: Migration Complexity (RESOLVED)
**Likelihood:** N/A | **Impact:** N/A
**Resolution:** Built Global/Local schema from Day 1, no migration needed

---

## 📅 Timeline Estimate

**Total Effort:** 38.5 development hours (~5 days, 1 sprint)

| Phase | Duration | Blockers |
|-------|----------|----------|
| Phase 1: Backend Foundation | 20 hours | GCP access, Vertex AI API key |
| Phase 2: OpenAPI & Orval | 1 hour | Phase 1 complete |
| Phase 3: Frontend Data Layer | 2.5 hours | Phase 2 complete |
| Phase 4: Frontend UI Layer | 11 hours | Phase 3 complete |
| Phase 5: ui-platform | 4 hours | Gold List CSV prepared |
| Phase 6: Integration & Polish | 4 hours | All phases complete |

**Target Launch:** End of Sprint (2 weeks from start)

---

## 🔄 Document Status

**Current Version:** 1.0 (Implementation Strategy)
**Next Update:** Weekly during development
**Final Version:** 2.0 (Post-Launch Architectural Document)

**Change Log:**
- **v1.0 (Dec 27, 2025):** Initial approved strategy document created

**Review Schedule:**
- Weekly standup: Review completed checkboxes, update blockers
- Sprint retrospective: Document lessons learned
- Post-launch: Rewrite as architecture reference doc

---

**Approved By:** Product & Engineering Leadership
**Implementation Start Date:** TBD
**Questions/Concerns:** Discuss in #creditor-master-feature Slack channel
