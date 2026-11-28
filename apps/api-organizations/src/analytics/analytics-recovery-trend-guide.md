# Recovery Trends Analytics Guide

**Version:** 1.0
**Last Updated:** 2025-12-04
**Status:** Production Ready
**Endpoint:** `GET /orgs/:orgId/analytics/recovery-trends`

---

## Table of Contents
1. [Overview](#overview)
2. [Technical Architecture](#technical-architecture)
3. [Request Flow](#request-flow)
4. [Data Aggregation Logic](#data-aggregation-logic)
5. [User Expectations](#user-expectations)
6. [Visualization Guidelines](#visualization-guidelines)
7. [Business Value](#business-value)
8. [What This Proves](#what-this-proves)
9. [What This Does NOT Prove](#what-this-does-not-prove)
10. [Limitations & Edge Cases](#limitations--edge-cases)
11. [Complementary Analytics](#complementary-analytics)
12. [Future Expansions](#future-expansions)
13. [Testing Strategy](#testing-strategy)
14. [Troubleshooting](#troubleshooting)

---

## Overview

**Recovery Trends** is a time-series analytics feature that visualizes the relationship between debt principal amounts and payment collections over time, calculating recovery rates on a period-by-period basis.

### Purpose
To provide debt collection organizations with insight into:
- Collection performance trends over time
- Recovery rate patterns by time period
- Effectiveness of collection strategies
- Portfolio performance cohort analysis

### Calculation Method
```
Recovery Rate (per period) = (Amount Collected in Period / Principal of Debts Created in Period) × 100
```

**Important:** This is a **cohort-based** recovery calculation, not a cumulative portfolio recovery rate.

---

## Technical Architecture

### Microservices Involved

1. **api-organizations** (Orchestration Layer)
   - Endpoint: `GET /orgs/:orgId/analytics/recovery-trends`
   - Role: Receives client requests, publishes orchestration events, aggregates responses
   - Location: `apps/api-organizations/src/analytics/analytics.controller.ts`

2. **event-orchestrator** (Aggregation Layer)
   - Event: `ANALYTICS_RECOVERY_TRENDS_REQUESTED`
   - Role: Fetches data from multiple services in parallel, aggregates period-based data
   - Location: `packages/event-orchestrator/src/orchestrators/analytics.orchestrator.ts`

3. **api-debts** (Data Source)
   - Endpoint: `GET /internal/analytics/recovery-trends/:orgId`
   - Role: Provides debt principal amounts and counts grouped by period
   - Location: `apps/api-debts/src/internal/analytics/analytics.service.ts`

4. **api-transactions** (Data Source)
   - Endpoint: `GET /internal/analytics/recovery-trends/:orgId`
   - Role: Provides payment collection amounts grouped by period
   - Location: `apps/api-transactions/src/internal/analytics/analytics.service.ts`

### Authentication

- **External API (api-organizations):** JWT Bearer token with required permissions
- **Internal APIs:** HMAC signature authentication between services
  - Headers: `x-service-name`, `x-timestamp`, `x-nonce`, `x-signature`
  - Prevents unauthorized internal service access

---

## Request Flow

### 1. Client Request
```http
GET /orgs/27511e09-9061-4e0e-bf62-3710586622df/analytics/recovery-trends?granularity=MONTHLY
Authorization: Bearer <jwt_token>
```

### 2. Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `granularity` | enum | No | `MONTHLY` | Time period grouping: `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY` |
| `startDate` | ISO date | No | 90 days ago | Start of date range filter |
| `endDate` | ISO date | No | Today | End of date range filter |
| `portfolioId` | UUID | No | - | Filter by specific portfolio |
| `portfolioTag` | string[] | No | - | Filter by portfolio tags (comma-separated) |
| `debtCategory` | enum | No | - | Filter by debt category |
| `groupBy` | enum | No | `NONE` | Group results: `NONE`, `DEBT_CATEGORY`, `PORTFOLIO` |

### 3. Event Orchestration Flow

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
                                    │   (Aggregator)   │
                                    └──────────────────┘
                                    │                  │
                        ④ Parallel Fetch (HMAC Auth)
                                    │                  │
                    ┌───────────────┘                  └───────────────┐
                    ▼                                                  ▼
        ┌──────────────────┐                              ┌──────────────────┐
        │   api-debts      │                              │ api-transactions │
        │   (Internal)     │                              │   (Internal)     │
        └──────────────────┘                              └──────────────────┘
                    │                                                  │
                    │ ⑤ Return Data                                   │
                    └───────────────┐                  ┌───────────────┘
                                    │                  │
                                    ▼                  ▼
                                    ┌──────────────────┐
                                    │ Event Orchestrator│
                                    │  (Aggregate)     │
                                    └──────────────────┘
                                             │
                                             │ ⑥ Publish Completion
                                             ▼
                                    ┌──────────────────┐
                                    │ Google Pub/Sub   │
                                    └──────────────────┘
                                             │
                                             │ ⑦ Receive Response
                                             ▼
                                    ┌──────────────────┐
                                    │ api-organizations│
                                    │   (Listener)     │
                                    └──────────────────┘
                                             │
                                             │ ⑧ HTTP Response
                                             ▼
                                    ┌──────────────────┐
                                    │     Client       │
                                    └──────────────────┘
```

### 4. Response Structure

```json
{
  "organizationId": "27511e09-9061-4e0e-bf62-3710586622df",
  "correlationId": "6a662936-61eb-4817-9b27-f9afbe073ee1",
  "trends": {
    "orgId": "27511e09-9061-4e0e-bf62-3710586622df",
    "startDate": "2025-09-05",
    "endDate": "2025-12-04",
    "granularity": "MONTHLY",
    "trends": [
      {
        "period": "2025-12",
        "principalOwed": "2668029.35",
        "amountCollected": "56620.67",
        "recoveryRate": 2.12,
        "debtCount": 529
      }
    ],
    "totalCollected": "1074148.33",
    "avgRecoveryRate": 40.26,
    "generatedAt": "2025-12-04T11:18:27.812Z"
  }
}
```

---

## Data Aggregation Logic

### Step 1: Debt Data Collection (api-debts)

**Query:**
```sql
SELECT
  TO_CHAR(debt.created_at, 'YYYY-MM') AS period,
  SUM(CAST(debt.principalAmount AS DECIMAL)) AS totalPrincipal,
  COUNT(debt.id) AS debtCount
FROM debts debt
WHERE debt.organizationId = :organizationId
  AND debt.createdAt >= :startDate
  AND debt.createdAt <= :endDate
GROUP BY period
ORDER BY period ASC
```

**Returns:** Debts **created** in each period with their total principal amounts.

### Step 2: Transaction Data Collection (api-transactions)

**Query:**
```sql
SELECT
  TO_CHAR(transaction.created_at, 'YYYY-MM') AS period,
  SUM(CAST(transaction.amount AS DECIMAL)) AS totalCollected,
  COUNT(transaction.id) AS transactionCount
FROM transaction_history transaction
WHERE transaction.organizationId = :organizationId
  AND transaction.type = 'PAYMENT'
  AND transaction.status = 'SUCCEEDED'
  AND transaction.createdAt >= :startDate
  AND transaction.createdAt <= :endDate
GROUP BY period
ORDER BY period ASC
```

**Returns:** Payments **collected** in each period.

### Step 3: Period Aggregation (event-orchestrator)

**Algorithm:**
```typescript
const periodMap = new Map<string, { collected: number; principal: number; debtCount: number }>();

// Add payment data
payments.forEach((p) => {
  const existing = periodMap.get(p.period) || { collected: 0, principal: 0, debtCount: 0 };
  existing.collected += parseFloat(p.totalCollected || '0');
  periodMap.set(p.period, existing);
});

// Add debt data
debts.forEach((d) => {
  const existing = periodMap.get(d.period) || { collected: 0, principal: 0, debtCount: 0 };
  existing.principal += parseFloat(d.totalPrincipal || '0');
  existing.debtCount += d.debtCount || 0;
  periodMap.set(d.period, existing);
});

// Calculate recovery rates
const trends = Array.from(periodMap.entries()).map(([period, data]) => ({
  period,
  principalOwed: data.principal.toFixed(2),
  amountCollected: data.collected.toFixed(2),
  recoveryRate: data.principal > 0 ? (data.collected / data.principal) * 100 : 0,
  debtCount: data.debtCount,
}));
```

**Key Logic:**
- Creates a union of all periods from both debts and payments
- Periods with only payments (no debts created) will have `principalOwed: 0` and `recoveryRate: 0`
- Periods with only debts (no payments) will have `amountCollected: 0` and `recoveryRate: 0`
- Recovery rate is only meaningful when principal > 0

### Step 4: Overall Metrics Calculation

```typescript
const totalCollected = trends.reduce((sum, t) => sum + parseFloat(t.amountCollected), 0);
const totalPrincipal = trends.reduce((sum, t) => sum + parseFloat(t.principalOwed), 0);
const avgRecoveryRate = totalPrincipal > 0 ? (totalCollected / totalPrincipal) * 100 : 0;
```

---

## User Expectations

### What Users Should Expect to See

1. **Time-Series Chart**
   - X-axis: Time periods (days, weeks, months, quarters, years)
   - Y-axis: Recovery rate percentage (0-100%)
   - Data points showing recovery rate for each period

2. **Period-Based Recovery Rates**
   - Each period shows the recovery rate for debts **created in that period**
   - NOT cumulative portfolio recovery
   - NOT lifetime debt recovery

3. **Zero Recovery Rates**
   - Periods with collections but no debt creation will show 0%
   - This is **expected behavior**, not a bug
   - Indicates collections on debts from prior periods

4. **Overall Metrics**
   - `totalCollected`: Sum of all payments across all periods
   - `avgRecoveryRate`: Total collected / Total principal (cohort-weighted average)

### Common Misunderstandings

❌ **Misconception:** "Why do periods with collections show 0% recovery?"
✅ **Reality:** Recovery rate is calculated per cohort. Collections in a period may be for debts created in different periods.

❌ **Misconception:** "The avg recovery rate should be the average of all period rates."
✅ **Reality:** It's a weighted average based on total collected / total principal across all periods.

❌ **Misconception:** "Recovery rate should show cumulative portfolio performance."
✅ **Reality:** This is cohort analysis. Use Portfolio Performance analytics for cumulative metrics.

---

## Visualization Guidelines

### Recommended Chart Type
**Area Chart with Line Overlay** (D3.js implementation in `RecoveryTrendsChart.tsx`)

### Visual Components

1. **Primary Line:** Recovery rate percentage
   - Color: Primary brand color (e.g., blue)
   - Line weight: 3px
   - Points: 5px radius circles on hover

2. **Shaded Area:** Gradient fill under the line
   - Top: 50% opacity of primary color
   - Bottom: 0% opacity (transparent)
   - Provides visual weight to the trend

3. **X-Axis:** Period labels
   - Rotated -45° for readability
   - Format based on granularity:
     - Daily: `YYYY-MM-DD`
     - Weekly: `YYYY-WXX`
     - Monthly: `YYYY-MM`
     - Quarterly: `YYYY-QX`
     - Yearly: `YYYY`

4. **Y-Axis:** Recovery rate percentage
   - Range: 0-100% (or max value if higher)
   - Grid lines: Dashed, low opacity
   - Label: "Recovery Rate (%)"

5. **Tooltip on Hover:**
   ```
   Period: 2025-12
   Recovery Rate: 2.1%
   Amount Collected: $56,620.67
   Principal Owed: $2,668,029.35
   Debts: 529
   ```

6. **Summary Stats Above Chart:**
   - Total Collected: $1,074,148.33
   - Average Recovery Rate: 40.3%

### Responsive Design
- Desktop: Full width (max 1200px)
- Tablet: Reduce font sizes, maintain aspect ratio
- Mobile: Consider switching to vertical bar chart for better readability

---

## Business Value

### For Debt Collection Agencies

1. **Performance Tracking**
   - Monitor collection effectiveness over time
   - Identify seasonal patterns in recovery rates
   - Measure impact of process changes

2. **Portfolio Cohort Analysis**
   - Compare recovery rates across different purchase periods
   - Identify "good" vs "bad" debt acquisition periods
   - Inform future portfolio purchasing decisions

3. **Resource Allocation**
   - Allocate collection resources to higher-performing cohorts
   - Identify periods requiring additional collection efforts
   - Optimize staffing based on collection patterns

4. **Investor Reporting**
   - Demonstrate collection performance trends
   - Show improvement in recovery rates over time
   - Provide data-driven evidence of operational efficiency

### For Portfolio Investors

1. **Investment Performance**
   - Track ROI on debt portfolios by acquisition period
   - Compare expected vs actual recovery rates
   - Make informed decisions on portfolio sales/purchases

2. **Risk Assessment**
   - Identify periods with lower recovery rates
   - Assess portfolio quality trends
   - Adjust investment strategies based on recovery patterns

3. **Due Diligence**
   - Review historical recovery rate trends before investment
   - Verify claimed recovery rates with time-series data
   - Identify red flags in collection performance

---

## What This Proves

### ✅ Proven Insights

1. **Period-Based Collection Effectiveness**
   - For debts created in period X, what % was collected?
   - Which debt cohorts have the highest recovery rates?
   - Are recent cohorts performing better or worse than historical ones?

2. **Temporal Patterns**
   - Seasonal variations in recovery rates
   - Long-term trends (improving/declining performance)
   - Impact of operational changes on recovery rates

3. **Cohort Performance Comparison**
   - Compare recovery rates across different time periods
   - Identify best-performing debt acquisition periods
   - Benchmark current performance against historical averages

4. **Collection Velocity** (when grouped by short periods)
   - How quickly are debts being collected after creation?
   - Daily/weekly collection patterns
   - Time-to-recovery trends

### 🎯 Validated Use Cases

- "Debts purchased in Q4 2024 have a 35% recovery rate"
- "Monthly recovery rates improved from 20% to 40% over the past year"
- "Debts created in December consistently have lower recovery rates"
- "Our collection strategy change in March improved recovery by 15%"

---

## What This Does NOT Prove

### ❌ Not Demonstrated By This Metric

1. **Lifetime Debt Recovery**
   - This shows recovery on debts **created** in each period
   - NOT the total lifetime recovery on individual debts
   - A debt created in January may be collected over 12+ months

2. **Cumulative Portfolio Performance**
   - This is NOT a cumulative portfolio recovery rate
   - For cumulative metrics, use Portfolio Performance analytics
   - Each period is an independent cohort

3. **Payment Plan Success Rates**
   - Does not distinguish between one-time payments and payment plans
   - For payment plan analysis, see Payment Plan Analytics

4. **Debt Quality Assessment**
   - High recovery rate ≠ high-quality debts
   - May reflect aggressive collection tactics, not debt quality
   - Use Portfolio Performance for quality metrics

5. **Profitability**
   - Recovery rate ≠ profit margin
   - Does not account for purchase price, fees, or collection costs
   - Use Financial Analytics for P&L insights

6. **Debtor Behavior Patterns**
   - Does not show individual debtor payment behavior
   - For debtor-level insights, use Debtor Analytics

7. **Collection Channel Attribution**
   - Does not show which collection method worked
   - Cannot attribute recovery to phone calls, emails, letters, etc.
   - Use Communication Analytics for channel attribution

### ⚠️ Common Misinterpretations to Avoid

| Claim | Why It's Wrong |
|-------|---------------|
| "40% overall recovery means we collected 40% of total debt" | Only applies to debts created in the date range, not entire portfolio |
| "0% recovery in January means no payments were made" | Means no debts were **created** in January; payments may have been made on older debts |
| "Recovery rate is declining" | May be recency bias - newer debts have had less time to be collected |
| "This portfolio is 50% profitable" | Recovery rate is not the same as profit margin |

---

## Limitations & Edge Cases

### 1. Recency Bias
**Problem:** Recently created debts have had less time to be collected, artificially lowering their recovery rates.

**Example:**
- Debts created 1 month ago: 5% recovery
- Debts created 12 months ago: 50% recovery
- Trend shows "declining recovery" but it's just time-based

**Mitigation:**
- Add a time-in-collection filter (e.g., "only show debts > 3 months old")
- Use cohort maturity curves (see Future Expansions)
- Compare cohorts at same age (e.g., 6-month recovery for all cohorts)

### 2. Zero-Principal Periods
**Problem:** Periods with collections but no debt creation show 0% recovery.

**Why:** `recoveryRate = collected / principal`, so `principal = 0` → `recoveryRate = 0`.

**User Impact:** Chart may have many 0% data points, looking like poor performance.

**Mitigation:**
- Show tooltip explaining "No debts created in this period"
- Consider filtering out zero-principal periods from visualization
- Add a toggle to show "Collections Only" view

### 3. Outlier Periods
**Problem:** Periods with very few debts can have extreme recovery rates (e.g., 1 debt fully paid = 100%).

**Example:**
- Period A: 500 debts, 30% recovery
- Period B: 2 debts, 100% recovery (both paid in full)

**Mitigation:**
- Add debt count threshold filter (e.g., "only show periods with >10 debts")
- Show debt count in tooltip for context
- Use color intensity to indicate confidence (darker = more debts)

### 4. Debt Status Not Considered
**Problem:** Calculation doesn't account for debt status (active, charged-off, settled).

**Impact:** Recovery rate includes charged-off debts in principal, lowering the rate.

**Future Enhancement:** Add option to exclude terminal statuses from calculation.

### 5. Date Range Sensitivity
**Problem:** Short date ranges may not show meaningful trends.

**Recommendation:** Default to 90 days minimum, suggest 12+ months for trend analysis.

### 6. GroupBy Limitations
**Problem:** Grouping by portfolio or debt category creates many small time series.

**Mitigation:** Limit to top 10 groups, provide aggregated "Other" category.

---

## Complementary Analytics

These analytics work together to provide a complete picture:

### 1. Portfolio Performance Analytics
**Relationship:** Cumulative recovery rate for entire portfolios.

**Difference:**
- Recovery Trends: Period-based cohort recovery
- Portfolio Performance: Lifetime portfolio recovery

**Use Together:**
- Recovery Trends shows temporal patterns
- Portfolio Performance shows overall portfolio health

### 2. Payment Plan Analytics
**Relationship:** Breakdown of collections by payment plan vs one-time payments.

**Difference:**
- Recovery Trends: Total collections regardless of method
- Payment Plan: Attribution by payment type

**Use Together:**
- Recovery Trends shows "how much"
- Payment Plan shows "how" (payment method)

### 3. Communication Analytics
**Relationship:** Collection channel attribution (phone, email, SMS, letters).

**Difference:**
- Recovery Trends: Total recovery rate
- Communication: Which channel drove the recovery

**Use Together:**
- Recovery Trends shows performance
- Communication shows effective channels

### 4. Debtor Segmentation Analytics
**Relationship:** Recovery rates by debtor demographics or behavior.

**Difference:**
- Recovery Trends: Time-based view
- Debtor Segmentation: People-based view

**Use Together:**
- Recovery Trends shows "when"
- Debtor Segmentation shows "who"

### 5. Geographic Performance Analytics
**Relationship:** Recovery rates by debtor location.

**Difference:**
- Recovery Trends: Time dimension
- Geographic: Location dimension

**Use Together:**
- Recovery Trends shows temporal patterns
- Geographic shows regional patterns

### 6. Debt Age Cohort Analytics
**Relationship:** Recovery rate by time since debt origination.

**Difference:**
- Recovery Trends: Creation period cohorts
- Debt Age: Time-since-origination cohorts

**Use Together:**
- Recovery Trends: "When were debts purchased?"
- Debt Age: "How old were debts when purchased?"

---

## Future Expansions

### Version 2.0: Time-in-Collection Normalization

**Problem:** Newer cohorts appear to underperform due to less collection time.

**Solution:** Compare cohorts at same age.

**Implementation:**
```
GET /analytics/recovery-trends?normalizeBy=collectionAge&ageMonths=6
```

**Returns:** Recovery rate for each cohort at exactly 6 months of collection age.

**Business Value:** Fair comparison across cohorts, removes recency bias.

---

### Version 2.1: Projected Recovery Rates

**Problem:** Cannot predict future recovery for recent cohorts.

**Solution:** Use historical cohort curves to project future recovery.

**Implementation:**
- Train ML model on historical cohort recovery curves
- Project future recovery for recent cohorts
- Show "actual" vs "projected" on chart

**Visualization:** Dashed line for projections, solid for actual.

**Business Value:** Early warning system for underperforming cohorts.

---

### Version 2.2: Recovery Rate Decomposition

**Problem:** Cannot see what's driving recovery rate changes.

**Solution:** Break down recovery into components.

**Metrics:**
- One-time payment recovery %
- Payment plan recovery %
- Settlement recovery %
- Legal recovery %

**Visualization:** Stacked area chart showing contribution of each method.

**Business Value:** Identify which collection strategies are effective.

---

### Version 2.3: Comparative Benchmarking

**Problem:** Cannot tell if recovery rates are good or bad without context.

**Solution:** Add industry benchmark lines.

**Implementation:**
- Overlay industry average recovery rate
- Show percentile ranking (e.g., "75th percentile")
- Add peer comparison (anonymized)

**Visualization:** Dashed line for benchmark, shaded area for percentile range.

**Business Value:** Competitive positioning, investor confidence.

---

### Version 2.4: Portfolio Tag Comparison

**Problem:** Cannot compare recovery rates across portfolio types.

**Solution:** Add multi-series grouping by portfolio tags.

**Implementation:**
```
GET /analytics/recovery-trends?groupBy=PORTFOLIO_TAG
```

**Returns:** Separate trend line for each portfolio tag.

**Visualization:** Multi-line chart, color-coded by tag.

**Business Value:** Identify best-performing portfolio types.

---

### Version 2.5: Predictive Collection Scheduling

**Problem:** Don't know optimal time to collect on different cohorts.

**Solution:** Use recovery curves to suggest collection timing.

**Implementation:**
- Analyze when each cohort recovers fastest
- Suggest optimal collection windows
- Predict diminishing returns point

**Business Value:** Resource optimization, improved collection efficiency.

---

### Version 3.0: Real-Time Recovery Dashboard

**Problem:** Trends update only daily, cannot track intraday performance.

**Solution:** WebSocket-based real-time updates.

**Implementation:**
- Stream transaction events to frontend
- Update chart in real-time as payments come in
- Show "live" indicator on chart

**Business Value:** Operations monitoring, immediate feedback on campaigns.

---

### Version 3.1: Recovery Rate Alerts

**Problem:** Cannot proactively respond to underperforming cohorts.

**Solution:** Automated alerts when recovery rates drop.

**Implementation:**
- Set threshold rules (e.g., "alert if < 20%")
- Email/SMS notifications to managers
- Suggested actions based on patterns

**Business Value:** Proactive management, faster response to issues.

---

## Testing Strategy

### Unit Tests

**Location:** `apps/api-organizations/src/analytics/analytics.service.spec.ts`

**Test Cases:**
1. ✅ Recovery rate calculation with normal data
2. ✅ Zero principal handling (should return 0%, not error)
3. ✅ Zero collections handling
4. ✅ Date range filtering
5. ✅ Granularity conversions (daily, weekly, monthly, etc.)
6. ✅ GroupBy aggregation logic
7. ✅ Outlier handling (extremely high/low rates)

### Integration Tests

**Location:** `apps/api-organizations/src/analytics/analytics.integration.spec.ts`

**Test Cases:**
1. ✅ End-to-end request flow (client → api-organizations → orchestrator → services → response)
2. ✅ HMAC authentication between services
3. ✅ Event orchestration timing (should complete within 5 seconds)
4. ✅ Parallel data fetching (debts and transactions fetched concurrently)
5. ✅ Error handling (one service fails, other continues)
6. ✅ Large dataset performance (>10,000 debts)

### E2E Tests

**Location:** `e2e/analytics/recovery-trends.e2e.spec.ts`

**Test Cases:**
1. ✅ UI displays chart with correct data
2. ✅ Tooltip shows on hover
3. ✅ Granularity selector works
4. ✅ Date range filter works
5. ✅ GroupBy selector works
6. ✅ Loading states display correctly
7. ✅ Error states display correctly
8. ✅ Mobile responsive behavior

### Data Validation Tests

**Purpose:** Ensure calculated metrics match expected values.

**Test Cases:**
1. ✅ Known dataset: 100 debts ($100k principal), 50 payments ($30k) = 30% recovery
2. ✅ Zero collections period: Should show 0% without error
3. ✅ No debts created: Should show $0 principal, collections still visible
4. ✅ Single debt, single payment: 100% recovery
5. ✅ Multiple periods: Each period calculated independently
6. ✅ Overall metrics: Sum across all periods

**Validation Script:**
```typescript
// Test: 100 debts totaling $100,000 principal, $30,000 collected
expect(response.trends.avgRecoveryRate).toBeCloseTo(30.0, 2);
expect(response.trends.totalCollected).toBe("30000.00");

// Test: Period with no debts created
const periodWithNoDebts = response.trends.trends.find(t => t.debtCount === 0);
expect(periodWithNoDebts.recoveryRate).toBe(0);
expect(periodWithNoDebts.principalOwed).toBe("0.00");
```

---

## Troubleshooting

### Issue 1: All periods show 0% recovery

**Symptoms:** Chart shows all data points at 0%, even though collections exist.

**Possible Causes:**
1. Debts not created in any period (only legacy debts)
2. Date range filters exclude debt creation dates
3. Calculation error in orchestrator

**Diagnosis:**
```bash
# Check if debts exist in the date range
curl 'http://localhost:3003/internal/analytics/recovery-trends/{orgId}?startDate=2025-01-01&endDate=2025-12-31'

# Check if transactions exist
curl 'http://localhost:3005/internal/analytics/recovery-trends/{orgId}?startDate=2025-01-01&endDate=2025-12-31'
```

**Resolution:**
- Adjust date range to include debt creation periods
- Verify seed data includes debts created in target range
- Check database migration completed successfully

---

### Issue 2: Extremely high recovery rates (>100%)

**Symptoms:** Recovery rates showing 500%, 1000%, or other impossible values.

**Possible Causes:**
1. Payments duplicated in aggregation
2. Principal amount calculation error
3. Payments attributed to wrong period

**Diagnosis:**
```bash
# Check raw data from services
# Look for duplicate payments or missing principal amounts
```

**Resolution:**
- Add unique constraint on transaction aggregation
- Verify debt principal calculation includes all debts
- Add validation: `recoveryRate > 200% ? throw error`

---

### Issue 3: Orchestrator timeout (503 error)

**Symptoms:** Request times out, returns 503 Service Unavailable.

**Possible Causes:**
1. One of the internal services is down
2. Large dataset causing slow queries
3. Pub/Sub message delivery delay

**Diagnosis:**
```bash
# Check service health
curl http://localhost:3003/health  # api-debts
curl http://localhost:3005/health  # api-transactions

# Check orchestrator logs
docker logs verichron-event-orchestrator-test
```

**Resolution:**
- Restart failed service
- Add query pagination for large datasets
- Increase orchestrator timeout (default: 30s)
- Add indexes on `organizationId` + `createdAt` columns

---

### Issue 4: UI shows NaN or undefined values

**Symptoms:** Chart displays "NaN%" or missing data points.

**Possible Causes:**
1. Response field name mismatch (camelCase vs snake_case)
2. String-to-number conversion failure
3. Missing null checks in UI code

**Diagnosis:**
```typescript
// Check browser console for errors
// Look for: "Cannot read property 'X' of undefined"

// Verify response structure matches UI expectations
console.log(JSON.stringify(response, null, 2));
```

**Resolution:**
- Add null coalescing: `const rate = data?.recoveryRate ?? 0`
- Validate response schema with Zod or similar
- Add PropTypes/TypeScript strict mode

---

### Issue 5: Mismatched period labels

**Symptoms:** Chart shows "2025-12" but data is for "2025-01".

**Possible Causes:**
1. Timezone conversion issues
2. Different date formatting between services
3. Period aggregation off by one

**Diagnosis:**
```sql
-- Check actual date values in database
SELECT created_at, TO_CHAR(created_at, 'YYYY-MM') AS period
FROM debts
LIMIT 10;
```

**Resolution:**
- Standardize on UTC timezone across all services
- Use consistent date formatting (ISO 8601)
- Add timezone to all timestamp columns

---

## Conclusion

Recovery Trends analytics provides essential insights into period-based collection performance, enabling data-driven decisions for debt collection organizations and investors. Understanding the cohort-based nature of this metric is crucial for proper interpretation and business application.

**Key Takeaways:**
- ✅ Period cohort analysis, not cumulative recovery
- ✅ 0% recovery in a period may indicate no debts created, not no collections
- ✅ Use alongside Portfolio Performance for complete picture
- ✅ Recency bias is inherent - newer cohorts appear worse
- ✅ Business value in trend identification and cohort comparison

For questions or issues, contact the Platform Engineering team or refer to the [Analytics API Documentation](../README.md).
