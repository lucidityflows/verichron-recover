# Analytics API Implementation Guide

**Date**: December 3, 2025
**Purpose**: Complete API architecture for analytics features
**Scope**: Endpoints, DTOs, orchestration handlers, query parameters, filtering strategy

---

## Table of Contents

1. [Overview](#overview)
2. [Global Filtering Strategy](#global-filtering-strategy)
3. [Feature Implementation Matrix](#feature-implementation-matrix)
4. [Chart-Specific Implementations](#chart-specific-implementations)
5. [New Files Required](#new-files-required)
6. [Query Parameter Patterns](#query-parameter-patterns)
7. [Enhancements & Extensions](#enhancements--extensions)

---

## Overview

### Architecture Pattern

```
Client Request
     ↓
api-organizations/analytics.controller.ts (Public REST API)
     ↓
api-organizations/analytics.service.ts (Publishes event)
     ↓
packages/event-orchestrator/handlers/*.handler.ts (Orchestration logic)
     ↓
[Parallel requests to internal endpoints with HMAC auth]
     ↓
api-debts/internal-analytics.controller.ts
api-transactions/internal-analytics.controller.ts
api-debtors/internal-analytics.controller.ts
api-communications/internal-analytics.controller.ts
     ↓
Aggregation in orchestrator
     ↓
Publish completion event
     ↓
Client receives response
```

### Core Principles

1. **Single Endpoint, Multiple Views**: Use query parameters to control data shape, not separate endpoints
2. **Consistent Filtering**: All endpoints support `portfolioId`, `portfolioTag[]`, `debtCategory`, `startDate`, `endDate`
3. **Granularity Control**: Time-based queries support `granularity` param (daily, weekly, monthly, quarterly)
4. **Data Shape Control**: Use `groupBy` parameter for dimension switching in same chart
5. **Pagination**: All list-based results support `page`, `pageSize`

---

## Global Filtering Strategy

### Universal Query Parameters

All analytics endpoints accept these filters:

```typescript
interface GlobalAnalyticsFilters {
  // Time range
  startDate?: string;           // ISO 8601 date
  endDate?: string;             // ISO 8601 date

  // Portfolio filtering
  portfolioId?: string;         // Single portfolio UUID
  portfolioTag?: string[];      // Multiple tags (OR logic)

  // Debt filtering
  debtCategory?: DebtCategory;  // MEDICAL, CREDIT_CARD, etc.
  debtStatus?: DebtStatus[];    // ACTIVE, PAID, SETTLED, etc.

  // Granularity (for time-series)
  granularity?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

  // Pagination
  page?: number;
  pageSize?: number;
}
```

### Implementation Pattern

**In api-organizations DTOs:**
```typescript
// Base filter DTO that extends all query DTOs
export class BaseAnalyticsFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  portfolioId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  portfolioTag?: string[];

  @ApiPropertyOptional({ enum: DebtCategory, enumName: 'DebtCategory' })
  @IsOptional()
  @IsEnum(DebtCategory)
  debtCategory?: DebtCategory;

  @ApiPropertyOptional({ enum: DebtStatus, enumName: 'DebtStatus', isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(DebtStatus, { each: true })
  debtStatus?: DebtStatus[];
}
```

**Usage in orchestrator:**
```typescript
// When calling internal endpoints, pass filters via query string
const queryParams = new URLSearchParams({
  ...(filters.startDate && { startDate: filters.startDate }),
  ...(filters.endDate && { endDate: filters.endDate }),
  ...(filters.portfolioId && { portfolioId: filters.portfolioId }),
  ...(filters.debtCategory && { debtCategory: filters.debtCategory }),
});

if (filters.portfolioTag?.length) {
  filters.portfolioTag.forEach(tag => queryParams.append('portfolioTag', tag));
}

const url = `${baseUrl}/internal/analytics/recovery-trends/${orgId}?${queryParams}`;
```

---

## Feature Implementation Matrix

| Feature | Public Endpoint | Event Types | Internal Endpoints | Orchestrator Handler | New Files |
|---------|----------------|-------------|-------------------|---------------------|-----------|
| **Dashboard Summary** | ✅ Implemented | ✅ Exists | ✅ Exists | ✅ Exists | None |
| **Recovery Trends** | ⚠️ Stubbed | ❌ Need | ❌ Need | ❌ Need | 6 new |
| **Portfolio Performance** | ⚠️ Stubbed | ❌ Need | ❌ Need | ❌ Need | 6 new |
| **Geographic: Debtors** | ⚠️ Stubbed | ❌ Need | ❌ Need | ❌ Need | 5 new |
| **Geographic: Payment Plans** | ⚠️ Stubbed | ❌ Need | ❌ Need | ❌ Need | 5 new |
| **Geographic: Combined** | ⚠️ Stubbed | ❌ Need | ❌ Need | ❌ Need | 8 new |
| **Sankey: Payment Flow** | ❌ New Feature | ❌ Need | ❌ Need | ❌ Need | 10 new |

---

## Chart-Specific Implementations

### 1. Recovery Trends (Time-Series Line/Area Chart)

**Purpose**: Show recovery rate trends over time with configurable granularity

#### Public Endpoint
```typescript
GET /orgs/:orgId/analytics/recovery-trends
```

#### Query Parameters
```typescript
class RecoveryTrendsQueryDto extends BaseAnalyticsFiltersDto {
  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
  granularity?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly';

  @ApiPropertyOptional({ description: 'Group by dimension for multi-series chart' })
  @IsOptional()
  @IsEnum(['debtCategory', 'portfolio', 'none'])
  groupBy?: 'debtCategory' | 'portfolio' | 'none' = 'none';
}
```

#### Response DTO
```typescript
interface RecoveryTrendsResponseDto {
  orgId: string;
  startDate: string;
  endDate: string;
  granularity: string;
  groupBy?: string;

  // Single series (when groupBy = 'none')
  trends?: RecoveryTrendDataPointDto[];

  // Multiple series (when groupBy is set)
  trendsByGroup?: {
    [groupKey: string]: RecoveryTrendDataPointDto[];
  };

  totalCollected: string;
  avgRecoveryRate: number;
  generatedAt: string;
}

interface RecoveryTrendDataPointDto {
  period: string;              // ISO date or "2024-Q2"
  principalOwed: string;       // Decimal as string
  amountCollected: string;     // Decimal as string
  recoveryRate: number;        // Percentage 0-100
  debtCount: number;           // Number of debts in period
}
```

#### Events
```typescript
// In packages/events/src/types.ts
export const EVENT_TYPES = {
  // ... existing
  ANALYTICS_RECOVERY_TRENDS_REQUESTED: 'analytics.recovery-trends.requested',
  ANALYTICS_RECOVERY_TRENDS_COMPLETED: 'analytics.recovery-trends.completed',
};
```

#### Internal Endpoints

**api-transactions:**
```typescript
GET /internal/analytics/recovery-trends/:orgId
Query: startDate, endDate, granularity, portfolioId, portfolioTag[], debtCategory
Response: {
  payments: [
    {
      period: string;
      totalCollected: string;
      transactionCount: number;
    }
  ]
}
```

**api-debts:**
```typescript
GET /internal/analytics/recovery-trends/:orgId
Query: startDate, endDate, granularity, portfolioId, portfolioTag[], debtCategory
Response: {
  debtsOverTime: [
    {
      period: string;
      totalPrincipal: string;
      debtCount: number;
      debtCategory?: string;  // If groupBy=debtCategory
      portfolioId?: string;    // If groupBy=portfolio
    }
  ]
}
```

#### Orchestrator Handler
```typescript
// packages/event-orchestrator/src/handlers/analytics-recovery-trends.handler.ts
@EventSubscription({
  topicName: EVENT_TOPICS.ORGANIZATIONS,
  subscriptionName: 'event-orchestrator.analytics.recovery-trends.sub',
  eventType: EVENT_TYPES.ANALYTICS_RECOVERY_TRENDS_REQUESTED,
})
async handleRecoveryTrendsRequested(envelope: MessageEnvelope) {
  const { organizationId, filters, correlationId, replyTo } = envelope.data;

  // Fetch data from both services in parallel
  const [transactionData, debtData] = await Promise.all([
    this.fetchTransactionTrends(organizationId, filters),
    this.fetchDebtTrends(organizationId, filters),
  ]);

  // Aggregate: Join by period, calculate recovery rate
  const trends = this.aggregateTrends(transactionData, debtData, filters.groupBy);

  // Publish completion
  await this.eventPublisher.publish(
    replyTo,
    EVENT_TYPES.ANALYTICS_RECOVERY_TRENDS_COMPLETED,
    {
      correlationId,
      organizationId,
      trends,
      totalCollected: this.sumCollections(transactionData),
      avgRecoveryRate: this.calculateAvgRecoveryRate(trends),
      generatedAt: new Date().toISOString(),
    },
  );
}
```

#### New Files Required
1. `packages/events/src/types.ts` - Add event types
2. `packages/contracts/src/dto/api-organizations/analytics/recovery-trends-query.interface.ts`
3. `packages/contracts/src/dto/api-organizations/analytics/recovery-trends-response.interface.ts`
4. `apps/api-transactions/src/internal-analytics/recovery-trends.service.ts`
5. `apps/api-debts/src/internal-analytics/recovery-trends.service.ts`
6. `packages/event-orchestrator/src/handlers/analytics-recovery-trends.handler.ts`

---

### 2. Portfolio Performance (Comparative Table + Bar Chart)

**Purpose**: Compare portfolio performance side-by-side

#### Public Endpoint
```typescript
GET /orgs/:orgId/analytics/portfolio-performance
```

#### Query Parameters
```typescript
class PortfolioPerformanceQueryDto extends BaseAnalyticsFiltersDto {
  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsEnum(['recoveryRate', 'collected', 'roi', 'debtCount'])
  sortBy?: 'recoveryRate' | 'collected' | 'roi' | 'debtCount' = 'recoveryRate';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pageSize?: number = 20;
}
```

#### Response DTO
```typescript
interface PortfolioPerformanceResponseDto {
  orgId: string;
  totalPortfolios: number;
  portfolios: PortfolioPerformanceDto[];
  overallRecoveryRate: number;
  totalInvested: string;
  totalCollected: string;
  page: number;
  pageSize: number;
  totalPages: number;
  generatedAt: string;
}

interface PortfolioPerformanceDto {
  portfolioId: string;
  portfolioName: string;
  purchasePrice: string;
  totalPrincipal: string;
  totalCollected: string;
  recoveryRate: number;           // Percentage
  roi: number;                    // (collected - invested) / invested * 100
  debtCount: number;
  activeDebts: number;
  paidDebts: number;
  paymentPlanCount: number;
  avgDaysToFirstPayment: number;
  primaryDebtCategory?: DebtCategory;
  portfolioTags: string[];
}
```

#### Events
```typescript
ANALYTICS_PORTFOLIO_PERFORMANCE_REQUESTED: 'analytics.portfolio-performance.requested',
ANALYTICS_PORTFOLIO_PERFORMANCE_COMPLETED: 'analytics.portfolio-performance.completed',
```

#### Internal Endpoints

**api-debts:**
```typescript
GET /internal/analytics/portfolio-performance/:orgId
Query: portfolioId, portfolioTag[], debtCategory, startDate, endDate
Response: {
  portfolios: [
    {
      portfolioId: string;
      portfolioName: string;
      purchasePrice: string;
      totalPrincipal: string;
      debtCount: number;
      statusBreakdown: { [status: string]: number };
      primaryDebtCategory?: string;
      portfolioTags: string[];
    }
  ]
}
```

**api-transactions:**
```typescript
GET /internal/analytics/portfolio-performance/:orgId
Query: portfolioId, portfolioTag[], startDate, endDate
Response: {
  portfolioPayments: [
    {
      portfolioId: string;
      totalCollected: string;
      paymentPlanCount: number;
      avgDaysToFirstPayment: number;
    }
  ]
}
```

#### Orchestrator Handler
```typescript
// Join portfolio data with payment data by portfolioId
// Calculate ROI, recovery rate
// Sort and paginate
// Return aggregated results
```

#### New Files Required
1. Event types in `packages/events/src/types.ts`
2. `packages/contracts/src/dto/api-organizations/analytics/portfolio-performance-query.interface.ts`
3. `packages/contracts/src/dto/api-organizations/analytics/portfolio-performance-response.interface.ts`
4. `apps/api-debts/src/internal-analytics/portfolio-performance.service.ts`
5. `apps/api-transactions/src/internal-analytics/portfolio-performance.service.ts`
6. `packages/event-orchestrator/src/handlers/analytics-portfolio-performance.handler.ts`

---

### 3. Geographic: Debtor Distribution (Choropleth Map)

**Purpose**: Show debtor counts and metrics by US state

#### Public Endpoint
```typescript
GET /orgs/:orgId/analytics/geographic/debtors
```

#### Query Parameters
```typescript
class GeographicDebtorsQueryDto extends BaseAnalyticsFiltersDto {
  @ApiPropertyOptional({ description: 'State code filter (e.g., "TX")' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  state?: string;

  @ApiPropertyOptional({ description: 'Metric to display on map' })
  @IsOptional()
  @IsEnum(['debtorCount', 'totalDebtValue', 'avgDebtPerDebtor', 'recoveryRate'])
  metric?: 'debtorCount' | 'totalDebtValue' | 'avgDebtPerDebtor' | 'recoveryRate' = 'debtorCount';
}
```

#### Response DTO
```typescript
interface GeographicDebtorsResponseDto {
  orgId: string;
  totalDebtors: number;
  statesRepresented: number;
  states: DebtorStateDataDto[];
  topStates: DebtorStateDataDto[];  // Top 5 by selected metric
  generatedAt: string;
}

interface DebtorStateDataDto {
  state: string;              // "TX"
  stateName: string;          // "Texas"
  debtorCount: number;
  totalDebtValue: string;
  avgDebtPerDebtor: string;
  recoveryRate: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}
```

#### Events
```typescript
ANALYTICS_GEOGRAPHIC_DEBTORS_REQUESTED: 'analytics.geographic.debtors.requested',
ANALYTICS_GEOGRAPHIC_DEBTORS_COMPLETED: 'analytics.geographic.debtors.completed',
```

#### Internal Endpoints

**api-debtors:**
```typescript
GET /internal/analytics/geographic/debtors/:orgId
Query: portfolioId, portfolioTag[], debtCategory, state
Response: {
  debtorsByState: [
    {
      state: string;
      debtorCount: number;
      debtorProfileIds: string[];  // For further correlation
    }
  ]
}
```

**api-debts:**
```typescript
GET /internal/analytics/geographic/debts-by-state/:orgId
Query: portfolioId, portfolioTag[], debtCategory, state
Response: {
  debtsByState: [
    {
      state: string;
      totalPrincipal: string;
      debtCount: number;
    }
  ]
}
```

**api-transactions:**
```typescript
GET /internal/analytics/geographic/collections-by-state/:orgId
Query: portfolioId, startDate, endDate, state
Response: {
  collectionsByState: [
    {
      state: string;
      totalCollected: string;
    }
  ]
}
```

#### Orchestrator Handler
```typescript
// Fetch debtor counts, debt values, collections by state
// Join by state code
// Calculate recovery rate per state: totalCollected / totalPrincipal
// Enrich with state names and coordinates (from static lookup table)
// Sort by selected metric
```

#### New Files Required
1. Event types
2. `packages/contracts/src/dto/api-organizations/analytics/geographic-debtors-query.interface.ts`
3. `packages/contracts/src/dto/api-organizations/analytics/geographic-debtors-response.interface.ts`
4. `apps/api-debtors/src/internal-analytics/geographic-debtors.service.ts`
5. `apps/api-debts/src/internal-analytics/geographic-debts.service.ts`
6. `apps/api-transactions/src/internal-analytics/geographic-collections.service.ts`
7. `packages/event-orchestrator/src/handlers/analytics-geographic-debtors.handler.ts`
8. `packages/event-orchestrator/src/utils/state-coordinates.ts` (Static data for map rendering)

---

### 4. Sankey Flow Diagram (Multi-View Interactive Chart)

**Purpose**: Visualize payment/debt flows across multiple dimensions

#### Public Endpoint
```typescript
GET /orgs/:orgId/analytics/flow
```

#### Query Parameters
```typescript
class FlowAnalyticsQueryDto extends BaseAnalyticsFiltersDto {
  @ApiProperty({
    description: 'Flow dimension to visualize',
    enum: ['payment-method', 'state', 'debt-category', 'portfolio', 'status-transition']
  })
  @IsEnum(['payment-method', 'state', 'debt-category', 'portfolio', 'status-transition'])
  view: 'payment-method' | 'state' | 'debt-category' | 'portfolio' | 'status-transition';

  @ApiPropertyOptional({ description: 'Minimum flow value to display (filters small flows)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minValue?: number = 0;
}
```

#### Response DTO
```typescript
interface FlowAnalyticsResponseDto {
  orgId: string;
  view: string;
  nodes: FlowNodeDto[];
  links: FlowLinkDto[];
  totalValue: string;
  generatedAt: string;
}

interface FlowNodeDto {
  id: string;
  label: string;
  value: string;           // Total value through this node
  metadata?: {
    debtCategory?: DebtCategory;
    state?: string;
    portfolioId?: string;
    paymentMethod?: string;
  };
}

interface FlowLinkDto {
  source: string;          // Node ID
  target: string;          // Node ID
  value: string;           // Flow value (payment amount or debt count)
  percentage: number;      // Percentage of total
}
```

#### View-Specific Logic

**View: payment-method**
```
Total Payments
  ├─→ VISA ($45,000)
  ├─→ Mastercard ($32,000)
  ├─→ ACH ($28,000)
  └─→ Money Order ($5,000)
```

**View: state**
```
Total Payments
  ├─→ TX ($40,000)
  ├─→ CA ($35,000)
  ├─→ NY ($20,000)
  └─→ FL ($15,000)
```

**View: debt-category**
```
Total Debts
  ├─→ MEDICAL ($120,000)
  ├─→ CREDIT_CARD ($85,000)
  ├─→ AUTO_LOAN ($60,000)
  └─→ OTHER ($35,000)
```

**View: portfolio**
```
Total Collections
  ├─→ Portfolio A ($50,000)
  ├─→ Portfolio B ($35,000)
  └─→ Portfolio C ($25,000)
```

**View: status-transition** (Advanced)
```
ACTIVE
  ├─→ PAID ($40,000)
  ├─→ PAYMENT_PLAN ($25,000)
  ├─→ SETTLED ($15,000)
  └─→ DEFAULTED ($10,000)
```

#### Events
```typescript
ANALYTICS_FLOW_REQUESTED: 'analytics.flow.requested',
ANALYTICS_FLOW_COMPLETED: 'analytics.flow.completed',
```

#### Internal Endpoints

**api-transactions:**
```typescript
GET /internal/analytics/flow/payments/:orgId
Query: view, portfolioId, portfolioTag[], debtCategory, startDate, endDate
Response: {
  paymentsByDimension: [
    {
      dimension: string;        // payment method, state, portfolio, etc.
      dimensionValue: string;   // "VISA", "TX", etc.
      totalAmount: string;
      transactionCount: number;
    }
  ]
}
```

**api-debts:**
```typescript
GET /internal/analytics/flow/debts/:orgId
Query: view, portfolioId, portfolioTag[], debtCategory
Response: {
  debtsByDimension: [
    {
      dimension: string;
      dimensionValue: string;
      totalPrincipal: string;
      debtCount: number;
    }
  ]
}
```

**api-debts (for status-transition view):**
```typescript
GET /internal/analytics/flow/status-transitions/:orgId
Query: startDate, endDate, portfolioId, portfolioTag[]
Response: {
  transitions: [
    {
      fromStatus: DebtStatus;
      toStatus: DebtStatus;
      debtCount: number;
      totalValue: string;
    }
  ]
}
```

#### Orchestrator Handler
```typescript
// Based on view parameter, fetch different data:
// - payment-method: Group transactions by payment method
// - state: Group by debtor state (requires debtor lookup)
// - debt-category: Group debts by category
// - portfolio: Group by portfolio
// - status-transition: Query status change audit log

// Transform into Sankey format:
// nodes = unique dimension values
// links = flows between root node and dimension values

// Apply minValue filter to exclude small flows
```

#### New Files Required
1. Event types
2. `packages/contracts/src/dto/api-organizations/analytics/flow-query.interface.ts`
3. `packages/contracts/src/dto/api-organizations/analytics/flow-response.interface.ts`
4. `apps/api-transactions/src/internal-analytics/flow-payments.service.ts`
5. `apps/api-debts/src/internal-analytics/flow-debts.service.ts`
6. `apps/api-debts/src/internal-analytics/flow-status-transitions.service.ts`
7. `packages/event-orchestrator/src/handlers/analytics-flow.handler.ts`

---

## New Files Required (Complete List)

### packages/events
```
src/types.ts (add new event types)
```

### packages/contracts
```
src/dto/api-organizations/analytics/
  ├── base-analytics-filters.interface.ts                    (NEW - shared base)
  ├── recovery-trends-query.interface.ts                     (NEW)
  ├── recovery-trends-response.interface.ts                  (NEW)
  ├── portfolio-performance-query.interface.ts               (NEW)
  ├── portfolio-performance-response.interface.ts            (NEW)
  ├── geographic-debtors-query.interface.ts                  (NEW)
  ├── geographic-debtors-response.interface.ts               (NEW)
  ├── flow-query.interface.ts                                (NEW)
  └── flow-response.interface.ts                             (NEW)
```

### apps/api-organizations
```
src/analytics/dto/
  ├── base-analytics-filters.dto.ts                          (NEW - extends interface)
  ├── recovery-trends-query.dto.ts                           (NEW)
  ├── portfolio-performance-query.dto.ts                     (NEW)
  ├── geographic-debtors-query.dto.ts                        (NEW)
  └── flow-query.dto.ts                                      (NEW)
```

### apps/api-debts
```
src/internal-analytics/
  ├── internal-analytics.module.ts                           (NEW)
  ├── internal-analytics.controller.ts                       (EXPAND existing)
  ├── recovery-trends.service.ts                             (NEW)
  ├── portfolio-performance.service.ts                       (NEW)
  ├── geographic-debts.service.ts                            (NEW)
  ├── flow-debts.service.ts                                  (NEW)
  └── flow-status-transitions.service.ts                     (NEW)
```

### apps/api-transactions
```
src/internal-analytics/
  ├── internal-analytics.module.ts                           (NEW)
  ├── internal-analytics.controller.ts                       (EXPAND existing)
  ├── recovery-trends.service.ts                             (NEW)
  ├── portfolio-performance.service.ts                       (NEW)
  ├── geographic-collections.service.ts                      (NEW)
  └── flow-payments.service.ts                               (NEW)
```

### apps/api-debtors
```
src/internal-analytics/
  ├── internal-analytics.module.ts                           (NEW)
  ├── internal-analytics.controller.ts                       (EXPAND existing)
  └── geographic-debtors.service.ts                          (NEW)
```

### packages/event-orchestrator
```
src/handlers/
  ├── analytics-recovery-trends.handler.ts                   (NEW)
  ├── analytics-portfolio-performance.handler.ts             (NEW)
  ├── analytics-geographic-debtors.handler.ts                (NEW)
  └── analytics-flow.handler.ts                              (NEW)

src/utils/
  ├── state-coordinates.ts                                   (NEW - static US state data)
  └── analytics-aggregation.utils.ts                         (NEW - shared aggregation logic)
```

---

## Query Parameter Patterns

### Pattern 1: Time-Series Granularity
```
?granularity=monthly
?granularity=quarterly
?startDate=2024-01-01&endDate=2024-12-31&granularity=weekly
```

### Pattern 2: Multi-Dimensional Grouping
```
?groupBy=debtCategory           # Multiple series by debt type
?groupBy=portfolio              # Multiple series by portfolio
?groupBy=none                   # Single aggregated series (default)
```

### Pattern 3: Portfolio Filtering (Multi-Select)
```
?portfolioId=uuid-1                           # Single portfolio
?portfolioTag=Q2-2024                         # All portfolios with tag
?portfolioTag=Q2-2024&portfolioTag=High-Risk  # Portfolios with either tag (OR logic)
```

### Pattern 4: Debt Category Filtering
```
?debtCategory=MEDICAL
?debtCategory=CREDIT_CARD
# Note: Currently single value. Could extend to array if needed.
```

### Pattern 5: Geographic Focus
```
?state=TX                       # Focus on Texas
?metric=recoveryRate            # Change map coloring metric
```

### Pattern 6: Flow View Selection
```
?view=payment-method
?view=state
?view=debt-category
?view=portfolio
?view=status-transition
?minValue=1000                  # Hide flows < $1000
```

### Pattern 7: Pagination + Sorting
```
?page=1&pageSize=20
?sortBy=recoveryRate&sortOrder=DESC
```

---

## Enhancements & Extensions

### Enhancement 1: Comparative Analysis (Beyond Initial Scope)

**New Query Param: `compareBy`**
```
GET /orgs/:orgId/analytics/recovery-trends?compareBy=debtCategory
```

Returns data structure with multiple series for side-by-side comparison:
```typescript
{
  series: [
    { name: 'MEDICAL', data: [...] },
    { name: 'CREDIT_CARD', data: [...] },
    { name: 'AUTO_LOAN', data: [...] }
  ]
}
```

Supports:
- `compareBy=debtCategory` - Compare debt types
- `compareBy=portfolio` - Compare portfolios
- `compareBy=state` - Compare geographic regions

### Enhancement 2: Cohort Analysis

**New Endpoint:**
```
GET /orgs/:orgId/analytics/cohorts
?cohortBy=purchaseQuarter
?metric=recoveryRate
```

Track recovery rates for debts grouped by when portfolios were purchased:
```
Q1 2024 cohort: 35% recovery
Q2 2024 cohort: 42% recovery
Q3 2024 cohort: 28% recovery (newer, still collecting)
```

### Enhancement 3: Forecasting (Requires ML)

**New Endpoint:**
```
GET /orgs/:orgId/analytics/forecast
?metric=collections
?periods=6           # Forecast next 6 months
?confidence=0.95     # 95% confidence interval
```

Response includes:
- Historical actuals
- Forecasted values
- Upper/lower confidence bounds

### Enhancement 4: Benchmark Comparisons

**New Query Param: `includeBenchmark=true`**

Compare organization's metrics to anonymized industry benchmarks:
```typescript
{
  orgRecoveryRate: 38.5,
  industryP50: 32.0,     // 50th percentile
  industryP75: 45.0,     // 75th percentile
  industryP90: 52.0,     // 90th percentile
  percentileRank: 62     // This org is at 62nd percentile
}
```

### Enhancement 5: Real-Time Streaming (WebSocket)

**New WebSocket Endpoint:**
```
ws://api-organizations/orgs/:orgId/analytics/stream
```

Push updates for:
- Today's collections (updates every minute)
- Active payment plan count
- Recent transaction events

Reduces polling, enables live dashboards.

### Enhancement 6: Export to CSV/Excel

**New Query Param: `format=csv|json|xlsx`**
```
GET /orgs/:orgId/analytics/recovery-trends?format=csv
```

Returns downloadable file instead of JSON response. Useful for:
- External analysis in Excel
- Regulatory reporting
- Sharing with non-technical stakeholders

### Enhancement 7: Saved Filters / Dashboard Presets

**New Endpoints:**
```
POST   /orgs/:orgId/analytics/presets          # Save filter combination
GET    /orgs/:orgId/analytics/presets          # List saved presets
GET    /orgs/:orgId/analytics/presets/:id      # Load preset filters
DELETE /orgs/:orgId/analytics/presets/:id      # Delete preset
```

Users can save common filter combinations:
- "Q2 2024 Medical Debts"
- "High-Risk Portfolios"
- "California Performance"

### Enhancement 8: Drill-Down Capability

**Pattern: Nested Detail Endpoints**
```
GET /orgs/:orgId/analytics/portfolio-performance
  → Shows all portfolios

GET /orgs/:orgId/analytics/portfolio-performance/:portfolioId/debts
  → Shows individual debts within a portfolio

GET /orgs/:orgId/analytics/portfolio-performance/:portfolioId/debts/:debtId/transactions
  → Shows transaction history for a specific debt
```

Enables hierarchical exploration:
- Dashboard → Portfolio → Debt → Transaction level detail

### Enhancement 9: Alert Thresholds

**New Feature: Analytics-Based Alerts**
```
POST /orgs/:orgId/analytics/alerts
{
  "metric": "recoveryRate",
  "condition": "below",
  "threshold": 30,
  "portfolioId": "uuid",
  "notificationChannel": "email"
}
```

System monitors analytics and sends alerts when:
- Recovery rate drops below threshold
- Collections volume decreases
- Payment plan default rate increases

### Enhancement 10: Economic Zone Analytics (Compliance-Safe Alternative to Demographics)

**New Endpoint:**
```
GET /orgs/:orgId/analytics/economic-zones
```

Group debtors by ZIP code-level census data:
```typescript
{
  zones: [
    {
      label: 'High Income Areas',
      medianIncome: 120000,
      zipCodes: ['90210', '10001', ...],
      debtorCount: 450,
      avgRecoveryRate: 52.3
    },
    {
      label: 'Low Income Areas',
      medianIncome: 35000,
      zipCodes: ['90001', '10453', ...],
      debtorCount: 1200,
      avgRecoveryRate: 28.7
    }
  ]
}
```

Provides similar insights to demographic analysis without FDCPA/ECOA compliance risks.

---

## Implementation Priority Recommendation

### Phase 1: Foundation (Week 1-2)
1. **Base Filtering Infrastructure**
   - Create `BaseAnalyticsFiltersDto`
   - Update orchestrator to handle filter propagation
   - Test with existing dashboard summary

2. **Recovery Trends** - Simplest time-series
   - Single orchestrator handler
   - 2 internal endpoints (transactions, debts)
   - Proves pattern for time-based queries

### Phase 2: Performance Metrics (Week 3-4)
3. **Portfolio Performance** - High user value
   - Similar to recovery trends
   - Adds sorting and pagination patterns

### Phase 3: Geographic Intelligence (Week 5-6)
4. **Geographic: Debtors** - Map visualization foundation
   - Introduces state-based grouping
   - Coordinate enrichment pattern
   - Proves multi-service geographic aggregation

### Phase 4: Flow Visualizations (Week 7-8)
5. **Sankey Flow** - Most complex, highest visual impact
   - Multi-view logic in single endpoint
   - Graph structure transformation
   - Advanced data shaping

### Phase 5: Enhancements (Ongoing)
- Add `groupBy` support to recovery trends
- Implement cohort analysis
- Build export functionality
- Add saved presets

---

## Success Criteria

For each analytics feature:

✅ **Query Parameter Support**
- All global filters work (portfolioId, portfolioTag, debtCategory, date range)
- View-specific params function correctly
- Invalid params return 400 with clear error messages

✅ **Performance**
- Response time < 2 seconds for typical organization (1000s of debts)
- Efficient database queries (proper indexes, no N+1)
- Orchestrator timeout set appropriately (5-10 seconds)

✅ **Data Accuracy**
- Results match direct database queries
- Aggregations are mathematically correct
- No data loss during orchestration

✅ **Error Handling**
- Graceful degradation if one service is down
- Clear error messages for debugging
- Proper HTTP status codes

✅ **API Documentation**
- Complete Swagger/OpenAPI annotations
- Example requests/responses
- Query parameter descriptions

---

**End of API Implementation Guide**

This guide provides the complete blueprint for implementing analytics APIs without prescribing UI implementation details. All endpoints follow consistent patterns for filtering, pagination, and data shaping while supporting interactive chart requirements through query parameters.
