# UI-Organizations MVP Gaps

Outstanding features and fixes needed before production release.

---

## Portfolio Segmentation

### Gap: Segmentation Coverage Calculation

**Location**: `apps/ui-organizations/src/features/inventory/PortfolioSegmentation.tsx:119-123`

**Current State**: Coverage percentage is hardcoded to 0%

**Impact**: Users cannot see what percentage of their portfolio is covered by active segments

**Recommended Solution**: Backend calculation (Option A)

**Implementation**:
1. **Backend** (api-debts):
   - Add endpoint: `GET /organizations/:orgId/portfolios/:portfolioId/segmentation-coverage`
   - Calculate how many debts match enabled auto-assignment filters
   - Return: `{ coveredCount: number, totalCount: number, percentage: number }`
   - Consider overlapping segments (debt only counted once)

2. **Frontend** (ui-organizations):
   - Create hook: `useSegmentationCoverage(portfolioId)`
   - Update PortfolioSegmentation component to display real percentage
   - Show progress bar based on actual coverage

**Effort**: ~1 hour backend + 15 minutes frontend

**Priority**: Low (feature is functional without this metric)

---

## Additional Gaps

_To be added as discovered_
