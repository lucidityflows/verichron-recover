# The Inventory - MVP Gap Analysis & Strategic Roadmap

**Date:** January 9, 2026 (Updated after codebase audit)
**Domain:** Inventory (Portfolios, Ingestion, Segmentation, Creditors)
**App:** `ui-managers` / `api-debts` / `api-workflows` / `api-debtors`
**Status:** Audit Complete - Factual Assessment

---

## Executive Summary

After auditing the actual implementation, **the inventory features are 70-85% complete** with most core functionality already wired. The primary gaps are:
1. **Drill-down navigation** (portfolios → debtors)
2. **Chart integration** (D3 charts exist in `/legacy/reference`, need porting)
3. **Backend filtering** (portfolioId support in debtors API)
4. **Creditor detail view** (UI component missing)

**Key Finding:** The document's claim that ingestion "writes directly to live tables" is **incorrect**. A full staged import with dry-run (inspect → review → commit) is **already implemented and functional**.

---

## 1. Strategic Decisions Assessment

### 1.1 No "Delete" for Active Portfolios
**Current Implementation:** ✅ **ALREADY ENFORCED**
- Portfolios use soft delete pattern (`deletedAt` timestamp)
- Active portfolios cannot be deleted (status constraint in business logic)
- `CLOSED` status serves as archive state
- **Recommendation:** Current implementation is compliant. No changes needed.

### 1.2 The "Dry-Run" Import Architecture
**Current Implementation:** ✅ **FULLY IMPLEMENTED**

**Actual Flow:**
1. **Inspect** (`POST /organizations/:orgId/imports/inspect`):
   - Uploads file to `/uploads/temp/{orgId}/{tempFileId}.csv`
   - Returns headers and 10 preview rows
   - File remains in temporary staging area

2. **Map** (`IngestionMapper.tsx`):
   - UI displays CSV headers → Verichron field mapping
   - Semantic auto-matching with confidence scores
   - User confirms or adjusts mappings

3. **Repair** (`RepairShopGrid.tsx`):
   - Virtual scrolling grid (uses `@tanstack/react-virtual`)
   - Inline validation with error highlighting
   - AI suggestions for data repair (>95% confidence green strip)

4. **Commit** (`POST /organizations/:orgId/imports`):
   - References `tempFileId` and column mapping
   - Moves file from `/temp/` to `/uploads/{orgId}/{jobId}.csv`
   - Creates ImportJob (PENDING → PROCESSING → COMPLETED/FAILED)
   - Background processing with row-by-row validation

**Status:** ✅ **NO WORK NEEDED** - Staged import with dry-run exists and is functional.

**Existing Features:**
- ✅ Validation errors displayed with row/column context
- ✅ Partial success handling (processes valid rows, logs errors)
- ✅ Temp file TTL (48 hours auto-cleanup)
- ✅ Idempotency (tempFileId ensures no double-commits)
- ✅ Import job history with status tracking

### 1.3 High-Performance Drill-Down
**Current Implementation:** ⚠️ **PARTIALLY IMPLEMENTED**

**What Exists:**
- ✅ RepairShopGrid uses `@tanstack/react-virtual` for 1000+ row performance
- ✅ Server-side pagination in DebtorRegistry (15 items/page)
- ✅ Search functionality across first name, last name, email, phone

**Gaps:**
- ❌ PortfolioROIDashboard rows are NOT clickable (no navigation)
- ❌ DebtorRegistry does NOT accept `portfolioId` filter (backend gap)
- ❌ DebtorRegistry does NOT use virtualization (only pagination)

**Assessment:** Mixed implementation. Drill-down navigation is missing. Virtualization exists in RepairShop and must be implemented in DebtorRegistry per architectural requirements. Focus on drill-down navigation, backend portfolioId filtering, and virtualization implementation.

### 1.4 Visual Analytics (D3 Integration)
**Current Implementation:** ✅ **CHARTS EXIST, NOT YET INTEGRATED**

**D3 Charts Available** (`/apps/ui-managers/legacy/reference/`):
- ✅ `PortfolioPerformanceChart.tsx` - Multi-line time series with D3 axes
- ✅ `RecoveryTrendsChart.tsx` - Vintage analysis curves
- ✅ `SankeyChart.tsx` - Flow diagrams (workflow visualization)
- ✅ `USChoroplethMap.tsx` - Geographic heatmap with TopoJSON

**API Integration Available:**
- ✅ `analyticsService.getPortfolioPerformance()` - ROI, recovery rates, trends
- ✅ `usePortfolioPerformance()` hook - React Query wrapper with caching

**Status:** ⚠️ **INTEGRATION WORK NEEDED** - Charts and APIs exist, need to wire into PortfolioROIDashboard.

**Architecture Decision:** D3 is the required charting library. All visual analytics will use D3 v7.9.0 for consistency and advanced visualization capabilities.

### 1.5 Segmentation Strategy: "Review-Decide-Assign"
**Current Implementation:** ⚠️ **60% COMPLETE**

**What Exists:**
- ✅ PortfolioSegmentation UI with tranche management
- ✅ Auto-assignment rules connected to `useAutoAssignment()` hook
- ✅ Portfolio context panel with stats (Total Accounts, Coverage %)
- ✅ Segment list with filters, strategy type, active status

**Gaps:**
- ❌ No "Preview Segment" feature (real-time count before commit)
- ❌ No saved segments/templates
- ❌ Coverage calculation marked "Pending Sync"
- ❌ Segment actions tightly coupled to auto-assignment (no workflow/tag options)

**Recommendation:** Implement preview functionality first (highest ROI for user trust), then decouple segments from actions.

---

## 2. Component Audit & Factual Status

### 2.1 Portfolio ROI Dashboard (`PortfolioROIDashboard.tsx`)
**Status:** 🟡 **75% Complete (Wired + Functional)**

**✅ What's Working:**
- Connected to `usePortfolioPerformance()` hook (real API data)
- ROI metric cards: Total Net Recovery, Recovery Rate, Cost-to-Date, Face Value
- Portfolio performance matrix table with health indicators (PROFITABLE, ON_TRACK, UNDERPERFORMING)
- Trend arrows (up/down vs previous period)
- Edit portfolio modal integration
- Loading/error states

**❌ Critical Gaps:**
1. **Drill-Down Navigation:** Table rows NOT clickable. Missing:
   ```typescript
   onClick={() => navigate(`/inventory/debtors?portfolioId=${portfolio.id}`)}
   ```
2. **Visual Charts:** Recovery Curve and Composition Pie charts not integrated
3. **Filter/Export:** Buttons exist but have no handlers

**Files:** `/apps/ui-managers/src/features/inventory/PortfolioROIDashboard.tsx`

---

### 2.2 Ingestion Center (`IngestionCenter.tsx`)
**Status:** 🟢 **85% Complete (Fully Wired + Functional)**

**✅ What's Working:**
- Multi-step pipeline: UPLOADING → MAPPING → REPAIRING → OVERVIEW
- Real import job history with status badges (COMPLETED, PROCESSING, FAILED, PENDING)
- Live statistics: Total rows (30d), Auto-match rate, Active jobs count
- Connected to `useImportJobs()` hook with full CRUD operations
- Invitation wave feature (`invitePortfolioDebtors` mutation)
- Error handling with toast notifications
- **Staged Import:** Inspect → Map → Commit flow with tempFileId
- **Virtualized Grid:** RepairShopGrid uses `@tanstack/react-virtual` for 1000+ rows

**❌ Minor Gaps:**
- Filter/Export buttons in job history (placeholder implementations)

**Files:**
- `/apps/ui-managers/src/features/inventory/IngestionCenter.tsx`
- `/apps/ui-managers/src/features/inventory/components/IngestionMapper.tsx`
- `/apps/ui-managers/src/features/inventory/components/RepairShopGrid.tsx`
- `/apps/ui-managers/src/features/inventory/components/InvitationWave.tsx`

---

### 2.3 Debtor Registry (`DebtorRegistry.tsx`)
**Status:** 🟡 **85% Complete (Wired + Functional, Missing Backend Filter)**

**✅ What's Working:**
- Connected to `useProfilesControllerFindAll()` hook (real API data)
- Search across first name, last name, email, phone
- Filter system: Verification Status, User Account status
- Status badges: REGISTERED, INVITED, PENDING
- Manual debtor invitation with email validation
- Cool-down logic (7-day intervals for re-invites)
- Pagination (15 items/page, server-side)
- Loading/error states

**❌ Critical Gap:**
- **Backend API does NOT accept `portfolioId` query parameter**
  - Current filters: `firstName`, `lastName`, `verificationStatus`, `userId`, `organizationId`, `search`, `hasUserAccount`, `createdAfter`, `createdBefore`
  - Missing: `portfolioId` (needed for drill-down from PortfolioROIDashboard)

**❌ UX Gap:**
- No virtualization (only pagination). Acceptable for current use case.

**Files:**
- `/apps/ui-managers/src/features/inventory/DebtorRegistry.tsx`
- `/apps/api-debtors/src/profiles/dto/query-debtors.dto.ts` (needs portfolioId field)

---

### 2.4 Creditor Master (`CreditorMaster.tsx`)
**Status:** 🟡 **70% Complete (Wired + Functional, Missing Detail View)**

**✅ What's Working:**
- Connected to `useCreditors()` and `useCreditorConflicts()` hooks
- Search by Legal Name, EIN, Alias
- Hygiene Score calculation (verified count / total count)
- Stats: Master Records, Pending Conflicts
- High-density table: Legal Name, EIN, Status, Linked Debts
- "Resolve Duplicates" button triggers CreditorResolver UI
- AI-powered semantic resolution with confidence scores
- Realtime polling (refetch every 10s for conflicts)

**❌ Critical Gap:**
- **No Creditor Detail View:** External Link icon exists but has no handler. Missing:
  - Modal/page to view/edit creditor profile (EIN, addresses, contacts, linked debts)
  - Merge history and audit trail
  - Manual creditor creation form (currently only auto-created from imports)

**✅ Sub-Component (`CreditorResolver.tsx` - 80% Complete):**
- Interactive conflict resolution UI
- AI suggestions with match reasons
- Merge/Create-New/Dismiss actions
- Connected to `useResolveConflict()` mutation

**Files:**
- `/apps/ui-managers/src/features/inventory/CreditorMaster.tsx`
- `/apps/ui-managers/src/features/inventory/components/CreditorResolver.tsx`
- `/apps/ui-managers/src/features/inventory/hooks/useCreditors.ts`
- `/apps/ui-managers/src/features/inventory/hooks/useCreditorConflicts.ts`

---

### 2.5 Portfolio Segmentation (`PortfolioSegmentation.tsx`)
**Status:** 🟡 **60% Complete (Partially Wired)**

**✅ What's Working:**
- Connected to `useAutoAssignment()` hook
- Portfolio context panel with Active Portfolio selector
- Tactical segments list: Name, Strategy type, Filter summary, Active status
- Create/Edit segment modals
- Segmentation ROI metric (14% higher recovery rate message)

**❌ Gaps:**
1. Coverage calculation marked "Pending Sync" (backend not returning data)
2. No "Preview Segment" feature (can't see count before creating rule)
3. Segment actions tightly coupled to auto-assignment (no workflow/tag options)
4. No saved segment templates

**Files:**
- `/apps/ui-managers/src/features/inventory/PortfolioSegmentation.tsx`
- `/apps/ui-managers/src/features/inventory/hooks/useAutoAssignment.ts`

---

## 3. D3 Charts & Visualizations Status

### Available Charts (Ready for Integration)

**Location:** `/apps/ui-managers/legacy/reference/`

| Chart | File | Dependencies | API Data Source | Priority |
|-------|------|--------------|-----------------|----------|
| Portfolio Performance | `PortfolioPerformanceChart.tsx` | D3 v7 | `analyticsService.getPortfolioPerformance()` | HIGH |
| Recovery Trends | `RecoveryTrendsChart.tsx` | D3 v7 | `analyticsService.getPortfolioPerformance()` | HIGH |
| Sankey Flow | `SankeyChart.tsx` | d3-sankey | Workflow execution data | MEDIUM |
| US Choropleth Map | `USChoroplethMap.tsx` | D3 v7, topojson-client | Geographic analytics | LOW |

**Current Visualizations in ui-managers:**
- ✅ `LiquidationCurve.tsx` (Pure SVG, no D3) - 90% wired
- ✅ `VelocityGauge.tsx` (Pure React, no D3) - 80% wired
- ✅ `StaffHeatmap.tsx` (Pure React, no D3) - 70% wired (activity pulse uses mock data)

**Assessment:**
- D3 package (v7.9.0) is installed and ready for integration
- Most current visualizations use **pure React/SVG** (non-D3 simple visualizations)
- D3 is required for all chart implementations (architectural decision)
- Sankey flow uses d3-sankey (already have `d3-sankey@0.12.3`)

**Implementation Plan:**
1. Port `PortfolioPerformanceChart` and `RecoveryTrendsChart` to PortfolioROIDashboard (HIGH priority)
2. All future chart components will use D3 v7.9.0
3. Maintain consistency across all data visualizations

---

## 4. Implementation Plan (Revised & Prioritized)

### Phase 1: Core Navigation, Filtering & Virtualization (Immediate - 10-12 hours)

**Goal:** Enable portfolio → debtor drill-down with proper filtering and virtualization

1. **Backend (`api-debtors`)** - 2 hours
   - Add `portfolioId` field to `QueryDebtorsDto`
   - Update `ProfilesService.findAll()` to filter by portfolioId
   - Add SQL join to `debts` table where needed

2. **Frontend (`PortfolioROIDashboard`)** - 1 hour
   - Make table rows clickable
   - Navigate to `/inventory/debtors?portfolioId={id}` on row click
   - Add hover state for visual affordance

3. **Frontend (`DebtorRegistry` - Filtering)** - 2 hours
   - Read `portfolioId` from query params
   - Pass to `useProfilesControllerFindAll` hook
   - Display filter badge: "Filtered by: [Portfolio Name]" with clear button
   - Add breadcrumb: "All Portfolios > [Portfolio Name] > Debtors"

4. **Frontend (`DebtorRegistry` - Virtualization)** - 3-4 hours
   - Implement `@tanstack/react-virtual` for debtor table
   - Reference `RepairShopGrid.tsx` implementation pattern
   - Maintain existing pagination alongside virtualization
   - Ensure smooth scrolling for 1000+ rows
   - Test performance with large datasets

5. **Testing** - 2 hours
   - E2E test: Click portfolio → Verify debtors filtered correctly
   - E2E test: Verify virtualization with 1000+ debtors
   - Performance test: Measure scroll performance
   - Verify clear filter returns to full list

**Files to Modify:**
- `/apps/api-debtors/src/profiles/dto/query-debtors.dto.ts`
- `/apps/api-debtors/src/profiles/profiles.service.ts`
- `/apps/ui-managers/src/features/inventory/PortfolioROIDashboard.tsx`
- `/apps/ui-managers/src/features/inventory/DebtorRegistry.tsx`

---

### Phase 2: Visual Analytics Integration (Next Sprint - 7-8 hours)

**Goal:** Add Recovery Curve and Portfolio Performance charts to dashboard

**D3 Integration Steps:**
1. Copy `PortfolioPerformanceChart.tsx` from `/legacy/reference/` - 1 hour
2. Copy `RecoveryTrendsChart.tsx` from `/legacy/reference/` - 1 hour
3. Wire to `usePortfolioPerformance()` data - 2 hours
4. Add chart toggle UI (Table/Chart view switcher) - 1 hour
5. Responsive layout adjustments - 2 hours
6. Testing - 1 hour

**Architecture Note:** D3 v7.9.0 is the required charting library per architectural decision.

**Files to Create/Modify:**
- `/apps/ui-managers/src/features/inventory/components/PortfolioPerformanceChart.tsx` (new)
- `/apps/ui-managers/src/features/inventory/components/RecoveryTrendsChart.tsx` (new)
- `/apps/ui-managers/src/features/inventory/PortfolioROIDashboard.tsx` (integrate charts)

---

### Phase 3: Creditor Detail View (Next Sprint - 4-6 hours)

**Goal:** Complete creditor management with detail view/modal

1. **Create `CreditorDetailModal.tsx`** - 3 hours
   - Profile section: Legal Name, EIN, DBA, Verification status
   - Addresses section: Primary + alternate addresses with edit capability
   - Contacts section: Phone, email, contact person
   - Linked debts section: Table of debts using this creditor (click to navigate)
   - Merge history section: Audit trail of previous merges
   - Actions: Edit, Merge, Delete (soft delete)

2. **Wire to API** - 1 hour
   - `useCreditor(id)` hook for detail fetch
   - `useUpdateCreditor()` mutation for edits
   - `useMergeCreditor()` mutation for manual merges

3. **Navigation** - 0.5 hour
   - Make External Link icon in CreditorMaster table clickable
   - Open modal on click with creditor ID

4. **Testing** - 1 hour
   - E2E test: Click creditor → Modal opens → Edit field → Save → Verify update

**Files to Create/Modify:**
- `/apps/ui-managers/src/features/inventory/components/CreditorDetailModal.tsx` (new)
- `/apps/ui-managers/src/features/inventory/CreditorMaster.tsx` (wire click handler)

---

### Phase 4: Segmentation Enhancement (Future - 6-8 hours)

**Goal:** Implement "Preview Segment" before creating assignment rules

1. **Backend (`api-workflows` or `api-debts`)** - 2 hours
   - Create `POST /segments/preview` endpoint
   - Accepts filter criteria (balance, age, risk, etc.)
   - Returns count + sample records (first 10)

2. **Frontend (`PortfolioSegmentation`)** - 3 hours
   - Add "Preview" button in segment creation flow
   - Show count: "452 Accounts match these filters"
   - Show sample table (first 10 accounts)
   - Confirm modal: "Assign these 452 accounts to Team A?"

3. **Saved Segments** - 2 hours
   - Create `SavedSegments` component
   - Store segment definitions in backend
   - "Load Segment" dropdown to apply saved filters

4. **Testing** - 1 hour

**Files to Create/Modify:**
- `/apps/api-workflows/src/segments/segments.controller.ts` (new)
- `/apps/ui-managers/src/features/inventory/PortfolioSegmentation.tsx`
- `/apps/ui-managers/src/features/inventory/components/SavedSegments.tsx` (new)

---

## 5. Decisions & Recommendations

### ✅ Decisions That Are Correct

1. **Staged Import with Dry-Run:** ✅ Already implemented and working correctly
2. **No Delete for Active Portfolios:** ✅ Soft delete pattern enforced
3. **Review-Decide-Assign Flow:** ✅ Good UX pattern for segmentation

### 🏗️ Architectural Requirements

1. **Virtualization (@tanstack/react-virtual):**
   - Required for all high-density data grids (1000+ rows)
   - DebtorRegistry must implement virtualization alongside pagination
   - RepairShopGrid already uses virtualization (reference implementation)
   - **Status:** REQUIRED - not optional

2. **D3 for All Charts:**
   - D3 v7.9.0 is the required charting library
   - All visual analytics will use D3 for consistency
   - d3-sankey already installed for workflow diagrams
   - **Status:** REQUIRED - architectural decision

3. **Search Strategy:**
   - Current `search` parameter with ILIKE is sufficient for MVP
   - Add Elasticsearch only if performance degrades with 100k+ debtors
   - **Status:** Current implementation adequate

### 📋 Priority Order (Revised)

**High Priority (MVP Blockers):**
1. ✅ Staged import (DONE - already working)
2. 🔴 Portfolio → Debtor drill-down navigation
3. 🔴 Backend portfolioId filtering for debtors
4. 🔴 Creditor detail view/modal
5. 🔴 Virtualization for DebtorRegistry (architectural requirement)
6. 🔴 D3 chart integration in PortfolioROIDashboard (architectural requirement)

**Medium Priority (Strong UX Improvement):**
1. 🟡 Segment preview functionality
2. 🟡 Manual creditor creation form
3. 🟡 Additional D3 visualizations (Sankey, Choropleth)

**Low Priority (Nice to Have):**
1. ⚪ Saved segment templates
2. ⚪ Advanced search/autocomplete
3. ⚪ Additional chart types and analytics dashboards

---

## 6. Implementation Checklist

### Immediate Action Items (Phase 1)

- [ ] **Backend:** Add `portfolioId` to `QueryDebtorsDto` (`api-debtors`)
- [ ] **Backend:** Update `ProfilesService.findAll()` to filter by portfolioId
- [ ] **Frontend:** Make PortfolioROIDashboard rows clickable
- [ ] **Frontend:** Add portfolioId filtering to DebtorRegistry
- [ ] **Frontend:** Add breadcrumb/filter badge for portfolio drill-down
- [ ] **Frontend:** Implement virtualization in DebtorRegistry using `@tanstack/react-virtual`
- [ ] **Testing:** E2E test for drill-down flow
- [ ] **Testing:** Performance test for virtualization with 1000+ rows

### Next Sprint (Phase 2 & 3)

- [ ] **Frontend:** Integrate Portfolio Performance chart (D3 v7.9.0)
- [ ] **Frontend:** Integrate Recovery Trends chart (D3 v7.9.0)
- [ ] **Frontend:** Create CreditorDetailModal component
- [ ] **Frontend:** Wire creditor detail modal to API hooks
- [ ] **Frontend:** Make External Link icon clickable in CreditorMaster

### Future Enhancements (Phase 4)

- [ ] **Backend:** Create segment preview endpoint
- [ ] **Frontend:** Add segment preview UI with count + sample
- [ ] **Frontend:** Saved segments component
- [ ] **Review:** Segment vs Assignment decoupling architecture

---

## 7. Files Reference

### Inventory Features (All Wired)
- `/apps/ui-managers/src/features/inventory/IngestionCenter.tsx` (85% complete)
- `/apps/ui-managers/src/features/inventory/PortfolioROIDashboard.tsx` (75% complete)
- `/apps/ui-managers/src/features/inventory/DebtorRegistry.tsx` (85% complete)
- `/apps/ui-managers/src/features/inventory/CreditorMaster.tsx` (70% complete)
- `/apps/ui-managers/src/features/inventory/PortfolioSegmentation.tsx` (60% complete)

### Hooks (All Functional)
- `/apps/ui-managers/src/features/inventory/hooks/useImportJobs.ts`
- `/apps/ui-managers/src/features/inventory/hooks/usePortfolios.ts`
- `/apps/ui-managers/src/features/inventory/hooks/usePortfolioPerformance.ts`
- `/apps/ui-managers/src/features/inventory/hooks/useCreditors.ts`
- `/apps/ui-managers/src/features/inventory/hooks/useCreditorConflicts.ts`

### D3 Charts (Ready for Integration)
- `/apps/ui-managers/legacy/reference/PortfolioPerformanceChart.tsx`
- `/apps/ui-managers/legacy/reference/RecoveryTrendsChart.tsx`
- `/apps/ui-managers/legacy/reference/SankeyChart.tsx`
- `/apps/ui-managers/legacy/reference/USChoroplethMap.tsx`

### Backend APIs
- `/apps/api-debts/src/imports/imports.controller.ts` (Staged import - complete)
- `/apps/api-debts/src/imports/services/imports.service.ts` (Inspect/Create logic)
- `/apps/api-debtors/src/profiles/profiles.controller.ts` (Needs portfolioId filter)
- `/apps/api-debtors/src/profiles/dto/query-debtors.dto.ts` (Add portfolioId field)

---

## 8. Conclusion

**Overall Status:** The Inventory section is **70-85% complete** across all components. The major gaps are:
1. Navigation (drill-down from portfolios to debtors) - **3 hours**
2. Backend filtering (portfolioId in debtors API) - **2 hours**
3. **Virtualization (DebtorRegistry with @tanstack/react-virtual)** - **4 hours** (architectural requirement)
4. **D3 chart integration** (Portfolio Performance + Recovery Trends) - **7-8 hours** (architectural requirement)
5. Creditor detail view - **4-6 hours**

**Total estimated work to MVP completion:** ~24-27 hours (3-3.5 dev days)

**Key Architectural Requirements:**
- **D3 v7.9.0** is required for all data visualizations (not Recharts)
- **@tanstack/react-virtual** is required for high-density data grids

**Key Correction:** The staged import with dry-run is **already fully implemented** and does not need to be built. This removes 10-12 hours from the original estimate.
