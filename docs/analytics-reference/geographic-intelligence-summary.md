# Geographic Intelligence Platform - Implementation Summary

**Document Version:** 1.0
**Date:** October 1, 2025
**Related Docs:**
- `docs/api-contracts/company-analytics-geographic.api.md` (Full technical specification)
- `docs/demo-checklist.md` (Will be updated with this feature)

---

## Executive Summary

The **Geographic Intelligence Platform** is a high-priority feature that will transform the Company Analytics page into a best-in-class collections management dashboard. This system provides 8 distinct heat map visualizations showing spatial distribution of debtors, creditors, and behavioral patterns.

**Key Value Propositions:**
- 🗺️ Visualize debtor/creditor concentrations across US states
- 📊 Predictive analytics heat maps (likelihood to pay, default risk)
- 🎯 Portfolio-specific filtering by type and debt age
- 💡 Behavioral insights (payment plans, responsiveness, engagement)
- 🚀 Major "WOW factor" differentiator for demos

---

## Feature Scope

### 8 Heat Map View Modes

1. **Debtor Locations** - Geographic distribution of all debtors
2. **Original Creditor Locations** - Where debts originated (source analysis)
3. **Payment Plan Engagement** - Active & completed payment plans by state
4. **Responsiveness** - Contact response rates by location
5. **Likelihood to Pay** - Predictive score visualization (0-100)
6. **Default Risk** - Risk concentration heat map (0-100)
7. **Debt Age Distribution** - Aging receivables by state
8. **Combined Flow View** - Animated creditor→debtor state flows

### Advanced Filtering

- **Portfolio Filters:**
  - By ID (specific portfolio)
  - By name (search/autocomplete)
  - By type: Auto Loans, Credit Card, Medical Collections, Student Loans, Personal Loans, Utility, Telecom

- **Debt Age Filters:**
  - Bucket selection: 0-30, 31-60, 61-90, 91-180, 180-365, 365+ days
  - Custom range slider

- **Behavioral Filters:**
  - Has active payment plan
  - Responsiveness (responsive/unresponsive)
  - Likelihood score range (0-100)
  - Default risk threshold

---

## Critical Data Requirements

### Schema Changes (MUST IMPLEMENT FIRST)

#### 1. Portfolio Type Enum & Field
```sql
CREATE TYPE portfolio_type AS ENUM (
  'AUTO_LOAN', 'CREDIT_CARD', 'MEDICAL_COLLECTIONS',
  'STUDENT_LOAN', 'PERSONAL_LOAN', 'UTILITY', 'TELECOM'
);
ALTER TABLE portfolios ADD COLUMN portfolio_type portfolio_type;
```

#### 2. Debtor Behavioral Fields
```sql
ALTER TABLE debts ADD COLUMN has_active_payment_plan BOOLEAN DEFAULT false;
ALTER TABLE debts ADD COLUMN payment_plan_started_at TIMESTAMP;
ALTER TABLE debts ADD COLUMN payment_plan_completed_at TIMESTAMP;
ALTER TABLE debts ADD COLUMN last_contact_date TIMESTAMP;
ALTER TABLE debts ADD COLUMN contact_attempts INTEGER DEFAULT 0;
ALTER TABLE debts ADD COLUMN is_responsive BOOLEAN DEFAULT false;
ALTER TABLE debts ADD COLUMN likelihood_to_pay_score INTEGER CHECK (likelihood_to_pay_score BETWEEN 0 AND 100);
ALTER TABLE debts ADD COLUMN default_risk_score INTEGER CHECK (default_risk_score BETWEEN 0 AND 100);
```

### Mock Data Updates

**File:** `libs/dev-utils/src/fakerMockData.ts`

**Required Changes:**
1. **Coordinates** - Add `getStateCoordinates()` helper with all 50 US state centroids, populate lat/lng
2. **Portfolio Types** - Assign realistic distribution (40% credit card, 25% medical, etc.)
3. **Behavioral Data:**
   - Generate payment plan status (15-20% active)
   - Generate contact history and responsiveness
   - Generate likelihood_to_pay_score (weighted: 30% high, 50% medium, 20% low)
   - Generate default_risk_score (inverse correlation with likelihood)
4. **Original Creditor Addresses** - Ensure all `originalCreditorId` companies have addresses

---

## Implementation Phases

### Phase 1: Database Schema (8-12 hours) ⚠️ CRITICAL
- Create portfolio_type enum
- Add behavioral fields to debts table
- Create migration scripts
- Update TypeORM entities

### Phase 2: Mock Data Generation (16-24 hours) 🔨 HIGH PRIORITY
- State coordinate helper with 50 states
- Portfolio type distribution
- Behavioral scores with business logic
- Original creditor address linking

### Phase 3: TypeScript Interfaces (4-6 hours)
- Create `geographic-analytics.interfaces.ts`
- 9 interface types (one per view mode + combined)
- PortfolioType enum in shared-types

### Phase 4: Calculation Logic (20-30 hours) 🔨 HIGH PRIORITY
- Create `geographicMetrics.ts` utility
- 8 calculation functions (one per view mode)
- Update `useCompanyAnalytics` hook
- Add to data provider

### Phase 5: UI Components (40-60 hours) 🎨 COMPLEX
- Install `@nivo/geo` package
- **GeographicHeatMap** - Main map component
- **GeographicControls** - View/metric/filter selectors
- **GeographicInsightsPanel** - Top states + summary
- **GeographicDrilldownModal** - State detail view
- **SkeletonGeographicMap** - Loading state

### Phase 6: Integration & Polish (12-20 hours) 🎨 FINAL
- Add to CompanyAnalyticsPage (after Sankey)
- Animated state flows (optional)
- Export functionality
- Testing & validation

**Total Effort:** 100-152 hours (2-3 week sprint)

---

## Technical Stack

- **Mapping Library:** `@nivo/geo` (choropleth maps, consistent with Sankey)
- **Data Processing:** Client-side calculation utilities
- **Filtering:** React state + useMemo for performance
- **Styling:** Gradient card (blue/indigo/purple theme)
- **Animation:** Framer Motion (optional for flow view)

---

## Key Design Decisions

### 1. Behavioral Score Generation
**Decision:** Rule-based with weighted distributions
- Likelihood: Higher for recent payments, responsiveness
- Default Risk: Higher for older debt, non-responsive debtors
- Rationale: More realistic than pure random, simpler than ML

### 2. State Coordinates
**Decision:** Hardcode all 50 US states
- Lookup table with centroid lat/lng
- Small variance added for city-level realism
- Rationale: No external API dependency, sufficient for demo

### 3. Positioning on Page
**Decision:** After Sankey diagram
- Flow: Stats → Sankey (debt flows) → Geographic (spatial insights) → Tables
- Rationale: Both are major visual centerpieces

### 4. Drill-Down Pattern
**Decision:** Modal overlay (not new page)
- Keeps map context visible
- Faster interaction
- Shows state details, top debtors/creditors

### 5. Flow Visualization (Creditor→Debtor)
**Decision:** DEFER to v2 (post-MVP)
- Most complex feature (30-40 hours alone)
- Can ship impressive geographic platform without it
- Iterate based on demo feedback

---

## API Endpoints (Ready for Backend)

All endpoints documented in `docs/api-contracts/company-analytics-geographic.api.md`

**Base Pattern:** `GET /api/company/{companyId}/analytics/geography/{view-mode}`

**Endpoints:**
1. `/debtors` - Debtor locations with metrics
2. `/creditors` - Original creditor locations
3. `/payment-plans` - Payment plan engagement
4. `/responsiveness` - Contact response metrics
5. `/likelihood-to-pay` - Likelihood score distribution
6. `/default-risk` - Default risk distribution
7. `/debt-age` - Aging receivables
8. `/combined` - All data for flow visualization

**Shared Query Params:** portfolioId, portfolioName, portfolioType, debtAgeMin/Max, hasPaymentPlan, isResponsive, etc.

---

## Success Criteria

- [ ] All 8 view modes functional with realistic mock data
- [ ] Portfolio and age filters working correctly
- [ ] Heat map color scales meaningful and visually appealing
- [ ] State drill-down provides valuable detail
- [ ] Performance acceptable (< 2s to switch views)
- [ ] Zero duplication with existing code
- [ ] Documented for demo walkthrough
- [ ] Added to demo checklist as Action 3.8

---

## Demo Value Proposition

**For Stakeholders:**
- "Show me where our highest-risk debtors are concentrated"
- "Which states have the best recovery rates?"
- "Are medical debts performing better in certain regions?"
- "Where should we focus our next collection campaign?"

**Competitive Differentiation:**
- Most collection platforms have basic dashboards
- Geographic + behavioral + predictive analytics is rare
- Visual storytelling > spreadsheets
- Demonstrates platform sophistication

---

## Integration with Existing Work

### Builds On:
- Existing Sankey diagram implementation (`@nivo/sankey`)
- `useCompanyAnalytics` hook pattern
- AdvancedFilterPanel components
- CSV export utilities

### Complements:
- Action 2.6: Standardize Company pages (adds geographic dimension)
- Action 3.6: Sankey diagram (flow visualization, similar tech)
- Seeding strategy (requires enhanced mock data)

### Does NOT Conflict With:
- Multi-tenancy RBAC (uses existing company context)
- API contracts (endpoints documented, ready to implement)
- Current demo checklist priorities

---

## Next Steps

### This Week (Decision Points):
1. ✅ Review comprehensive plan (this doc + API contracts)
2. ⬜ Approve 7 portfolio types or suggest changes
3. ⬜ Approve rule-based behavioral score approach
4. ⬜ Confirm defer flow visualization to v2
5. ⬜ Create database migration scripts

### Week 1 (Data Foundation):
- Implement schema changes
- Update fakerMockData with coordinates
- Generate portfolio types and behavioral scores
- Create TypeScript interfaces

### Week 2 (Calculation & Components):
- Build geographic calculation utilities
- Scaffold GeographicHeatMap component
- Implement controls and filters
- Initial integration with useCompanyAnalytics

### Week 3 (Polish & Ship):
- Complete all 8 view modes
- Add drill-down modals
- Testing and refinement
- Demo walkthrough documentation

---

## Files to Create/Update

### New Files:
- `libs/shared-types/src/enums/portfolio-type.enum.ts`
- `libs/shared-types/src/interfaces/geographic-analytics.interfaces.ts`
- `apps/web/src/utils/geographicMetrics.ts`
- `apps/web/src/components/analytics/GeographicHeatMap.tsx`
- `apps/web/src/components/analytics/GeographicControls.tsx`
- `apps/web/src/components/analytics/GeographicInsightsPanel.tsx`
- `apps/web/src/components/analytics/GeographicDrilldownModal.tsx`
- `apps/web/src/components/skeletons/SkeletonGeographicMap.tsx`

### Update Files:
- `libs/dev-utils/src/fakerMockData.ts` (coordinates, types, behavioral data)
- `apps/web/src/hooks/useCompanyAnalytics.ts` (add geographic data)
- `apps/web/src/services/api/dataProvider.ts` (add geographic methods)
- `apps/web/src/features/company/components/CompanyAnalyticsPage.tsx` (integrate component)
- `docs/demo-checklist.md` (add as Action 3.8)

### Database:
- Migration: Add portfolio_type enum and field
- Migration: Add 8 behavioral fields to debts table

---

**Status:** COMPREHENSIVE PLAN READY
**Priority:** HIGH - Major differentiator
**Risk:** Medium (new library, complex data requirements)
**Effort:** 2-3 week sprint with focused team
**ROI:** Very High - Unique competitive advantage for demo

---

## Status (as of 2025-10-04)
**Action:** All DTOs and enums required for this feature have been created in `libs/contracts/` as of the major refactoring. This action item is considered complete.