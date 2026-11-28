# Portfolio Performance Analytics Guide

**Version:** 1.0
**Last Updated:** 2025-12-04
**Status:** Production Ready
**Endpoint:** `GET /orgs/:orgId/analytics/portfolio-performance`

---

## Table of Contents
1. [Overview](#overview)
2. [Technical Architecture](#technical-architecture)
3. [Request Flow](#request-flow)
4. [Data Aggregation Logic](#data-aggregation-logic)
5. [The Mapping Strategy](#the-mapping-strategy)
6. [User Expectations](#user-expectations)
7. [Visualization Guidelines](#visualization-guidelines)
8. [Business Value](#business-value)
9. [What This Proves](#what-this-proves)
10. [What This Does NOT Prove](#what-this-does-not-prove)
11. [Limitations & Edge Cases](#limitations--edge-cases)
12. [Complementary Analytics](#complementary-analytics)
13. [Lessons Learned](#lessons-learned)
14. [Future Expansions](#future-expansions)
15. [Testing Strategy](#testing-strategy)
16. [Troubleshooting](#troubleshooting)

---

## Overview

**Portfolio Performance** is a comprehensive analytics feature that provides cumulative performance metrics for debt portfolios, including recovery rates, ROI, debt composition, and payment plan activity.

### Purpose
To provide debt collection organizations with insight into:
- Overall portfolio health and recovery rates
- Return on investment (ROI) for each portfolio
- Debt composition (active, paid, payment plans)
- Payment collection velocity
- Comparative portfolio ranking by performance

### Core Metrics

```
Recovery Rate = (Total Collected / Total Principal) × 100
ROI = ((Total Collected - Purchase Price) / Purchase Price) × 100
```

**Important:** This is **cumulative portfolio analysis**, not period-based cohort tracking.

---

## Technical Architecture

### Microservices Involved

1. **api-organizations** (Orchestration Layer)
   - Endpoint: `GET /orgs/:orgId/analytics/portfolio-performance`
   - Role: Receives client requests, publishes orchestration events, aggregates responses
   - Location: `apps/api-organizations/src/analytics/analytics.controller.ts`

2. **event-orchestrator** (Aggregation Layer)
   - Event: `ANALYTICS_PORTFOLIO_PERFORMANCE_REQUESTED`
   - Role: Orchestrates 3-step data collection with debt-to-portfolio mapping
   - Location: `packages/event-orchestrator/src/orchestrators/analytics-portfolio-performance.orchestrator.ts`

3. **api-debts** (Data Source)
   - Endpoint 1: `GET /internal/analytics/portfolio-performance/:orgId` - Portfolio debt metrics
   - Endpoint 2: `GET /internal/analytics/debt-portfolio-map/:orgId` - Debt-to-portfolio mapping
   - Role: Provides portfolio metadata, debt counts, and lightweight mapping
   - Location: `apps/api-debts/src/internal/analytics/analytics.service.ts`

4. **api-transactions** (Data Source)
   - Endpoint: `POST /internal/analytics/portfolio-performance/:orgId` - Payment metrics with mapping
   - Role: Aggregates payment data by portfolio using provided debt-to-portfolio mapping
   - Location: `apps/api-transactions/src/internal/analytics/analytics.service.ts`

### Authentication

- **External API (api-organizations):** JWT Bearer token with required permissions
- **Internal APIs:** HMAC signature authentication between services
  - Headers: `x-service-name`, `x-timestamp`, `x-nonce`, `x-signature`
  - Body signature included for POST requests

---

## Request Flow

### 1. Client Request
```http
GET /orgs/27511e09-9061-4e0e-bf62-3710586622df/analytics/portfolio-performance?sortBy=RECOVERY_RATE&sortOrder=DESC
Authorization: Bearer <jwt_token>
```

### 2. Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startDate` | ISO date | No | - | Filter portfolios purchased after this date |
| `endDate` | ISO date | No | - | Filter portfolios purchased before this date |
| `portfolioId` | UUID | No | - | Filter to specific portfolio |
| `portfolioTag` | string[] | No | - | Filter by portfolio tags (comma-separated) |
| `debtCategory` | enum | No | - | Filter debts by category within portfolios |
| `sortBy` | enum | No | `RECOVERY_RATE` | Sort field: `RECOVERY_RATE`, `COLLECTED`, `ROI`, `DEBT_COUNT` |
| `sortOrder` | enum | No | `DESC` | Sort order: `ASC`, `DESC` |
| `page` | number | No | 1 | Page number for pagination |
| `pageSize` | number | No | 20 | Results per page (max 100) |

### 3. Event Orchestration Flow with Mapping Strategy

```
┌─────────────┐     ① Request      ┌──────────────────┐
│   Client    │ ──────────────────> │ api-organizations│
│  (UI/API)   │                     │  (Controller)    │
└─────────────┘                     └──────────────────┘
                                             │
                                             │ ② Publish Event
                                             ▼
                                    ┌──────────────────┐
                                    │ Google Pub/Sub   │
                                    │  (Topic: orgs)   │
                                    └──────────────────┘
                                             │
                                             │ ③ Subscribe
                                             ▼
                                    ┌──────────────────┐
                                    │ Event Orchestrator│
                                    │   (3-Step Flow)  │
                                    └──────────────────┘
                                             │
                         ④ STEP 1: Fetch Portfolio Debt Metrics
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │   api-debts      │
                                    │ GET /portfolio-  │
                                    │   performance    │
                                    └──────────────────┘
                                             │
                                 Returns: 20 portfolios (paginated)
                                 - Portfolio metadata
                                 - Debt counts & principal
                                 - Active/paid breakdown
                                             │
                         ⑤ STEP 2: Fetch Debt-to-Portfolio Mapping
                     (Only for these 20 portfolios, not all debts!)
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │   api-debts      │
                                    │ GET /debt-       │
                                    │   portfolio-map  │
                                    └──────────────────┘
                                             │
                         Returns: { debtId: portfolioId } pairs
                         Lightweight: Only 2 columns (id, portfolio_id)
                         Efficient: ~12 KB for 1000 debts
                                             │
                         ⑥ STEP 3: Fetch Payment Metrics with Mapping
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │ api-transactions │
                                    │ POST /portfolio- │
                                    │   performance    │
                                    │ Body: mapping    │
                                    └──────────────────┘
                                             │
                         Uses mapping to aggregate payments by portfolio
                         - Total collected per portfolio
                         - Payment plan counts
                         - Payment velocity metrics
                                             │
                         ⑦ Merge debt + payment data
                         ⑧ Calculate recovery rates & ROI
                         ⑨ Apply sorting
                                             │
                                             │ ⑩ Publish Completion
                                             ▼
                                    ┌──────────────────┐
                                    │ Google Pub/Sub   │
                                    └──────────────────┘
                                             │
                                             │ ⑪ Receive Response
                                             ▼
                                    ┌──────────────────┐
                                    │ api-organizations│
                                    │   (Listener)     │
                                    └──────────────────┘
                                             │
                                             │ ⑫ HTTP Response
                                             ▼
                                    ┌──────────────────┐
                                    │     Client       │
                                    └──────────────────┘
```

### 4. Response Structure

```json
{
  "organizationId": "27511e09-9061-4e0e-bf62-3710586622df",
  "correlationId": "a8f93c12-5e1a-4b2f-9c3e-d72b1f8e4a91",
  "portfolioPerformance": {
    "orgId": "27511e09-9061-4e0e-bf62-3710586622df",
    "totalPortfolios": 5,
    "portfolios": [
      {
        "portfolioId": "p1-uuid",
        "portfolioName": "Medical Debt Q4 2024",
        "purchasePrice": "500000.00",
        "totalPrincipal": "2500000.00",
        "totalCollected": "750000.00",
        "recoveryRate": 30.0,
        "roi": 50.0,
        "debtCount": 1250,
        "activeDebts": 800,
        "paidDebts": 450,
        "paymentPlanCount": 120,
        "avgDaysToFirstPayment": null,
        "primaryDebtCategory": "MEDICAL",
        "portfolioTags": ["high-value", "recent"]
      }
    ],
    "overallRecoveryRate": 28.5,
    "totalInvested": "2500000.00",
    "totalPaymentsCollected": "3250000.00",
    "page": 1,
    "pageSize": 20,
    "totalPages": 1,
    "generatedAt": "2025-12-04T17:30:00.000Z"
  }
}
```

---

## Data Aggregation Logic

### Step 1: Portfolio Debt Metrics (api-debts)

**Query:**
```sql
-- Get portfolio metadata
SELECT
  portfolio.id,
  portfolio.name,
  portfolio.purchase_price,
  portfolio.portfolio_tags
FROM portfolios portfolio
WHERE portfolio.organization_id = :organizationId
  AND portfolio.status = 'ACTIVE'
  AND portfolio.purchase_date >= :startDate  -- if provided
  AND portfolio.purchase_date <= :endDate    -- if provided
  AND portfolio.tags && :tags                -- if portfolioTag provided

-- For each portfolio, get debt metrics
SELECT
  debt.portfolio_id,
  SUM(CAST(debt.principal_amount AS DECIMAL)) AS total_principal,
  COUNT(debt.id) AS debt_count,
  COUNT(CASE WHEN debt.status IN ('ACTIVE', 'PAYMENT_PLAN') THEN 1 END) AS active_debts,
  COUNT(CASE WHEN debt.status IN ('PAID_IN_FULL', 'SETTLED') THEN 1 END) AS paid_debts
FROM debts debt
WHERE debt.organization_id = :organizationId
  AND debt.portfolio_id = :portfolioId
  AND debt.debt_category = :debtCategory  -- if provided
GROUP BY debt.portfolio_id
```

**Returns:** Portfolio metadata + aggregated debt statistics (paginated).

---

### Step 2: Debt-to-Portfolio Mapping (api-debts)

**Query:**
```sql
-- Lightweight mapping: Only 2 columns for efficiency
SELECT
  debt.id,
  debt.portfolio_id
FROM debts debt
WHERE debt.organization_id = :organizationId
  AND debt.portfolio_id IN (:...portfolioIds)  -- Only for paginated portfolios!
```

**Key Optimization:**
- Only fetches mapping for the **paginated portfolios** (e.g., 20 portfolios)
- Does NOT fetch mapping for all debts in the organization
- If portfolio has 1000 debts, mapping returns 1000 rows × 2 columns ≈ 12 KB
- Scalable: 10,000 debts × 20 portfolios = 200,000 rows ≈ 2.4 MB (acceptable)

**Returns:** `{ debtId: portfolioId }` mapping object.

---

### Step 3: Payment Metrics with Mapping (api-transactions)

**Request:**
```http
POST /internal/analytics/portfolio-performance/:orgId
Content-Type: application/json

{
  "query": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  },
  "debtToPortfolioMap": {
    "debt-uuid-1": "portfolio-uuid-1",
    "debt-uuid-2": "portfolio-uuid-1",
    "debt-uuid-3": "portfolio-uuid-2"
  }
}
```

**Transaction Aggregation:**
```typescript
// Initialize metrics for each portfolio
const portfolioMetrics = new Map<string, {
  totalCollected: number;
  paymentPlanCount: number;
}>();

// Aggregate transactions by portfolio using mapping
transactions.forEach((transaction) => {
  const portfolioId = debtToPortfolioMap[transaction.debtId];
  if (portfolioId) {
    const metrics = portfolioMetrics.get(portfolioId);
    metrics.totalCollected += transaction.amount;
  }
});

// Aggregate payment plans by portfolio (via PaymentPlanDebt join table)
// Note: PaymentPlan entity has debtorId, not debtId, so we query PaymentPlanDebt
const paymentPlanDebts = await paymentPlanDebtRepository
  .find({ where: { debtId: In(debtIds) } });

// Track unique payment plans per portfolio
const portfolioPaymentPlans = new Map<string, Set<string>>();

paymentPlanDebts.forEach((ppd) => {
  const portfolioId = debtToPortfolioMap[ppd.debtId];
  if (portfolioId) {
    if (!portfolioPaymentPlans.has(portfolioId)) {
      portfolioPaymentPlans.set(portfolioId, new Set());
    }
    portfolioPaymentPlans.get(portfolioId).add(ppd.paymentPlanId);
  }
});

// Set unique payment plan counts
portfolioPaymentPlans.forEach((planIds, portfolioId) => {
  portfolioMetrics.get(portfolioId).paymentPlanCount = planIds.size;
});
```

**Returns:** Payment metrics aggregated by portfolio.

---

### Step 4: Merge & Calculate (event-orchestrator)

**Merge Logic:**
```typescript
const portfolios = debtMetrics.map((debt) => {
  const payment = paymentMetrics.find(p => p.portfolioId === debt.portfolioId) || {
    totalCollected: '0.00',
    paymentPlanCount: 0,
  };

  return {
    portfolioId: debt.portfolioId,
    portfolioName: debt.portfolioName,
    purchasePrice: debt.purchasePrice,
    totalPrincipal: debt.totalPrincipal,
    totalCollected: payment.totalCollected,
    recoveryRate: 0,  // Calculated next
    roi: 0,           // Calculated next
    debtCount: debt.debtCount,
    activeDebts: debt.activeDebts,
    paidDebts: debt.paidDebts,
    paymentPlanCount: payment.paymentPlanCount,
    primaryDebtCategory: debt.primaryDebtCategory,
    portfolioTags: debt.portfolioTags,
  };
});
```

**Performance Calculations:**
```typescript
portfolios.forEach((portfolio) => {
  const totalPrincipal = parseFloat(portfolio.totalPrincipal);
  const totalCollected = parseFloat(portfolio.totalCollected);
  const purchasePrice = parseFloat(portfolio.purchasePrice);

  // Recovery Rate = (collected / principal) × 100
  portfolio.recoveryRate = totalPrincipal > 0
    ? (totalCollected / totalPrincipal) * 100
    : 0;

  // ROI = ((collected - invested) / invested) × 100
  portfolio.roi = purchasePrice > 0
    ? ((totalCollected - purchasePrice) / purchasePrice) * 100
    : 0;
});
```

**Overall Metrics:**
```typescript
const totalInvested = portfolios.reduce((sum, p) =>
  sum + parseFloat(p.purchasePrice), 0
);

const totalPaymentsCollected = portfolios.reduce((sum, p) =>
  sum + parseFloat(p.totalCollected), 0
);

const totalPrincipal = portfolios.reduce((sum, p) =>
  sum + parseFloat(p.totalPrincipal), 0
);

const overallRecoveryRate = totalPrincipal > 0
  ? (totalPaymentsCollected / totalPrincipal) * 100
  : 0;
```

**Sorting:**
```typescript
const sorted = portfolios.sort((a, b) => {
  let comparison = 0;

  switch (sortBy) {
    case 'RECOVERY_RATE':
      comparison = a.recoveryRate - b.recoveryRate;
      break;
    case 'COLLECTED':
      comparison = parseFloat(a.totalCollected) - parseFloat(b.totalCollected);
      break;
    case 'ROI':
      comparison = a.roi - b.roi;
      break;
    case 'DEBT_COUNT':
      comparison = a.debtCount - b.debtCount;
      break;
  }

  return sortOrder === 'DESC' ? -comparison : comparison;
});
```

---

## The Mapping Strategy

### The Problem We Solved

**Architectural Constraint:**
- api-transactions has `Transaction.debtId` but no `Transaction.portfolioId`
- api-debts has `Debt.portfolioId`
- Bounded contexts: No TypeORM relations across microservices
- **Challenge:** How does api-transactions aggregate payments by portfolio?

### Alternative Solutions Considered

#### ❌ Option A: Embed debtIds in Portfolio Response
```json
{
  "portfolioId": "p1",
  "debtIds": ["d1", "d2", ..., "d10000"]  // 10,000 UUIDs embedded!
}
```

**Problems:**
- Response size: 20 portfolios × 10,000 debts × 36 bytes (UUID) = **7.2 MB**
- Unserializable for HTTP (too large)
- Violates RESTful principles (embedded arrays shouldn't be massive)
- **REJECTED**

#### ❌ Option C: api-debts Orchestrates api-transactions Directly
```
api-debts ──(internal call)──> api-transactions
```

**Problems:**
- Violates bounded context separation
- Creates tight coupling between services
- api-debts shouldn't know about api-transactions implementation
- Breaks event-driven architecture pattern
- **REJECTED**

#### ❌ Option D: Multi-Event Chain
```
orchestrator → api-debts → orchestrator → api-transactions → orchestrator
```

**Problems:**
- Over-engineered (3 events instead of 1)
- High latency (multiple pub/sub round-trips)
- Complex failure handling
- Unnecessary complexity for synchronous operation
- **REJECTED**

#### ✅ Option B: Separate Mapping Endpoint (CHOSEN)

**Implementation:**
```
1. orchestrator → api-debts: GET /portfolio-performance
   Returns: 20 portfolios (paginated)

2. orchestrator → api-debts: GET /debt-portfolio-map?portfolioIds=p1,p2,...,p20
   Returns: { debtId: portfolioId } for ONLY these 20 portfolios

3. orchestrator → api-transactions: POST /portfolio-performance
   Body: { query, debtToPortfolioMap }
   Returns: Payment metrics aggregated by portfolio
```

**Why This Works:**
- ✅ **Scalable:** Only fetches mapping for paginated portfolios (not all debts)
- ✅ **Efficient:** 1000 debts × 2 columns ≈ 12 KB (acceptable)
- ✅ **Bounded Contexts:** Each service maintains independence
- ✅ **Performance:** 3 HTTP calls, ~250ms total, ~12 KB data transfer
- ✅ **Maintainable:** Clear separation of concerns

### Performance Analysis

**Scenario:** 20 portfolios, 1000 debts each (20,000 total debts)

| Metric | Value |
|--------|-------|
| HTTP Calls | 3 |
| Step 1 (portfolio metrics) | ~5 KB |
| Step 2 (mapping) | ~240 KB (20k rows × 12 bytes) |
| Step 3 (payment metrics) | ~8 KB |
| **Total Data Transfer** | **~253 KB** |
| **Total Latency** | **~250ms** |

**Scalability:**
- 10,000 debts per portfolio: ~1.2 MB mapping (still acceptable)
- 100 portfolios per page: Would require pagination adjustments
- Millions of debts: Would need caching layer (future enhancement)

### Why Other Microservices Don't Need This

**Recovery Trends:** Both api-debts and api-transactions group by **time period** (date-based), which both entities naturally have (`createdAt`). No cross-service mapping needed.

**Portfolio Performance:** api-transactions needs to group by **portfolio**, which it doesn't have. Requires cross-service data (mapping).

**Lesson Learned:** When aggregation dimension is missing from a bounded context, a lightweight mapping strategy scales better than embedding or direct service coupling.

---

## User Expectations

### What Users Should Expect to See

1. **Portfolio Ranking Table**
   - Sortable columns: Recovery Rate, Total Collected, ROI, Debt Count
   - Default sort: Recovery Rate (descending)
   - Pagination controls at bottom

2. **Recovery Rate Interpretation**
   - Shows **cumulative** recovery on all debts in the portfolio
   - NOT period-based (unlike Recovery Trends)
   - Includes all payments from portfolio creation to present

3. **ROI Interpretation**
   - Positive ROI: Portfolio has collected more than purchase price
   - Negative ROI: Still underwater (collected < purchase price)
   - Formula: `((collected - invested) / invested) × 100`

4. **Debt Composition**
   - Active Debts: Currently being collected
   - Paid Debts: Fully paid or settled
   - Payment Plan Count: Unique payment plans across all debts

5. **Overall Metrics**
   - Total Invested: Sum of all portfolio purchase prices
   - Total Collected: Sum of all payments across all portfolios
   - Overall Recovery Rate: Weighted average across all portfolios

### Common Misunderstandings

❌ **Misconception:** "Recovery rate should match Recovery Trends."
✅ **Reality:** Recovery Trends is period-based cohort analysis. Portfolio Performance is cumulative lifetime recovery.

❌ **Misconception:** "ROI and recovery rate should be the same."
✅ **Reality:** ROI compares to purchase price. Recovery rate compares to principal (face value of debts).

❌ **Misconception:** "Overall recovery rate is the average of all portfolio rates."
✅ **Reality:** It's a weighted average: `(total collected / total principal) × 100`.

❌ **Misconception:** "Payment plan count should equal active debts."
✅ **Reality:** Not all active debts have payment plans. Payment plans are a subset of active debts.

---

## Visualization Guidelines

### Recommended UI Components

**1. Portfolio Performance Table** (Primary View)

Columns:
- Portfolio Name (with tag pills)
- Purchase Price (currency)
- Total Principal (currency)
- Total Collected (currency)
- Recovery Rate (percentage with trend indicator)
- ROI (percentage with color: green = positive, red = negative)
- Debt Composition (stacked mini-bar: active/paid)
- Payment Plans (count badge)

**2. Summary Cards** (Above Table)

```
┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Total Invested │  │ Total Collected│  │ Overall        │  │ Active         │
│  $2,500,000    │  │  $3,250,000    │  │ Recovery: 28%  │  │ Portfolios: 5  │
└────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘
```

**3. Filters & Controls** (Top Right)

- Sort By: Dropdown (Recovery Rate, Collected, ROI, Debt Count)
- Sort Order: Toggle (ASC/DESC)
- Date Range: Date picker (purchase date filter)
- Portfolio Tag: Multi-select
- Debt Category: Dropdown

**4. Portfolio Detail Modal** (Click Portfolio Name)

Shows:
- Portfolio metadata (purchase date, tags, description)
- Debt breakdown chart (pie chart: active/paid/payment plan)
- Payment timeline (area chart of collections over time)
- Top performing debts (table of highest collected debts)
- Payment plan details (list of active plans)

### Color Scheme

- **Recovery Rate:**
  - 0-20%: Red (`#ef4444`)
  - 21-40%: Orange (`#f97316`)
  - 41-60%: Yellow (`#eab308`)
  - 61-80%: Light Green (`#84cc16`)
  - 81-100%: Green (`#22c55e`)
  - >100%: Dark Green (`#16a34a`)

- **ROI:**
  - Negative: Red (`#ef4444`)
  - 0-50%: Yellow (`#eab308`)
  - 51-100%: Light Green (`#84cc16`)
  - >100%: Green (`#22c55e`)

### Responsive Design

- **Desktop (>1200px):** Full table with all columns
- **Tablet (768-1200px):** Hide payment plan count column, stack summary cards 2×2
- **Mobile (<768px):** Card-based layout, one portfolio per card, sort/filter in bottom sheet

---

## Business Value

### For Debt Collection Agencies

1. **Portfolio Health Monitoring**
   - Identify underperforming portfolios requiring intervention
   - Track cumulative ROI on each investment
   - Prioritize resources to highest-value portfolios

2. **Investment Decision Making**
   - Compare performance across different portfolio types
   - Identify characteristics of high-performing portfolios
   - Inform future portfolio acquisition strategies

3. **Stakeholder Reporting**
   - Demonstrate portfolio performance to investors
   - Show ROI and recovery rates by portfolio
   - Provide transparency into collection operations

4. **Resource Allocation**
   - Focus collection efforts on portfolios with highest potential
   - Identify portfolios approaching break-even
   - Allocate staffing based on portfolio size and activity

### For Portfolio Investors

1. **Investment Performance Tracking**
   - Monitor ROI on each portfolio investment
   - Compare expected vs actual recovery rates
   - Track portfolio value appreciation over time

2. **Risk Management**
   - Identify underperforming investments early
   - Assess portfolio diversification effectiveness
   - Make informed hold/sell decisions

3. **Due Diligence**
   - Review historical portfolio performance before investment
   - Verify claimed recovery rates and ROI
   - Assess operational capability of collection agency

4. **Portfolio Optimization**
   - Identify portfolio characteristics that drive performance
   - Rebalance investment mix based on data
   - Exit underperforming positions strategically

---

## What This Proves

### ✅ Proven Insights

1. **Cumulative Portfolio Recovery**
   - Total lifetime recovery rate for each portfolio
   - Which portfolios have collected the most
   - Overall portfolio health and collection effectiveness

2. **Return on Investment (ROI)**
   - Profitability of each portfolio investment
   - How much return generated per dollar invested
   - Time to break-even and positive ROI

3. **Portfolio Composition**
   - Distribution of active vs paid debts
   - Payment plan adoption rates
   - Primary debt categories within portfolios

4. **Comparative Performance**
   - Ranking of portfolios by recovery rate or ROI
   - Best and worst performing investments
   - Performance variance across portfolio types

5. **Collection Velocity**
   - Average days to first payment (future enhancement)
   - Payment plan engagement rates
   - Active collection vs terminal status ratios

### 🎯 Validated Use Cases

- "Medical debt portfolios have 35% average recovery, outperforming credit card portfolios at 28%"
- "Portfolio P1 has 120% ROI, generating $1.20 for every $1.00 invested"
- "High-value tagged portfolios show 15% higher recovery rates than standard portfolios"
- "Portfolios with >20% payment plan adoption have 40% higher recovery rates"

---

## What This Does NOT Prove

### ❌ Not Demonstrated By This Metric

1. **Individual Debt Performance**
   - This is portfolio-level aggregation
   - For debt-level insights, use Debt Detail views
   - Cannot see which specific debts are high/low performers

2. **Time-Based Trends**
   - This is cumulative, not period-based
   - For temporal patterns, use Recovery Trends analytics
   - Cannot see how recovery rate changed over time

3. **Collection Strategy Effectiveness**
   - Does not attribute recovery to specific tactics
   - For strategy analysis, use Communication Analytics
   - Cannot determine which collection methods worked

4. **Debtor Demographics Impact**
   - Does not show recovery by debtor characteristics
   - For demographic insights, use Debtor Segmentation
   - Cannot identify which debtor types pay better

5. **Seasonal Patterns**
   - Cumulative metrics don't show seasonal variations
   - For seasonality, use Recovery Trends by month
   - Cannot identify best/worst collection periods

6. **Future Projections**
   - Shows current state, not predicted future recovery
   - For forecasting, use Predictive Analytics (future)
   - Cannot estimate ultimate recovery rate

7. **Geographic Performance**
   - Does not break down recovery by debtor location
   - For geographic insights, use Geographic Analytics (future)
   - Cannot identify high/low performing regions

### ⚠️ Common Misinterpretations to Avoid

| Claim | Why It's Wrong |
|-------|---------------|
| "30% recovery rate means 30% profit margin" | Recovery rate is not profit; doesn't account for purchase price or collection costs |
| "Negative ROI means the portfolio is worthless" | Future collections may still occur; ROI can turn positive over time |
| "Payment plan count should equal active debts" | Not all active debts have payment plans; many are in one-time payment collection |
| "Higher debt count always means better portfolio" | Quantity ≠ quality; small portfolios can outperform large ones |
| "This shows which collection method works best" | Does not attribute recovery to specific channels or tactics |

---

## Limitations & Edge Cases

### 1. New Portfolio Bias
**Problem:** Recently purchased portfolios have had less time to collect, artificially lowering their recovery rates and ROI.

**Example:**
- Portfolio A (12 months old): 45% recovery, 80% ROI
- Portfolio B (1 month old): 5% recovery, -90% ROI
- Portfolio B may appear to be failing, but it's just new

**Mitigation:**
- Add "Purchase Date" column to provide context
- Filter by date range to compare portfolios of similar age
- Add "Age" column showing months since purchase
- Use color indicators: Green = mature (>6 months), Yellow = new (<6 months)

### 2. Purchase Price vs Principal Mismatch
**Problem:** Purchase price is typically much lower than principal (face value), causing ROI to appear much higher than recovery rate.

**Example:**
- Principal: $1,000,000
- Purchase Price: $100,000 (10 cents on the dollar)
- Collected: $300,000
- Recovery Rate: 30% (300k / 1000k)
- ROI: 200% (300k - 100k) / 100k)

**User Confusion:** "Why is ROI 200% but recovery only 30%?"

**Mitigation:**
- Add tooltip explaining: "ROI compares to purchase price. Recovery rate compares to principal (face value)."
- Show both metrics side-by-side
- Add "Purchase Multiple" column: `collected / purchase price` (e.g., "3.0x")

### 3. Payment Plan Count Misinterpretation
**Problem:** Payment plan count is **unique** payment plans, not total payment plan debts.

**Example:**
- Portfolio has 1000 debts
- 100 debts are in payment plans
- But 5 payment plans cover multiple debts each
- **Payment Plan Count: 5** (not 100)

**User Confusion:** "Why are payment plans so low?"

**Mitigation:**
- Rename to "Active Payment Plans" to clarify it's plans, not debts
- Add tooltip: "Number of unique payment plans. Each plan may cover multiple debts."
- Future: Add "Payment Plan Debts" column showing debt count in payment plans

### 4. Null Average Days to First Payment
**Problem:** Currently returns `null` because calculating requires debt creation date from api-debts.

**Impact:** Users see "N/A" or "-" in the column.

**Resolution (Future):**
- Pass debt creation dates with mapping
- Calculate: `AVG(transaction.createdAt - debt.createdAt)` for first payments
- Group by portfolio

### 5. Portfolio Status Filtering
**Problem:** Only shows `ACTIVE` portfolios. Sold or closed portfolios are excluded.

**Impact:** Historical performance data is not visible.

**Future Enhancement:** Add status filter to include `SOLD` or `CLOSED` portfolios.

### 6. Pagination Performance with Large Portfolios
**Problem:** If a single portfolio has >100,000 debts, mapping step becomes slow.

**Scenario:**
- Organization has 10 portfolios
- 1 portfolio has 250,000 debts
- Mapping query: 250,000 rows × 2 columns ≈ 3 MB (acceptable)
- Query time: ~500ms (slightly slow)

**Mitigation:**
- Add database index on `debt.portfolio_id`
- Consider caching mapping data (future)
- Set reasonable pageSize limits (max 100 portfolios per page)

### 7. Debt Category Filtering Edge Case
**Problem:** Filtering by `debtCategory` filters debts **within** portfolios, but still returns all portfolios.

**Example:**
- Portfolio A: 500 medical debts, 500 credit card debts
- User filters by `debtCategory=MEDICAL`
- Portfolio A still appears, but metrics only include 500 medical debts
- User might think portfolio only has 500 total debts

**Mitigation:**
- Add indicator: "Filtered to MEDICAL debts only"
- Show "Debt Count (filtered)" vs "Total Debt Count"
- Add clear filter badges at top of table

---

## Complementary Analytics

### 1. Recovery Trends Analytics
**Relationship:** Temporal view of recovery patterns.

**Difference:**
- Portfolio Performance: Cumulative lifetime recovery
- Recovery Trends: Period-based cohort recovery

**Use Together:**
- Portfolio Performance: "Portfolio P1 has 35% recovery"
- Recovery Trends: "P1's recovery has improved from 20% to 35% over the past year"

### 2. Debt Detail Analytics
**Relationship:** Individual debt-level performance.

**Difference:**
- Portfolio Performance: Aggregated portfolio metrics
- Debt Detail: Drill-down into specific debts

**Use Together:**
- Portfolio Performance: Identify underperforming portfolio
- Debt Detail: Investigate which debts are dragging performance down

### 3. Communication Analytics (Future)
**Relationship:** Collection channel attribution.

**Difference:**
- Portfolio Performance: Total recovery amount
- Communication: Which channels drove the recovery

**Use Together:**
- Portfolio Performance: "Portfolio P1 recovered $750k"
- Communication: "$500k via phone calls, $200k via email, $50k via letters"

### 4. Debtor Segmentation Analytics (Future)
**Relationship:** Recovery by debtor characteristics.

**Difference:**
- Portfolio Performance: Portfolio-level aggregation
- Debtor Segmentation: Recovery by age, income, location, etc.

**Use Together:**
- Portfolio Performance: "Portfolio P1 has 35% recovery"
- Debtor Segmentation: "Debtors aged 25-40 have 45% recovery, 60+ have 20%"

### 5. Payment Plan Analytics (Future)
**Relationship:** Payment plan success rates and contribution.

**Difference:**
- Portfolio Performance: Total payment plan count
- Payment Plan Analytics: Plan completion rates, default rates, collection velocity

**Use Together:**
- Portfolio Performance: "Portfolio P1 has 120 payment plans"
- Payment Plan Analytics: "80% of plans are on track, 15% defaulted, 5% completed"

### 6. Financial P&L Analytics (Future)
**Relationship:** Profitability including costs.

**Difference:**
- Portfolio Performance: ROI based on collected vs purchase price
- Financial P&L: True profit after deducting collection costs, fees, chargebacks

**Use Together:**
- Portfolio Performance: "Portfolio P1 has 120% ROI"
- Financial P&L: "After $50k collection costs, net profit is 70% ROI"

---

## Lessons Learned

### 1. Bounded Context Challenges
**Challenge:** api-transactions needs to group by portfolio, but `Transaction` entity only has `debtId`.

**Solution:** Lightweight debt-to-portfolio mapping endpoint.

**Lesson:** When aggregation dimension is missing from a bounded context, provide a **mapping mechanism** rather than embedding data or creating tight coupling.

**Avoid:** Breaking bounded contexts by adding cross-service TypeORM relations.

---

### 2. Data Transfer Optimization
**Challenge:** Embedding 10,000 debtIds in portfolio response would create 3.6 MB payload.

**Solution:** Separate lightweight mapping endpoint with only 2 columns (id, portfolio_id).

**Lesson:** When dealing with large datasets, **optimize for minimal data transfer**:
- Only fetch what you need
- Only when you need it
- Only for the entities being processed (pagination)

**Avoid:** Embedding large arrays in primary responses.

---

### 3. Pagination Cascading
**Challenge:** Portfolio pagination (page 1, 20 results) should only fetch mapping for those 20 portfolios, not all portfolios.

**Solution:** Orchestrator extracts `portfolioIds` from paginated results, passes to mapping endpoint.

**Lesson:** **Cascade pagination** through multi-step flows:
1. Fetch paginated primary data
2. Extract IDs from results
3. Fetch related data only for those IDs

**Avoid:** Fetching all related data upfront, then filtering.

---

### 4. PaymentPlan Entity Structure
**Challenge:** PaymentPlan entity has `debtorId`, not `debtId`. Payment plans link to multiple debts via `PaymentPlanDebt` join table.

**Solution:** Query `PaymentPlanDebt` join table, track unique payment plan IDs per portfolio using a `Set` to avoid double-counting.

**Lesson:** When dealing with **many-to-many relationships**, always consider the join table entity. Don't assume direct relationships exist.

**Avoid:** Trying to query the main entity when the relationship is indirect.

---

### 5. Currency Precision
**Challenge:** Should currency fields be `number` or `string`?

**Solution:** Use `string` for raw currency values, `number` for calculated percentages.

**Lesson:** **JavaScript numbers use IEEE 754 floating point**, causing precision errors (e.g., 0.1 + 0.2 = 0.30000000000004). PostgreSQL `DECIMAL(12,2)` is returned by TypeORM as `string` to preserve precision. Always use strings for currency, convert only for calculation, then convert back.

**Avoid:** Storing currency as `number` in TypeScript or in database.

---

### 6. Event Orchestration Complexity
**Challenge:** Balancing between "one event per operation" vs "event chains" vs "synchronous calls".

**Solution:** Use **single request-response event pattern** with multi-step orchestration:
1. Client → api-organizations (HTTP)
2. api-organizations → orchestrator (event)
3. orchestrator → api-debts, api-transactions (HTTP with HMAC)
4. orchestrator → api-organizations (event completion)
5. api-organizations → client (HTTP response)

**Lesson:** Don't over-engineer. **Event-driven doesn't mean every internal step needs an event**. Use HTTP for internal service calls when they're part of a synchronous flow. Use events for asynchronous operations and decoupling client requests from orchestration.

**Avoid:** Multi-event chains (orchestrator → service → orchestrator → service → ...). This adds latency and complexity without benefit.

---

### 7. HMAC Authentication for Internal APIs
**Challenge:** Internal endpoints need protection, but JWT is overkill for service-to-service.

**Solution:** HMAC signature authentication with service name, timestamp, nonce, and body hash.

**Lesson:** **Service-to-service authentication should be lightweight but secure**. HMAC provides:
- Authenticity (only services with shared key can sign)
- Integrity (body cannot be tampered)
- Replay protection (timestamp + nonce)
- No token refresh needed

**Avoid:** Using JWT for internal APIs (adds overhead, requires token management).

---

### 8. Testing Multi-Service Flows
**Challenge:** Portfolio Performance spans 4 services with 3-step orchestration.

**Solution:** Use Docker Compose for E2E tests with all services running.

**Lesson:** **Integration tests are critical for orchestration flows**. Unit tests can't catch:
- HMAC auth failures
- Event pub/sub timing issues
- Data format mismatches between services
- Timeout issues

**Avoid:** Relying solely on unit tests for multi-service features.

---

## Future Expansions

### Version 2.0: Average Days to First Payment

**Problem:** Currently returns `null` because requires debt creation date.

**Solution:** Pass debt creation dates with mapping, calculate in api-transactions.

**Implementation:**
```typescript
// Modified mapping response
{
  "debt-uuid-1": {
    "portfolioId": "p1-uuid",
    "createdAt": "2024-01-15T00:00:00Z"
  }
}

// Calculate in api-transactions
const firstPayments = transactions.filter(t => t.isFirstPayment);
const avgDays = calculateAverage(
  firstPayments.map(t =>
    daysBetween(mapping[t.debtId].createdAt, t.createdAt)
  )
);
```

**Business Value:** Identify portfolios with faster payment velocity.

---

### Version 2.1: Historical Portfolio Snapshots

**Problem:** Cannot see how portfolio performance changed over time.

**Solution:** Store monthly snapshots of portfolio metrics.

**Implementation:**
- Scheduled job runs monthly
- Captures recovery rate, ROI, debt counts
- Stores in `portfolio_performance_snapshots` table
- UI shows line chart: "Recovery Rate Trend" for selected portfolio

**Visualization:** Line chart showing recovery rate progression over 12 months.

**Business Value:** Track improvement/decline, identify inflection points.

---

### Version 2.2: Portfolio Comparison View

**Problem:** Cannot compare 2-3 specific portfolios side-by-side.

**Solution:** Multi-select portfolios, show comparison table.

**Implementation:**
```
┌─────────────┬─────────┬─────────┬─────────┐
│   Metric    │   P1    │   P2    │   P3    │
├─────────────┼─────────┼─────────┼─────────┤
│ Recovery    │  35%    │  28%    │  42%    │
│ ROI         │  120%   │  95%    │  150%   │
│ Collected   │ $750k   │ $650k   │ $900k   │
│ Debts       │  1250   │  1100   │  1500   │
└─────────────┴─────────┴─────────┴─────────┘
```

**Business Value:** Direct comparison for investment decisions.

---

### Version 2.3: Portfolio Forecasting

**Problem:** Cannot predict future recovery or ROI.

**Solution:** Train ML model on historical portfolio curves.

**Implementation:**
- Features: Portfolio age, debt count, purchase multiple, payment plan rate, primary debt category
- Target: Recovery rate at 6, 12, 18, 24 months
- Model: Gradient boosting (XGBoost)
- Output: Projected recovery rate with confidence interval

**Visualization:** Dashed line for projections beyond current date.

**Business Value:** Early warning for underperforming portfolios, inform hold/sell decisions.

---

### Version 2.4: Collection Cost Attribution

**Problem:** ROI doesn't account for collection costs.

**Solution:** Track collection expenses per portfolio.

**Implementation:**
- Add `collection_costs` tracking to portfolio
- Calculate: Net ROI = `((collected - costs - purchase price) / purchase price) × 100`
- Show both Gross ROI and Net ROI

**Business Value:** True profitability assessment, identify cost-inefficient portfolios.

---

### Version 2.5: Portfolio Risk Scoring

**Problem:** Cannot assess portfolio risk/quality.

**Solution:** Calculate risk score based on multiple factors.

**Implementation:**
```typescript
const riskScore = calculateRiskScore({
  debtAge: averageDebtAge,
  principalAmount: totalPrincipal,
  paymentPlanDefaultRate: defaultRate,
  chargeOffRate: chargeOffRate,
  timeWithoutPayment: daysSinceLastPayment,
});

// Score 0-100: 0 = high risk, 100 = low risk
```

**Visualization:** Risk indicator badge (High/Medium/Low).

**Business Value:** Prioritize high-risk portfolios for intervention.

---

### Version 2.6: Portfolio Health Dashboard

**Problem:** Need real-time overview of portfolio health.

**Solution:** WebSocket-based live dashboard.

**Implementation:**
- Top metrics: Total portfolios, overall recovery, total collected, avg ROI
- Heat map: Portfolios color-coded by performance
- Alert feed: Real-time notifications for underperformance
- Trend sparklines: 30-day mini-charts for each metric

**Business Value:** Operations monitoring, immediate visibility into issues.

---

### Version 2.7: Portfolio Tags Performance Analysis

**Problem:** Cannot determine if certain portfolio types perform better.

**Solution:** Group portfolios by tags, compare aggregated metrics.

**Implementation:**
```
GET /analytics/portfolio-performance?groupBy=TAG

Returns:
{
  "high-value": { avgRecoveryRate: 45%, avgROI: 150% },
  "medical": { avgRecoveryRate: 35%, avgROI: 120% },
  "credit-card": { avgRecoveryRate: 28%, avgROI: 95% }
}
```

**Visualization:** Bar chart comparing tags.

**Business Value:** Identify best-performing portfolio characteristics.

---

### Version 2.8: Debt Composition Drill-Down

**Problem:** Cannot see breakdown of debt statuses within portfolio.

**Solution:** Expandable row showing detailed status breakdown.

**Implementation:**
```
Portfolio P1: 1250 debts
├─ Active: 800 (64%)
│  ├─ In Collection: 650
│  └─ Payment Plan: 150
├─ Paid: 350 (28%)
│  ├─ Paid in Full: 280
│  └─ Settled: 70
└─ Terminal: 100 (8%)
   ├─ Charged Off: 60
   └─ Disputed: 40
```

**Business Value:** Understand portfolio composition, identify collection opportunities.

---

### Version 3.0: Portfolio Performance API Export

**Problem:** Users want to export data to Excel or integrate with BI tools.

**Solution:** Add export endpoints.

**Implementation:**
```
GET /analytics/portfolio-performance/export?format=csv
GET /analytics/portfolio-performance/export?format=xlsx
GET /analytics/portfolio-performance/export?format=json
```

**Business Value:** Integration with external reporting tools, offline analysis.

---

## Testing Strategy

### Unit Tests

**Location:** `apps/api-organizations/src/analytics/analytics.service.spec.ts`

**Test Cases:**
1. ✅ Portfolio performance orchestration request flow
2. ✅ Event publication and response handling
3. ✅ Organization validation
4. ✅ Service unavailability handling
5. ✅ Timeout handling

**Location:** `packages/event-orchestrator/src/orchestrators/analytics-portfolio-performance.orchestrator.spec.ts`

**Test Cases:**
1. ✅ 3-step orchestration flow (debts → mapping → payments)
2. ✅ Data merging logic (debt + payment data)
3. ✅ Recovery rate calculation
4. ✅ ROI calculation
5. ✅ Sorting by different fields (RECOVERY_RATE, ROI, COLLECTED, DEBT_COUNT)
6. ✅ Pagination handling
7. ✅ Overall metrics calculation (totalInvested, overallRecoveryRate)
8. ✅ Empty portfolio handling (no debts found)

**Location:** `apps/api-debts/src/internal/analytics/analytics.service.spec.ts`

**Test Cases:**
1. ✅ Portfolio debt metrics aggregation
2. ✅ Debt-to-portfolio mapping generation
3. ✅ Portfolio filtering (portfolioId, tags, date range)
4. ✅ Debt category filtering within portfolios
5. ✅ Primary debt category determination
6. ✅ Pagination with portfolioIds filter (mapping endpoint)

**Location:** `apps/api-transactions/src/internal/analytics/analytics.service.spec.ts`

**Test Cases:**
1. ✅ Payment aggregation by portfolio using mapping
2. ✅ PaymentPlanDebt join table query
3. ✅ Unique payment plan counting (no double-counting)
4. ✅ Transaction filtering by date range
5. ✅ Handling debts not in mapping (should skip)
6. ✅ Empty mapping handling

### Integration Tests

**Location:** `apps/api-organizations/src/analytics/analytics.integration.spec.ts`

**Test Cases:**
1. ✅ End-to-end request flow (client → orchestrator → services → response)
2. ✅ HMAC authentication between services
3. ✅ Event orchestration timing (should complete within 10 seconds)
4. ✅ Mapping strategy: Only fetch debts for paginated portfolios
5. ✅ Payment plan aggregation via PaymentPlanDebt
6. ✅ Error handling (one service fails, error returned)
7. ✅ Large dataset performance (>10,000 debts per portfolio)

### E2E Tests

**Location:** `e2e/analytics/portfolio-performance.e2e.spec.ts`

**Test Cases:**
1. ✅ UI displays portfolio table with correct data
2. ✅ Sorting by recovery rate works
3. ✅ Sorting by ROI works
4. ✅ Date range filter works
5. ✅ Portfolio tag filter works
6. ✅ Pagination controls work
7. ✅ Loading states display correctly
8. ✅ Error states display correctly
9. ✅ Mobile responsive behavior

### Data Validation Tests

**Purpose:** Ensure calculated metrics match expected values.

**Test Cases:**

1. ✅ **Known dataset:**
```typescript
// Portfolio P1: Purchase price $100k, Principal $1M, Collected $300k
expect(p1.recoveryRate).toBeCloseTo(30.0, 2);  // 300k / 1M
expect(p1.roi).toBeCloseTo(200.0, 2);          // (300k - 100k) / 100k
```

2. ✅ **Zero collections:**
```typescript
// Portfolio P2: Principal $500k, Collected $0
expect(p2.recoveryRate).toBe(0);
expect(p2.roi).toBe(-100);  // Lost entire investment
```

3. ✅ **Exactly break-even:**
```typescript
// Portfolio P3: Purchase $200k, Collected $200k
expect(p3.roi).toBe(0);  // Break-even
```

4. ✅ **Multiple portfolios - overall metrics:**
```typescript
// P1: Invested $100k, Collected $300k, Principal $1M
// P2: Invested $200k, Collected $400k, Principal $2M
const totalInvested = 100k + 200k = 300k
const totalCollected = 300k + 400k = 700k
const totalPrincipal = 1M + 2M = 3M
expect(overall.totalInvested).toBe("300000.00");
expect(overall.totalPaymentsCollected).toBe("700000.00");
expect(overall.overallRecoveryRate).toBeCloseTo(23.33, 2);  // 700k / 3M
```

5. ✅ **Payment plan counting (no double-count):**
```typescript
// Portfolio P1 has 1000 debts
// 3 payment plans cover 150 debts
// PaymentPlanDebt join table has 150 rows (1 per debt)
// But only 3 unique paymentPlanIds
expect(p1.paymentPlanCount).toBe(3);  // NOT 150
```

---

## Troubleshooting

### Issue 1: All portfolios show 0% recovery

**Symptoms:** Recovery rates all 0%, even though payments exist.

**Possible Causes:**
1. Payments exist but not linked to any debts (orphaned payments)
2. Debt-to-portfolio mapping is empty
3. Date filters exclude all payments

**Diagnosis:**
```bash
# Check if mapping is being fetched
curl 'http://localhost:3003/internal/analytics/debt-portfolio-map/{orgId}?portfolioIds=p1,p2'

# Check if payments exist for the debts
curl 'http://localhost:3005/internal/analytics/portfolio-performance/{orgId}' \
  -X POST \
  -d '{"debtToPortfolioMap": {"debt1": "p1"}}'
```

**Resolution:**
- Verify debts have `portfolioId` set (not null)
- Verify payments have `debtId` set
- Check database foreign key relationships
- Verify mapping is passed correctly to api-transactions

---

### Issue 2: Payment plan counts are unexpectedly low

**Symptoms:** Portfolio has 500 active debts, but only 5 payment plans.

**Possible Causes:**
1. Misunderstanding: Payment plan count is **unique plans**, not debts in plans
2. PaymentPlanDebt join table is missing rows
3. Payment plans are debtor-scoped, not debt-scoped

**Diagnosis:**
```sql
-- Check PaymentPlanDebt join table
SELECT pp.id, ppd.debt_id, d.portfolio_id
FROM payment_plans pp
JOIN payment_plan_debts ppd ON ppd.payment_plan_id = pp.id
JOIN debts d ON d.id = ppd.debt_id
WHERE d.portfolio_id = 'p1-uuid';
```

**Resolution:**
- Confirm understanding: Each payment plan can cover multiple debts
- Verify PaymentPlanDebt join table is populated correctly
- Check if debts have `PAYMENT_PLAN` status but no PaymentPlanDebt rows

---

### Issue 3: Extremely high ROI (>1000%)

**Symptoms:** ROI showing 5000%, 10000%, or other extreme values.

**Possible Causes:**
1. Purchase price is very low (pennies on the dollar)
2. Collections are duplicated in aggregation
3. Purchase price is accidentally 0

**Diagnosis:**
```bash
# Check raw portfolio data
curl 'http://localhost:3003/internal/analytics/portfolio-performance/{orgId}'

# Look for:
# - purchasePrice: "0.00" (should never be 0)
# - Duplicate portfolios in response
```

**Resolution:**
- Add validation: `if (purchasePrice === 0) throw error`
- Add constraint: `purchasePrice > 0` in database
- Add sanity check: `if (roi > 10000%) log warning`

---

### Issue 4: Orchestrator timeout (503 error)

**Symptoms:** Request times out after 30 seconds, returns 503.

**Possible Causes:**
1. api-debts or api-transactions is down
2. Large portfolio (>100k debts) causing slow mapping query
3. Missing database indexes
4. Pub/Sub message delivery delay

**Diagnosis:**
```bash
# Check service health
curl http://localhost:3003/health  # api-debts
curl http://localhost:3005/health  # api-transactions

# Check orchestrator logs
docker logs verichron-event-orchestrator-test | grep "PortfolioPerformance"

# Check query performance
EXPLAIN ANALYZE
SELECT id, portfolio_id
FROM debts
WHERE organization_id = 'uuid'
  AND portfolio_id IN ('p1', 'p2', ..., 'p20');
```

**Resolution:**
- Add index: `CREATE INDEX idx_debts_org_portfolio ON debts(organization_id, portfolio_id)`
- Increase orchestrator timeout to 60s
- Add query result caching for mapping endpoint
- Reduce pageSize to 10 or 20 (from 100)

---

### Issue 5: Mapping step fails with "too many rows"

**Symptoms:** api-debts returns error: "Query exceeded maximum rows".

**Possible Causes:**
1. Single portfolio has >500,000 debts
2. Too many portfolios requested (page size too large)
3. Database connection pool exhausted

**Diagnosis:**
```bash
# Check portfolio size
SELECT portfolio_id, COUNT(*)
FROM debts
WHERE organization_id = 'uuid'
GROUP BY portfolio_id
ORDER BY COUNT(*) DESC;
```

**Resolution:**
- Add limit to mapping query: `LIMIT 100000`
- Return error if portfolio exceeds threshold: "Portfolio too large for mapping"
- Add pagination to mapping endpoint (future enhancement)
- Consider caching mapping for very large portfolios

---

### Issue 6: Recovery rate > 100%

**Symptoms:** Portfolio shows 150% recovery rate.

**Possible Causes:**
1. Interest/fees being added to collections (not just principal)
2. Payments duplicated in aggregation
3. Principal amount calculation error

**Expected Behavior:** Recovery rate can exceed 100% if:
- Collections include interest/fees/penalties
- Multiple payments on same debt
- Debtor overpaid and balance is negative

**Diagnosis:**
```bash
# Check if collections exceed principal
curl 'http://localhost:3005/internal/analytics/portfolio-performance/{orgId}'

# Compare totalCollected to totalPrincipal
```

**Resolution:**
- Document that >100% is valid (includes fees/interest)
- Add tooltip: "Recovery rate can exceed 100% when fees/interest are collected"
- Consider adding "Principal Recovery Rate" vs "Total Recovery Rate"

---

### Issue 7: UI shows NaN for recovery rate

**Symptoms:** Chart displays "NaN%" or blank values.

**Possible Causes:**
1. Principal amount is 0 (divide by zero)
2. String-to-number conversion failure
3. Response field name mismatch

**Diagnosis:**
```typescript
// Check browser console
console.log('Principal:', portfolio.totalPrincipal);
console.log('Collected:', portfolio.totalCollected);
console.log('Recovery:', portfolio.recoveryRate);
```

**Resolution:**
```typescript
// Add null coalescing in UI
const recoveryRate = portfolio?.recoveryRate ?? 0;

// Add validation in orchestrator
if (isNaN(recoveryRate) || !isFinite(recoveryRate)) {
  recoveryRate = 0;
}
```

---

### Issue 8: Date filters not working

**Symptoms:** Changing date range doesn't change results.

**Possible Causes:**
1. Date filters applied to wrong entity (filtering payments instead of portfolios)
2. Timezone conversion issues
3. Query parameter not passed to orchestrator

**Diagnosis:**
```bash
# Check query parameters being sent
# Should be portfolio purchase_date, not debt created_at

# Verify api-debts filters correctly
SELECT * FROM portfolios
WHERE organization_id = 'uuid'
  AND purchase_date >= '2024-01-01'
  AND purchase_date <= '2024-12-31';
```

**Resolution:**
- Confirm date filters apply to `portfolio.purchase_date`
- Standardize on UTC timezone
- Add date validation: `if (startDate > endDate) throw error`

---

## Conclusion

Portfolio Performance analytics provides comprehensive portfolio-level insights, enabling data-driven investment and operational decisions. Understanding the **mapping strategy** and its scalability benefits is crucial for maintaining performance at scale.

**Key Takeaways:**
- ✅ Cumulative portfolio recovery and ROI, not period-based trends
- ✅ Mapping strategy enables cross-service aggregation without tight coupling
- ✅ Pagination cascading ensures scalability (only fetch what's displayed)
- ✅ PaymentPlan counting uses join table to avoid double-counting
- ✅ Use alongside Recovery Trends for complete picture (temporal + cumulative)
- ✅ ROI and recovery rate are different metrics (purchase price vs principal)

**Architectural Lessons:**
- 🎯 Lightweight mapping > embedding large arrays
- 🎯 Bounded context independence > direct service coupling
- 🎯 Pagination cascading > fetch-all-then-filter
- 🎯 Join table awareness > assuming direct relationships
- 🎯 Currency precision (strings) > JavaScript number precision

For questions or issues, contact the Platform Engineering team or refer to the [Analytics API Documentation](../README.md).
