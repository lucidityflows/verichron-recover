# Flow Analytics Guide

**Version:** 1.0
**Last Updated:** 2025-12-05
**Status:** Production Ready
**Endpoint:** `GET /orgs/:orgId/analytics/flow`

---

## Table of Contents
1. [Overview](#overview)
2. [Technical Architecture](#technical-architecture)
3. [Request Flow](#request-flow)
4. [Data Aggregation Logic](#data-aggregation-logic)
5. [Flow Construction Algorithm](#flow-construction-algorithm)
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

**Flow Analytics** is a visual analytics feature that represents debt principal distribution using Sankey diagrams, showing how value flows from a unified source through various dimensional breakdowns (debt categories, portfolios, payment methods, geographic regions, or status transitions).

### Purpose
To provide debt collection organizations with insight into:
- Distribution of debt principal across different dimensions
- Proportional relationships between categories
- Portfolio composition and diversification
- Value concentration and risk assessment
- Strategic allocation patterns

### Core Concept

Flow analytics answers the question: **"Where is our debt principal distributed?"**

```
Source (All Debt) → Dimension Values (Categories/Portfolios) → Value Distribution
```

**Important:** This is **compositional analysis**, not temporal or performance-based.

---

## Technical Architecture

### Microservices Involved

1. **api-organizations** (Orchestration Layer)
   - Endpoint: `GET /orgs/:orgId/analytics/flow`
   - Role: Receives client requests, publishes orchestration events, aggregates responses
   - Location: `apps/api-organizations/src/analytics/analytics.controller.ts`

2. **event-orchestrator** (Aggregation Layer)
   - Event: `ANALYTICS_FLOW_REQUESTED`
   - Role: Orchestrates data collection, constructs Sankey graph structure
   - Location: `packages/event-orchestrator/src/orchestrators/analytics-flow.orchestrator.ts`

3. **api-debts** (Data Source)
   - Endpoint: `GET /internal/analytics/flow/:orgId`
   - Role: Provides debt principal grouped by dimension (DEBT_CATEGORY, PORTFOLIO)
   - Location: `apps/api-debts/src/internal/analytics/analytics.service.ts`

4. **api-transactions** (Data Source)
   - Endpoint: `GET /internal/analytics/flow/:orgId`
   - Role: Provides payment data grouped by dimension (PAYMENT_METHOD) - **future enhancement**
   - Location: `apps/api-transactions/src/internal/analytics/analytics.service.ts`
   - Status: Stubbed (requires schema changes for payment_method_type)

5. **api-debtors** (Data Source)
   - Endpoint: `GET /internal/analytics/flow/:orgId`
   - Role: Provides geographic distribution (STATE) - **future enhancement**
   - Status: Not yet implemented (requires debtor location data)

### Authentication

- **External API (api-organizations):** JWT Bearer token with required permissions
- **Internal APIs:** HMAC signature authentication between services
  - Headers: `x-service-name`, `x-timestamp`, `x-nonce`, `x-signature`

---

## Request Flow

### 1. Client Request
```http
GET /orgs/54824399-fd6d-4fab-828e-3383d8e2dcfa/analytics/flow?view=DEBT_CATEGORY
Authorization: Bearer <jwt_token>
```

### 2. Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `view` | enum | **Yes** | - | Dimension to visualize: `DEBT_CATEGORY`, `PORTFOLIO`, `PAYMENT_METHOD`, `STATE`, `STATUS_TRANSITION` |
| `startDate` | ISO date | No | - | Filter debts created after this date |
| `endDate` | ISO date | No | - | Filter debts created before this date |
| `portfolioId` | UUID | No | - | Filter to specific portfolio |
| `portfolioTag` | string[] | No | - | Filter by portfolio tags (comma-separated) |
| `debtCategory` | enum | No | - | Pre-filter by debt category |

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
                                    │  (Flow Builder)  │
                                    └──────────────────┘
                                             │
                         ④ Route by View Type
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │ api-debts│  │api-trans │  │api-debtors│
            │          │  │ (future) │  │ (future) │
            └──────────┘  └──────────┘  └──────────┘
                    │            │            │
              Returns debt   Returns pay   Returns geo
              by category    by method     by state
                    │            │            │
                    └────────────┼────────────┘
                                 │
                         ⑤ Construct Sankey Graph
                         - Create source node ("All")
                         - Create dimension nodes
                         - Create links with percentages
                         - Calculate totalValue
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
  "orgId": "54824399-fd6d-4fab-828e-3383d8e2dcfa",
  "view": "DEBT_CATEGORY",
  "nodes": [
    {
      "id": "source",
      "label": "All",
      "value": "2445302.51"
    },
    {
      "id": "debt_category-0",
      "label": "MEDICAL",
      "value": "1245302.51",
      "metadata": {
        "debtCategory": "MEDICAL"
      }
    },
    {
      "id": "debt_category-1",
      "label": "CREDIT_CARD",
      "value": "800000.00",
      "metadata": {
        "debtCategory": "CREDIT_CARD"
      }
    },
    {
      "id": "debt_category-2",
      "label": "AUTO_LOAN",
      "value": "400000.00",
      "metadata": {
        "debtCategory": "AUTO_LOAN"
      }
    }
  ],
  "links": [
    {
      "source": "source",
      "target": "debt_category-0",
      "value": "1245302.51",
      "percentage": 50.92
    },
    {
      "source": "source",
      "target": "debt_category-1",
      "value": "800000.00",
      "percentage": 32.72
    },
    {
      "source": "source",
      "target": "debt_category-2",
      "value": "400000.00",
      "percentage": 16.36
    }
  ],
  "totalValue": "2445302.51",
  "generatedAt": "2025-12-05T14:22:04.534Z"
}
```

---

## Data Aggregation Logic

### View: DEBT_CATEGORY (api-debts)

**Query:**
```sql
SELECT
  debt.debt_category AS dimensionValue,
  SUM(CAST(debt.principal_amount AS DECIMAL)) AS totalPrincipal,
  COUNT(debt.id) AS debtCount
FROM debts debt
WHERE debt.organization_id = :organizationId
  AND debt.created_at >= :startDate      -- if provided
  AND debt.created_at <= :endDate        -- if provided
  AND debt.portfolio_id = :portfolioId   -- if provided
  AND debt.debt_category = :debtCategory -- if pre-filter provided
GROUP BY debt.debt_category
ORDER BY "totalPrincipal" DESC
```

**Key Fix:** Note the quoted `"totalPrincipal"` in ORDER BY. PostgreSQL requires exact case matching for quoted identifiers created by TypeORM.

**Returns:**
```typescript
{
  debtsByDimension: [
    {
      dimensionValue: "MEDICAL",
      label: "MEDICAL",
      totalPrincipal: "1245302.51",
      debtCount: 450
    },
    {
      dimensionValue: "CREDIT_CARD",
      label: "CREDIT_CARD",
      totalPrincipal: "800000.00",
      debtCount: 320
    }
  ]
}
```

---

### View: PORTFOLIO (api-debts)

**Query:**
```sql
SELECT
  debt.portfolio_id AS dimensionValue,
  SUM(CAST(debt.principal_amount AS DECIMAL)) AS totalPrincipal,
  COUNT(debt.id) AS debtCount
FROM debts debt
WHERE debt.organization_id = :organizationId
  AND debt.portfolio_id IS NOT NULL
  AND debt.created_at >= :startDate      -- if provided
  AND debt.created_at <= :endDate        -- if provided
  AND debt.portfolio_id = :portfolioId   -- if provided
GROUP BY debt.portfolio_id
ORDER BY "totalPrincipal" DESC
```

**Enrichment:**
```typescript
// Fetch portfolio names for better labeling
const portfolio = await portfolioRepository.findOne({
  where: { id: dimensionValue },
  select: ['name'],
});

label = portfolio?.name || dimensionValue;
```

**Returns:**
```typescript
{
  debtsByDimension: [
    {
      dimensionValue: "p1-uuid",
      label: "Medical Debt Q4 2024",  // Enriched with portfolio name
      totalPrincipal: "1245302.51",
      debtCount: 450
    }
  ]
}
```

---

### View: PAYMENT_METHOD (api-transactions) - **Future**

**Status:** Stubbed - requires database schema updates.

**Problem:** Transaction table only has `paymentMethodToken` (Stripe token), not `payment_method_type` (CREDIT_CARD, ACH, CHECK, etc.).

**Required Schema Changes:**
```sql
ALTER TABLE transactions
ADD COLUMN payment_method_type VARCHAR(50);

-- Backfill from Stripe API or default
UPDATE transactions
SET payment_method_type = 'CREDIT_CARD'
WHERE payment_method_token IS NOT NULL;
```

**Future Implementation:**
```sql
SELECT
  transaction.payment_method_type AS dimensionValue,
  SUM(CAST(transaction.amount AS DECIMAL)) AS totalAmount,
  COUNT(transaction.id) AS transactionCount
FROM transactions transaction
WHERE transaction.organization_id = :organizationId
  AND transaction.created_at >= :startDate
  AND transaction.created_at <= :endDate
GROUP BY transaction.payment_method_type
ORDER BY "totalAmount" DESC
```

---

### View: STATE (api-debtors) - **Future**

**Status:** Not implemented - requires debtor location data.

**Problem:** Debtor entity lacks `state` or `address` fields.

**Required Schema Changes:**
```sql
ALTER TABLE debtors
ADD COLUMN address_state VARCHAR(2);  -- US state code

-- Optionally add full address
ALTER TABLE debtors
ADD COLUMN address_line1 VARCHAR(255),
ADD COLUMN address_line2 VARCHAR(255),
ADD COLUMN address_city VARCHAR(100),
ADD COLUMN address_zip VARCHAR(10);
```

**Future Implementation:**
```sql
SELECT
  debtor.address_state AS dimensionValue,
  SUM(CAST(debt.principal_amount AS DECIMAL)) AS totalPrincipal,
  COUNT(DISTINCT debt.id) AS debtCount
FROM debtors debtor
JOIN debts debt ON debt.debtor_id = debtor.id
WHERE debt.organization_id = :organizationId
  AND debtor.address_state IS NOT NULL
GROUP BY debtor.address_state
ORDER BY "totalPrincipal" DESC
```

---

### View: STATUS_TRANSITION - **Future**

**Status:** Not implemented - requires audit log/event history.

**Problem:** Need to track debt status changes over time to visualize transitions.

**Required Infrastructure:**
- Audit log table tracking debt status changes
- Event sourcing pattern for debt status transitions
- Historical snapshot data

**Future Implementation:**
```sql
-- Requires audit_logs table
SELECT
  CONCAT(audit.old_value, ' → ', audit.new_value) AS dimensionValue,
  COUNT(*) AS transitionCount,
  SUM(CAST(debt.principal_amount AS DECIMAL)) AS totalPrincipal
FROM audit_logs audit
JOIN debts debt ON debt.id = audit.entity_id
WHERE audit.entity_type = 'DEBT'
  AND audit.field_name = 'status'
  AND audit.organization_id = :organizationId
GROUP BY CONCAT(audit.old_value, ' → ', audit.new_value)
ORDER BY "totalPrincipal" DESC
```

---

## Flow Construction Algorithm

The orchestrator transforms flat dimension data into Sankey graph structure.

### Step 1: Fetch Dimension Data

```typescript
// Route request to appropriate service based on view
let dimensionData: FlowDimensionDataDto[];

switch (view) {
  case FlowDimension.DEBT_CATEGORY:
  case FlowDimension.PORTFOLIO:
    const debtResponse = await debtsClient.getFlowAnalytics(orgId, query);
    dimensionData = debtResponse.debtsByDimension;
    break;

  case FlowDimension.PAYMENT_METHOD:
    const txnResponse = await transactionsClient.getFlowAnalytics(orgId, query);
    dimensionData = txnResponse.paymentsByDimension;
    break;

  case FlowDimension.STATE:
    const debtorResponse = await debtorsClient.getFlowAnalytics(orgId, query);
    dimensionData = debtorResponse.debtorsByDimension;
    break;

  default:
    throw new Error(`Unsupported flow view: ${view}`);
}
```

### Step 2: Calculate Total Value

```typescript
const totalValue = dimensionData.reduce((sum, item) => {
  return sum + parseFloat(item.totalPrincipal);
}, 0);
```

### Step 3: Construct Nodes

```typescript
// Source node (represents all debt)
const nodes: FlowNodeDto[] = [
  {
    id: 'source',
    label: 'All',
    value: totalValue.toFixed(2),
  }
];

// Dimension nodes (categories, portfolios, etc.)
dimensionData.forEach((item, index) => {
  nodes.push({
    id: `${viewPrefix}-${index}`,  // e.g., "debt_category-0"
    label: item.label,
    value: item.totalPrincipal,
    metadata: createMetadata(view, item),  // Preserve dimension value
  });
});
```

**Metadata Construction:**
```typescript
function createMetadata(view: FlowDimension, item: FlowDimensionDataDto) {
  switch (view) {
    case FlowDimension.DEBT_CATEGORY:
      return { debtCategory: item.dimensionValue as DebtCategory };

    case FlowDimension.PORTFOLIO:
      return { portfolioId: item.dimensionValue };

    case FlowDimension.PAYMENT_METHOD:
      return { paymentMethod: item.dimensionValue as PaymentMethod };

    case FlowDimension.STATE:
      return { state: item.dimensionValue };

    default:
      return undefined;
  }
}
```

### Step 4: Construct Links

```typescript
const links: FlowLinkDto[] = dimensionData.map((item, index) => {
  const value = parseFloat(item.totalPrincipal);
  const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;

  return {
    source: 'source',
    target: `${viewPrefix}-${index}`,
    value: item.totalPrincipal,
    percentage: parseFloat(percentage.toFixed(2)),
  };
});
```

### Step 5: Assemble Response

```typescript
return {
  orgId,
  view,
  nodes,
  links,
  totalValue: totalValue.toFixed(2),
  generatedAt: new Date(),
};
```

---

## User Expectations

### What Users Should Expect to See

1. **Sankey Diagram Visualization**
   - Single source node labeled "All" on the left
   - Multiple target nodes (categories/portfolios) on the right
   - Gradient-colored links showing flow proportions
   - Link widths proportional to values
   - Interactive tooltips on hover

2. **Value Interpretation**
   - Values represent **debt principal**, not collections
   - For DEBT_CATEGORY/PORTFOLIO: Total principal amount per category
   - For PAYMENT_METHOD: Total payment amount per method (future)
   - For STATE: Total principal per geographic region (future)

3. **Percentage Labels**
   - Percentages shown on links >5% of total
   - Represents proportion of total value
   - Sum of all percentages = 100%

4. **Node Sizing**
   - Node height indicates relative value
   - Taller nodes = higher principal concentration
   - Allows quick visual comparison

5. **Summary Statistics**
   - Total Value: Sum of all debt principal
   - Nodes: Count of dimension values
   - Flows: Count of links (same as nodes)

### Common Misunderstandings

❌ **Misconception:** "This shows how debt flows from one category to another."
✅ **Reality:** Sankey shows compositional breakdown, not directional flow. It's a visualization of "parts of a whole", not a process flow.

❌ **Misconception:** "Values should be payment amounts."
✅ **Reality:** For DEBT_CATEGORY/PORTFOLIO views, values are principal amounts. Only PAYMENT_METHOD view uses payment amounts.

❌ **Misconception:** "Link percentages should add up to node values."
✅ **Reality:** Percentages are relative to the total (source node), not individual nodes.

❌ **Misconception:** "I should see multiple levels of flow (e.g., category → portfolio → status)."
✅ **Reality:** Version 1.0 shows single-level flows only. Multi-level flows are a future enhancement.

---

## Visualization Guidelines

### Recommended UI Components

**1. Sankey Diagram** (Primary View - D3.js)

Implementation using d3-sankey:
- Library: `d3-sankey` with `d3` core
- Width: Responsive, max 1200px
- Height: 500px minimum
- Node width: 18px
- Node padding: 24px
- Link opacity: 0.5 (hover: 0.7)
- Enable gradient coloring from source to target

**Key D3 Configuration:**
```typescript
const sankeyGenerator = sankey()
  .nodeId((d) => d.id)  // CRITICAL: Must specify nodeId accessor
  .nodeWidth(18)
  .nodePadding(24)
  .extent([[1, 1], [width - 1, height - 5]]);
```

**Common Error:** Omitting `.nodeId()` causes "missing: source" error from d3-sankey.

**2. View Selector** (Above Diagram)

```
┌─────────────┬──────────────┬────────────────┬──────────────┐
│ Debt        │ Portfolio    │ Payment Method │ Geographic   │
│ Category    │              │    (Soon)      │    (Soon)    │
│   [Active]  │              │                │              │
└─────────────┴──────────────┴────────────────┴──────────────┘
```

Implementation:
- Button group with active state
- Disabled buttons for unavailable views
- Icons for each view type (FolderKanban, GitBranch, CreditCard, MapPin)
- "(Soon)" label for future views

**3. Summary Cards** (Above View Selector)

```
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Total Value    │  │ Nodes          │  │ Flows          │
│  $2,445,302    │  │      3         │  │      3         │
└────────────────┘  └────────────────┘  └────────────────┘
```

**4. Legend & Instructions** (Below Diagram)

Explain how to interpret:
- **Nodes:** Categories/portfolios, height = value
- **Links:** Flow proportions, width = amount
- **Hover:** Detailed values and percentages
- **Percentages:** Proportion of total value

### Color Scheme

**Gradient Links:**
- Source color: Primary brand color (`hsl(var(--color-primary))`)
- Target color: Category-specific color from palette
- Gradient interpolation between source and target
- 8-color rotation for multiple categories

**Node Colors:**
```typescript
const colors = [
  'hsl(var(--color-primary))',    // Blue
  'hsl(var(--color-secondary))',  // Purple
  'hsl(var(--color-accent))',     // Teal
  '#10b981',  // emerald-500
  '#f59e0b',  // amber-500
  '#ef4444',  // red-500
  '#8b5cf6',  // violet-500
  '#06b6d4',  // cyan-500
];

const color = colors[index % colors.length];
```

### Interactive Features

**Tooltips:**
- Node hover: Display node label and value
- Link hover: Display source → target, value, percentage
- Format currency: `$2,445,302` (no decimals for large values)

**Hover States:**
- Increase opacity: links (0.5 → 0.7), nodes (1.0 → 0.7)
- Highlight connected paths
- Cursor: pointer

**Responsive Breakpoints:**
- Desktop (>1200px): Full width chart (max 1200px)
- Tablet (768-1200px): Scale to container width
- Mobile (<768px): Show error state: "Flow visualization requires larger screen"

---

## Business Value

### For Debt Collection Agencies

1. **Portfolio Composition Analysis**
   - Understand debt distribution across categories
   - Identify concentration risk (e.g., 80% medical debt)
   - Assess diversification effectiveness
   - Inform portfolio acquisition strategy

2. **Strategic Resource Allocation**
   - Prioritize categories with highest principal
   - Allocate collection staff based on value concentration
   - Focus on high-value portfolios

3. **Risk Assessment**
   - Identify over-concentration in single category
   - Detect portfolio imbalance
   - Assess exposure to category-specific regulations

4. **Performance Planning**
   - Set recovery targets proportional to principal
   - Benchmark recovery rates by category
   - Plan collection strategies by category characteristics

### For Portfolio Investors

1. **Investment Composition Transparency**
   - Visualize debt mix in portfolios
   - Understand asset concentration
   - Verify diversification claims

2. **Due Diligence**
   - Assess portfolio composition before acquisition
   - Identify over-reliance on specific categories
   - Compare composition to industry benchmarks

3. **Risk Management**
   - Detect single-point-of-failure risks
   - Evaluate geographic concentration (future)
   - Monitor portfolio rebalancing over time

---

## What This Proves

### ✅ Proven Insights

1. **Compositional Distribution**
   - Exact breakdown of debt principal by dimension
   - Proportional relationships between categories
   - Relative size comparisons

2. **Concentration Metrics**
   - Which category/portfolio has the most value
   - Percentage of total in each dimension
   - Diversification vs concentration balance

3. **Portfolio Structure**
   - Number of distinct categories/portfolios
   - Value spread across dimensions
   - Dominant vs minor categories

4. **Quick Visual Assessment**
   - Immediate understanding of composition
   - Easy comparison of proportions
   - Intuitive "flow" metaphor

### 🎯 Validated Use Cases

- "50.9% of our debt is MEDICAL, 32.7% is CREDIT_CARD, 16.4% is AUTO_LOAN"
- "Portfolio P1 represents 60% of total debt principal - high concentration risk"
- "We have balanced distribution across 5 portfolios (no single portfolio >30%)"
- "Geographic analysis shows 45% of debt is in CA, 25% in TX, 30% distributed across other states"

---

## What This Does NOT Prove

### ❌ Not Demonstrated By This Metric

1. **Collection Performance**
   - Does not show recovery rates by category
   - For performance, use Portfolio Performance or Recovery Trends
   - Cannot determine which categories collect better

2. **Temporal Patterns**
   - Static snapshot of current composition
   - Does not show how composition changed over time
   - For trends, use dashboard time-series or historical snapshots

3. **Individual Debt Details**
   - Aggregated view only
   - Cannot see specific debts within categories
   - For debt-level insights, use Debt Detail views

4. **Payment Velocity**
   - Does not show how fast categories collect
   - For velocity metrics, use Recovery Trends

5. **Profitability**
   - Shows principal, not ROI or profit
   - For profitability, use Portfolio Performance analytics

6. **Directional Process Flow**
   - Not a workflow diagram (despite Sankey visualization)
   - Does not show debts moving between categories
   - Shows composition, not transitions

### ⚠️ Common Misinterpretations to Avoid

| Claim | Why It's Wrong |
|-------|---------------|
| "High value = high performance" | Principal amount doesn't correlate with recovery rate |
| "Balanced composition is always good" | Depends on recovery characteristics of each category |
| "This shows debt aging process" | Static snapshot, not temporal flow |
| "Links represent debt transfers" | Links represent composition, not movement |
| "Percentages indicate success rate" | Percentages are compositional, not performance-based |

---

## Limitations & Edge Cases

### 1. Single Category Dominance

**Problem:** Organization has 95% debt in one category, making visualization less useful.

**Example:**
```json
{
  "nodes": [
    { "id": "source", "label": "All", "value": "1000000" },
    { "id": "debt_category-0", "label": "MEDICAL", "value": "950000" },
    { "id": "debt_category-1", "label": "OTHER", "value": "50000" }
  ]
}
```

**Visualization Impact:** Sankey heavily weighted to one side, minimal visual insight.

**Mitigation:**
- Add warning message: "Limited diversification detected"
- Suggest drilling down into subcategories (future enhancement)
- Recommend Portfolio view instead for better distribution

### 2. Empty Dimension Values

**Problem:** Null or empty dimension values create unlabeled nodes.

**Example:**
- Debt category is NULL
- Portfolio has no name
- State field is empty

**Current Behavior:** Labels as "null" or shows UUID.

**Mitigation:**
```typescript
// In orchestrator
label = item.label || 'Uncategorized';
label = label === 'null' ? 'Unknown' : label;
```

**Future:** Add filter to exclude NULL dimension values from visualization.

### 3. Too Many Nodes

**Problem:** Organization has 50+ portfolios, causing visual clutter.

**Scenario:**
- 50 portfolios, each with 2% of total
- Sankey becomes unreadable

**Mitigation:**
- Implement "Top N + Other" grouping
- Show top 10 nodes, aggregate rest as "Other (40 portfolios)"
- Add pagination or filtering controls

**Future Implementation:**
```typescript
const TOP_N = 10;
const topNodes = dimensionData.slice(0, TOP_N);
const otherNodes = dimensionData.slice(TOP_N);

if (otherNodes.length > 0) {
  const otherValue = otherNodes.reduce((sum, n) => sum + parseFloat(n.totalPrincipal), 0);
  topNodes.push({
    dimensionValue: 'other',
    label: `Other (${otherNodes.length})`,
    totalPrincipal: otherValue.toFixed(2),
    debtCount: otherNodes.reduce((sum, n) => sum + n.debtCount, 0),
  });
}
```

### 4. Zero Principal Debts

**Problem:** Debts with $0 principal included in aggregation.

**Possible Causes:**
- Test data
- Debts created but principal not set
- Fully written-off debts

**Impact:** Inflates debt count but doesn't affect principal value.

**Mitigation:**
```sql
WHERE debt.principal_amount > 0
```

### 5. D3 Sankey nodeId Error

**Problem:** Chart fails with "missing: source" error.

**Root Cause:** d3-sankey requires `.nodeId()` accessor to match string links to node objects.

**Correct Implementation:**
```typescript
const sankeyGenerator = sankey()
  .nodeId((d: any) => d.id)  // REQUIRED
  .nodeWidth(nodeWidth)
  // ...
```

**Without nodeId:** d3-sankey can't match `link.source = "source"` to the source node.

### 6. Case Sensitivity in SQL ORDER BY

**Problem:** PostgreSQL error: `column "totalprincipal" does not exist`

**Root Cause:** TypeORM creates quoted aliases `"totalPrincipal"` (camelCase). ORDER BY must use exact case with quotes.

**Wrong:**
```typescript
.orderBy('totalPrincipal', 'DESC')  // Looks for totalprincipal
```

**Correct:**
```typescript
.orderBy('"totalPrincipal"', 'DESC')  // Matches "totalPrincipal"
```

**Alternative (Better):**
```typescript
.groupBy(dimensionField)  // Use actual column, not alias
.orderBy('"totalPrincipal"', 'DESC')
```

### 7. Percentage Rounding Inconsistency

**Problem:** Percentages don't sum exactly to 100% due to rounding.

**Example:**
- Category A: 33.33%
- Category B: 33.33%
- Category C: 33.33%
- Sum: 99.99%

**Impact:** Minor visual inconsistency, no functional impact.

**Mitigation:** Accept variance, or implement "last value adjustment" to force 100% total.

---

## Complementary Analytics

### 1. Portfolio Performance Analytics

**Relationship:** Flow shows **composition**, Performance shows **effectiveness**.

**Use Together:**
- Flow: "60% of debt is in Portfolio P1"
- Performance: "Portfolio P1 has 35% recovery rate, 120% ROI"

**Combined Insight:** "Our largest portfolio (60% of debt) is also our best performer (35% recovery)"

### 2. Recovery Trends Analytics

**Relationship:** Flow shows **current state**, Trends shows **historical performance**.

**Use Together:**
- Flow: "50% of debt is MEDICAL category"
- Trends: "MEDICAL recovery has improved from 20% to 30% this year"

**Combined Insight:** "Our largest category is also our fastest improving"

### 3. Dashboard Summary

**Relationship:** Flow provides **detail**, Dashboard provides **overview**.

**Use Together:**
- Dashboard: "Total outstanding: $2.4M across 5 portfolios"
- Flow: Visual breakdown of the $2.4M composition

### 4. Geographic Heatmap (Future)

**Relationship:** Flow shows **magnitude**, Heatmap shows **location**.

**Use Together:**
- Flow: "45% of debt is in CA ($1.1M)"
- Heatmap: Visual map showing CA concentration

### 5. Debt Detail Drill-Down (Future)

**Relationship:** Flow shows **aggregate**, Detail shows **individual debts**.

**Use Together:**
- Flow: Click on "MEDICAL" node
- Detail: List of all medical debts

---

## Lessons Learned

### 1. D3-Sankey Configuration Requirements

**Challenge:** Initial implementation crashed with "missing: source" error.

**Root Cause:** d3-sankey requires explicit `.nodeId()` accessor to match string IDs in links to node objects.

**Solution:** Always specify nodeId:
```typescript
.nodeId((d: any) => d.id)
```

**Lesson:** When using D3 libraries, read the API docs carefully. Missing optional configurations can cause cryptic errors.

---

### 2. PostgreSQL Case Sensitivity with TypeORM

**Challenge:** SQL query failed with "column does not exist" error despite column being present.

**Root Cause:** TypeORM creates quoted identifiers like `"totalPrincipal"`. PostgreSQL treats quoted identifiers as case-sensitive. Using `totalPrincipal` (unquoted) in ORDER BY looks for lowercase `totalprincipal`.

**Solution:**
```typescript
// Use actual column in GROUP BY
.groupBy(dimensionField)  // e.g., 'debt.debt_category'

// Quote alias in ORDER BY
.orderBy('"totalPrincipal"', 'DESC')
```

**Lesson:** **Prefer grouping by actual columns over aliases**. Only reference aliases when necessary, and use exact quoted form.

---

### 3. Enum Type Safety in Metadata

**Challenge:** Initial implementation used `as any` casting for enum types.

**Improvement:** Use specific enum types:
```typescript
// Before
metadata: { debtCategory: item.dimensionValue as any }

// After
metadata: { debtCategory: item.dimensionValue as DebtCategory }
```

**Lesson:** **Maintain type safety even in orchestration layers**. Proper typing prevents runtime errors and improves IDE support.

---

### 4. OpenAPI Enum Specification

**Challenge:** Generated OpenAPI spec showed anonymous enum types like `"type": "string", "enum": [...]` instead of named enum references.

**Solution:** Add `enumName` to `@ApiProperty`:
```typescript
@ApiProperty({
  enum: FlowDimension,
  enumName: 'FlowDimension',  // Creates $ref to FlowDimension schema
})
view!: FlowDimension;
```

**Lesson:** **Use enumName for better OpenAPI documentation**. Clients can reference shared enum definitions instead of inline enums.

---

### 5. Decorator Metadata Emission

**Challenge:** TypeScript error: "A type referenced in a decorated signature must be imported with 'import type'..."

**Root Cause:** `emitDecoratorMetadata: true` causes TypeScript to emit runtime type info. Decorating a field with interface type causes issues.

**Solution:** Remove decorator from interface-typed fields:
```typescript
// Removed @ApiProperty decorator
metadata?: IFlowNodeMetadata;
```

**Lesson:** **Avoid decorating interface-typed fields when emitDecoratorMetadata is enabled**. Use JSDoc comments for documentation instead.

---

### 6. Data Source Routing by View Type

**Challenge:** Different views require different microservices (debts, transactions, debtors).

**Solution:** Orchestrator routes request based on view:
```typescript
switch (view) {
  case FlowDimension.DEBT_CATEGORY:
  case FlowDimension.PORTFOLIO:
    return await debtsClient.getFlowAnalytics(orgId, query);

  case FlowDimension.PAYMENT_METHOD:
    return await transactionsClient.getFlowAnalytics(orgId, query);

  case FlowDimension.STATE:
    return await debtorsClient.getFlowAnalytics(orgId, query);
}
```

**Lesson:** **Orchestration layer should handle routing complexity**. Services remain focused on their bounded context.

---

### 7. Future-Proofing with "Soon" Views

**Challenge:** Only 2 of 5 views are implemented.

**Solution:** Show disabled views with "(Soon)" label:
```typescript
{
  value: FlowDimension.PAYMENT_METHOD,
  label: 'Payment Method',
  available: false,
  description: 'Coming soon - requires schema updates',
}
```

**Lesson:** **Show roadmap in UI to set expectations**. Users understand what's planned without being frustrated by disabled features.

---

## Future Expansions

### Version 2.0: Multi-Level Flows

**Problem:** Cannot see hierarchical relationships (e.g., Category → Portfolio → Status).

**Solution:** Add support for 2-3 level flows.

**Implementation:**
```
Source → [Category] → [Portfolio] → [Status]
  All  →   MEDICAL  →     P1      →  ACTIVE
       →   MEDICAL  →     P2      →  PAID
       → CREDIT_CARD →     P3      →  ACTIVE
```

**Query Changes:**
```sql
SELECT
  debt.debt_category,
  debt.portfolio_id,
  debt.status,
  SUM(principal_amount) as value
GROUP BY debt.debt_category, debt.portfolio_id, debt.status
```

**Business Value:** Understand how debt flows through multiple dimensions simultaneously.

---

### Version 2.1: Payment Method Flow

**Requires:** Transaction table schema update.

**Schema Changes:**
```sql
ALTER TABLE transactions
ADD COLUMN payment_method_type VARCHAR(50);

-- Values: CREDIT_CARD, ACH, CHECK, CASH, WIRE_TRANSFER
```

**Implementation:**
- Enable PAYMENT_METHOD view in FlowViewSelector
- api-transactions implements getFlowAnalytics endpoint
- Shows payment amount distribution by method

**Business Value:** Understand payment channel preferences, optimize payment processing.

---

### Version 2.2: Geographic Flow

**Requires:** Debtor location data.

**Schema Changes:**
```sql
ALTER TABLE debtors
ADD COLUMN address_state VARCHAR(2),
ADD COLUMN address_city VARCHAR(100),
ADD COLUMN address_zip VARCHAR(10);
```

**Implementation:**
- api-debtors implements getFlowAnalytics endpoint
- Shows debt principal distribution by state
- Future: Integrate with heatmap visualization

**Business Value:** Identify geographic concentration, plan regional collection strategies.

---

### Version 2.3: Status Transition Flow

**Requires:** Audit log or event history.

**Schema Changes:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  entity_type VARCHAR(50),
  entity_id UUID,
  field_name VARCHAR(50),
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP,
  organization_id UUID
);

CREATE INDEX idx_audit_debt_status
ON audit_logs(entity_type, entity_id, field_name)
WHERE entity_type = 'DEBT' AND field_name = 'status';
```

**Implementation:**
```
ACTIVE → PAYMENT_PLAN: 150 debts ($500k)
ACTIVE → PAID_IN_FULL: 80 debts ($300k)
PAYMENT_PLAN → PAID_IN_FULL: 120 debts ($400k)
PAYMENT_PLAN → DEFAULTED: 30 debts ($100k)
```

**Business Value:** Visualize debt lifecycle, identify bottlenecks, measure payment plan success.

---

### Version 2.4: Interactive Drill-Down

**Problem:** Cannot explore details of specific nodes/links.

**Solution:** Clickable nodes open drill-down view.

**Implementation:**
- Click on "MEDICAL" node → Opens list of medical debts
- Click on link → Opens debts in that flow
- Breadcrumb navigation back to flow view

**Business Value:** Seamless transition from high-level to detailed analysis.

---

### Version 2.5: Time-Series Flow Comparison

**Problem:** Cannot see how composition changed over time.

**Solution:** Store monthly flow snapshots, show comparison slider.

**Implementation:**
```
┌─────────────────────────────────────┐
│ Composition: Jan 2024 vs Dec 2024  │
│ ◄─────────────[slider]──────────► │
└─────────────────────────────────────┘

January:  MEDICAL (40%)  CREDIT (35%)  AUTO (25%)
December: MEDICAL (50%)  CREDIT (33%)  AUTO (17%)
```

**Business Value:** Track composition shifts, measure diversification efforts.

---

### Version 2.6: Export to Image

**Problem:** Users want to include flow diagrams in reports.

**Solution:** Export Sankey as PNG/SVG.

**Implementation:**
```typescript
// Use html2canvas or svg-export library
exportButton.onClick(() => {
  const svg = svgRef.current;
  const canvas = await convertSVGToCanvas(svg);
  canvas.toBlob((blob) => saveAs(blob, 'flow-analytics.png'));
});
```

**Business Value:** Integration with external reports, presentations.

---

### Version 2.7: Comparative Flow View

**Problem:** Cannot compare composition across organizations or time periods.

**Solution:** Side-by-side flow diagrams.

**Implementation:**
```
┌────────────────────┬────────────────────┐
│  Q3 2024           │  Q4 2024           │
│  Flow Diagram      │  Flow Diagram      │
└────────────────────┴────────────────────┘
```

**Business Value:** Benchmark across portfolios, track composition changes.

---

## Testing Strategy

### Unit Tests

**Location:** `packages/event-orchestrator/src/orchestrators/analytics-flow.orchestrator.spec.ts`

**Test Cases:**
1. ✅ Flow graph construction (nodes + links)
2. ✅ Percentage calculation accuracy
3. ✅ Total value summation
4. ✅ Metadata creation by view type
5. ✅ Empty dimension handling
6. ✅ Single dimension edge case
7. ✅ Node ID generation uniqueness
8. ✅ Link percentage rounding (sum ≈ 100%)

**Location:** `apps/api-debts/src/internal/analytics/analytics.service.spec.ts`

**Test Cases:**
1. ✅ DEBT_CATEGORY aggregation
2. ✅ PORTFOLIO aggregation with name enrichment
3. ✅ Query parameter filtering (date, portfolio, category)
4. ✅ Empty result handling
5. ✅ NULL dimension value handling
6. ✅ ORDER BY case sensitivity
7. ✅ GROUP BY actual column (not alias)

### Integration Tests

**Location:** `apps/api-organizations/src/analytics/analytics.integration.spec.ts`

**Test Cases:**
1. ✅ End-to-end flow request (client → orchestrator → services)
2. ✅ HMAC authentication between services
3. ✅ View routing (DEBT_CATEGORY → api-debts, PAYMENT_METHOD → api-transactions)
4. ✅ Error handling (service unavailable)
5. ✅ Response format validation
6. ✅ Node/link structure correctness

### E2E Tests

**Location:** `e2e/analytics/flow.e2e.spec.ts`

**Test Cases:**
1. ✅ UI renders Sankey chart with correct data
2. ✅ View selector switches between views
3. ✅ Disabled views show "(Soon)" label
4. ✅ Tooltips display on node/link hover
5. ✅ Summary statistics display correctly
6. ✅ Loading states work
7. ✅ Error states display correctly
8. ✅ Mobile responsive behavior (show error)

### Data Validation Tests

**Test Cases:**

1. ✅ **Percentage calculation:**
```typescript
// $500 of $1000 total = 50%
expect(link.percentage).toBeCloseTo(50.0, 2);
```

2. ✅ **Total value summation:**
```typescript
const sumOfNodes = nodes.reduce((sum, n) => sum + parseFloat(n.value), 0);
expect(parseFloat(response.totalValue)).toBeCloseTo(sumOfNodes, 2);
```

3. ✅ **Link values match node values:**
```typescript
const sumOfLinks = links.reduce((sum, l) => sum + parseFloat(l.value), 0);
expect(sumOfLinks).toBeCloseTo(parseFloat(nodes[0].value), 2);
```

4. ✅ **Percentages sum to 100%:**
```typescript
const sumPercentages = links.reduce((sum, l) => sum + l.percentage, 0);
expect(sumPercentages).toBeCloseTo(100.0, 1);
```

---

## Troubleshooting

### Issue 1: "missing: source" Error in D3 Chart

**Symptoms:** Chart crashes with error: `Error: missing: source`.

**Possible Causes:**
1. Missing `.nodeId()` configuration in sankey generator
2. Link source/target IDs don't match node IDs
3. Nodes array is empty

**Diagnosis:**
```typescript
console.log('Nodes:', data.nodes.map(n => n.id));
console.log('Links:', data.links.map(l => ({ source: l.source, target: l.target })));
// Verify every link.source and link.target exists in nodes
```

**Resolution:**
```typescript
// Add nodeId accessor
const sankeyGenerator = sankey()
  .nodeId((d: any) => d.id)  // REQUIRED
  .nodeWidth(nodeWidth)
  // ...
```

---

### Issue 2: SQL Error "column totalprincipal does not exist"

**Symptoms:** API returns 500 error with PostgreSQL column not found.

**Possible Causes:**
1. Missing quotes around alias in ORDER BY
2. Case mismatch between alias and reference

**Diagnosis:**
```bash
# Check generated SQL in logs
# Look for: ORDER BY totalPrincipal DESC (wrong)
# Should be: ORDER BY "totalPrincipal" DESC (correct)
```

**Resolution:**
```typescript
// Option 1: Quote the alias
.orderBy('"totalPrincipal"', 'DESC')

// Option 2: Use actual column (preferred)
.groupBy(dimensionField)  // 'debt.debt_category'
.orderBy('"totalPrincipal"', 'DESC')
```

---

### Issue 3: Empty Chart (No Nodes/Links)

**Symptoms:** Chart renders but shows no data.

**Possible Causes:**
1. Organization has no debts
2. Filters exclude all data
3. API response empty but no error

**Diagnosis:**
```bash
# Check API response
curl 'http://localhost:3003/internal/analytics/flow/{orgId}?view=DEBT_CATEGORY'

# Verify debts exist
SELECT COUNT(*) FROM debts WHERE organization_id = 'uuid';
```

**Resolution:**
- Remove overly restrictive filters
- Add empty state message in UI
- Verify database has seeded data for testing

---

### Issue 4: Percentages Don't Sum to 100%

**Symptoms:** Link percentages sum to 99.8% or 100.3%.

**Possible Causes:**
1. Floating point rounding errors
2. Calculation using rounded values

**Expected Behavior:** Minor variance (<0.5%) is acceptable.

**Diagnosis:**
```typescript
const sumPercentages = links.reduce((sum, l) => sum + l.percentage, 0);
console.log('Sum:', sumPercentages);
// Acceptable: 99.5 - 100.5
```

**Resolution:**
- Accept variance (no fix needed)
- Or implement "last value adjustment":
```typescript
const adjustment = 100 - sumPercentages;
links[links.length - 1].percentage += adjustment;
```

---

### Issue 5: View Selector Not Switching

**Symptoms:** Clicking view buttons doesn't change diagram.

**Possible Causes:**
1. React state not updating
2. Query key not including view parameter
3. API not receiving new view value

**Diagnosis:**
```typescript
console.log('Selected view:', selectedView);
console.log('Query key:', queryKey);
// Verify queryKey includes selectedView
```

**Resolution:**
```typescript
// Ensure view is in queryKey
queryKey: ['flow-analytics', orgId, selectedView],

// Verify state update
setSelectedView(newView);  // Triggers re-render
```

---

### Issue 6: Tooltip Not Displaying

**Symptoms:** Hovering over nodes/links doesn't show tooltip.

**Possible Causes:**
1. Tooltip ref not initialized
2. Pointer events disabled
3. Z-index conflict

**Diagnosis:**
```typescript
console.log('Tooltip ref:', tooltipRef.current);
// Should be a div element, not null
```

**Resolution:**
```typescript
// Ensure tooltip div is rendered
<div
  ref={tooltipRef}
  style={{
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none',
    zIndex: 1000,  // High z-index
  }}
></div>

// Verify showTooltip is called
.on('mouseover', (event, d) => {
  console.log('Hover:', d);
  showTooltip(event, d, 'node');
})
```

---

### Issue 7: "Flow tab disabled" in UI

**Symptoms:** Flows tab is grayed out and not clickable.

**Possible Causes:**
1. `disabled` prop set on Link component
2. Feature flag disabled
3. Permission check failing

**Diagnosis:**
```typescript
// Check route configuration
<Link
  to="/analytics/flows"
  disabled  // <- REMOVE THIS
>
  Flows
</Link>
```

**Resolution:**
```typescript
// Remove disabled prop
<Link
  to="/analytics/flows"
  className="..."
>
  Flows
</Link>
```

---

### Issue 8: Future Views Showing as Available

**Symptoms:** Payment Method or Geographic views are clickable but return errors.

**Expected Behavior:** These views should be disabled with "(Soon)" label.

**Diagnosis:**
```typescript
// Check VIEW_OPTIONS configuration
{
  value: FlowDimension.PAYMENT_METHOD,
  available: true,  // <- Should be false
}
```

**Resolution:**
```typescript
{
  value: FlowDimension.PAYMENT_METHOD,
  available: false,  // Disable
  description: 'Coming soon - requires schema updates',
}
```

---

## Conclusion

Flow Analytics provides intuitive visual representation of debt composition across multiple dimensions. Understanding the **Sankey construction algorithm** and **D3 configuration requirements** is crucial for successful implementation.

**Key Takeaways:**
- ✅ Compositional analysis, not performance or temporal trends
- ✅ Single-level flows (source → dimensions), multi-level flows in v2.0
- ✅ D3-sankey requires `.nodeId()` accessor for proper rendering
- ✅ PostgreSQL case-sensitive ORDER BY requires quoted aliases
- ✅ Currently supports DEBT_CATEGORY and PORTFOLIO views
- ✅ PAYMENT_METHOD, STATE, STATUS_TRANSITION require future work

**Architectural Lessons:**
- 🎯 Explicit D3 configuration > implicit defaults
- 🎯 Quote aliases in ORDER BY > unquoted references
- 🎯 Group by actual columns > group by aliases
- 🎯 Enum type safety > `as any` casting
- 🎯 Named enums in OpenAPI > anonymous inline enums
- 🎯 Orchestrator routing > duplicated endpoint logic

For questions or issues, contact the Platform Engineering team or refer to the [Analytics API Documentation](../README.md).
