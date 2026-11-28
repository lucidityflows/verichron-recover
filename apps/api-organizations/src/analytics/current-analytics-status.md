# Analytics Dashboard - Current State Audit

**Date**: December 3, 2025
**Status**: Production (1/10 features complete)
**Architecture**: Event-Driven Orchestration Pattern

---

## Executive Summary

The analytics feature in `api-organizations` uses a sophisticated event-driven orchestration pattern to aggregate data from multiple microservices (api-debts, api-transactions, api-debtors, api-communications). Currently, **1 out of 10 planned analytics endpoints is fully implemented and working** (Dashboard Summary). The remaining 9 endpoints have complete DTOs/contracts but are stubbed with placeholder implementations.

**Key Finding**: The architecture is sound and production-ready. The dashboard summary endpoint proves the orchestration pattern works. Remaining work is systematic implementation following this proven template.

---

## Architecture Overview

### Event-Driven Orchestration Pattern

```
┌─────────────────────┐
│  api-organizations  │  ← Analytics API Gateway
│  (Orchestrator)     │
└──────────┬──────────┘
           │
           │ EventOrchestratorClient
           │ (Pub/Sub Request-Response)
           │
    ┌──────┴──────────────────────┐
    │                             │
    ├─→ api-debts                 │
    │   (Portfolio metrics)       │
    │                             │
    ├─→ api-transactions          │
    │   (Payment data)            │
    │                             │
    ├─→ api-debtors               │
    │   (Debtor counts)           │
    │                             │
    └─→ api-communications        │
        (Contact activity)        │
                                  │
    ┌─────────────────────────────┘
    │
    │ Aggregated Response
    │
    ▼
┌─────────────────────┐
│   Dashboard UI      │
└─────────────────────┘
```

### Key Components

1. **AnalyticsController** - REST API endpoints
2. **AnalyticsService** - Orchestration logic, publishes events
3. **EventOrchestratorClient** - Handles pub/sub, correlation, timeouts
4. **DTOs** - Complete contracts for all 10 analytics features
5. **Internal Endpoints** - HMAC-authenticated service-to-service APIs

---

## Implementation Status

### ✅ Fully Implemented (1/10)

#### 1. Dashboard Summary
- **Endpoint**: `GET /orgs/:orgId/dashboard-summary`
- **Status**: **PRODUCTION READY** ✅
- **Implementation**: Complete orchestration with EventOrchestratorClient
- **Event**: `ANALYTICS_DASHBOARD_SUMMARY_REQUESTED` → `ANALYTICS_DASHBOARD_SUMMARY_COMPLETED`
- **Data Sources**:
  - api-debts: Portfolio counts, debt counts, status breakdown
  - api-transactions: Payments collected (quarterly), today's collections, payment plans
  - api-debtors: Debtor counts
  - api-communications: Today's contacts (not yet integrated)

**Response Structure**:
```typescript
{
  totalPortfolios: number;
  totalDebts: number;
  totalDebtors: number;
  totalInvested: TimeFramedMetricDto[];      // Quarterly
  totalCollected: TimeFramedMetricDto[];     // Quarterly
  totalOutstanding: number;
  overallRecoveryRate: number;
  statusCounts: {
    active: number;
    paid: number;
    settled: number;
    defaulted: number;
    paymentPlan: number;
  };
  todayCollections: number;
  todayPaymentPlans: number;
  todayContacts: number;
  topPortfolios: TopPortfolioDto[];
  generatedAt: Date;
}
```

---

### ⚠️ Stubbed - DTOs Complete, Logic Missing (9/10)

All endpoints below throw `ServiceUnavailableException` with "not yet implemented via orchestration" message.

#### 2. Recovery Trends
- **Endpoint**: `GET /orgs/:orgId/analytics/recovery-trends`
- **Query Params**: `startDate`, `endDate`, `granularity` (daily/weekly/monthly/quarterly)
- **DTO**: ✅ Complete (`RecoveryTrendsResponseDto`)
- **Purpose**: Time-series analysis of recovery rates over configurable periods
- **Data Needed**:
  - Historical transaction data (api-transactions)
  - Debt values by period (api-debts)
- **Missing**:
  - Orchestration event definitions
  - Internal endpoints in api-transactions, api-debts
  - EventOrchestrator handler

**Response Structure**:
```typescript
{
  orgId: string;
  startDate: Date;
  endDate: Date;
  granularity: string;
  trends: RecoveryTrendDataPointDto[];  // Array of time points
  totalCollected: number;
  avgRecoveryRate: number;
  generatedAt: Date;
}
```

#### 3. Portfolio Performance
- **Endpoint**: `GET /orgs/:orgId/analytics/portfolio-performance`
- **DTO**: ✅ Complete (`PortfolioPerformanceResponseDto`)
- **Purpose**: Portfolio-level breakdown of performance metrics
- **Data Needed**:
  - Portfolio details (api-debts)
  - Payments per portfolio (api-transactions)
  - Payment plan counts (api-transactions)
- **Missing**: Same as Recovery Trends

**Response Structure**:
```typescript
{
  orgId: string;
  totalPortfolios: number;
  portfolios: PortfolioPerformanceDto[];  // Per-portfolio metrics
  overallRecoveryRate: number;
  totalDebtValue: number;
  totalPaymentsCollected: number;
  generatedAt: Date;
}
```

#### 4-11. Geographic Analytics Suite (8 Endpoints)

All geographic endpoints follow the same pattern with complete DTOs but no implementation.

**Common Query Params**: `portfolioId?`, `startDate?`, `endDate?`, `stateFilter?`

| Endpoint | Purpose | Primary Data Source |
|----------|---------|---------------------|
| `/analytics/geographic/debt-age` | State-level debt age distribution | api-debts |
| `/analytics/geographic/creditors` | State-level creditor breakdown | api-debts |
| `/analytics/geographic/debtors` | State-level debtor distribution | api-debtors |
| `/analytics/geographic/default-risk` | State-level default risk scores | api-debtors (requires ML) |
| `/analytics/geographic/likelihood-to-pay` | State-level payment likelihood | api-debtors (requires ML) |
| `/analytics/geographic/payment-plans` | State-level payment plan metrics | api-transactions |
| `/analytics/geographic/responsiveness` | State-level contact responsiveness | api-communications |
| `/analytics/geographic/combined` | Combined debtor/creditor flows | All services |

**Common Geographic Data Structure**:
```typescript
{
  state: string;              // Two-letter state code
  stateName: string;          // Full state name
  coordinates: {              // For map visualization
    latitude: number;
    longitude: number;
  };
  // ... endpoint-specific metrics
}
```

---

## DTO/Contract Maturity

### Strengths ✅

1. **Complete Type Safety**: All DTOs implement `@verichron/contracts` interfaces
2. **Validation Ready**: Full `class-validator` decorators (`@IsNumber`, `@IsArray`, etc.)
3. **API Documentation**: Comprehensive Swagger/OpenAPI annotations
4. **Serialization**: Uses `class-transformer` for proper JSON handling
5. **Consistent Patterns**:
   - Time-framed metrics use year + quarter
   - Geographic data includes coordinates for mapping
   - All responses include `generatedAt` timestamp

### File Structure

```
apps/api-organizations/src/analytics/
├── analytics.controller.ts          # REST endpoints (10 total)
├── analytics.service.ts             # Orchestration logic (1 impl, 9 stubs)
├── analytics.events.controller.ts   # Event handlers (empty)
├── analytics.module.ts              # Module configuration
├── dto/
│   ├── dashboard-summary-response.dto.ts       ✅
│   ├── recovery-trends-response.dto.ts         ✅
│   ├── recovery-trends-query.dto.ts            ✅
│   ├── portfolio-performance-response.dto.ts   ✅
│   ├── geographic/
│   │   ├── debt-age-geographic.dto.ts          ✅
│   │   ├── creditor-geographic.dto.ts          ✅
│   │   ├── debtor-geographic.dto.ts            ✅
│   │   ├── default-risk-geographic.dto.ts      ✅
│   │   ├── likelihood-to-pay-geographic.dto.ts ✅
│   │   ├── payment-plan-geographic.dto.ts      ✅
│   │   ├── responsiveness-geographic.dto.ts    ✅
│   │   ├── combined-geographic.dto.ts          ✅
│   │   ├── base-geographic-state-data.dto.ts   ✅
│   │   ├── coordinates.dto.ts                  ✅
│   │   └── geographic-query.dto.ts             ✅
│   └── index.ts
└── listeners/
    └── debtor-profile-created.listener.ts  # Aggregation/caching
```

---

## Integration Architecture

### Working Infrastructure ✅

1. **EventOrchestratorClient**: Request-response pub/sub pattern
2. **HMAC Authentication**: Service-to-service security (just fixed!)
3. **Internal Endpoints**: Pattern established in api-debts, api-debtors, api-transactions
4. **Event Correlation**: UUID-based correlation IDs
5. **Timeout Handling**: Built into orchestrator client

### Integration Pattern (Dashboard Summary)

```typescript
// In api-organizations/analytics.service.ts
async getDashboardSummary(orgId: string) {
  const payload = {
    organizationId: orgId,
    correlationId: uuidv4(),
  };

  // Publish request event, wait for aggregated response
  const summary = await this.orchestratorClient.request<DashboardSummaryResponseDto>(
    EVENT_TOPICS.ORGANIZATIONS,
    EVENT_TYPES.ANALYTICS_DASHBOARD_SUMMARY_REQUESTED,
    payload,
  );

  return summary;
}
```

```typescript
// In event-orchestrator
@EventSubscription({
  topicName: EVENT_TOPICS.ORGANIZATIONS,
  subscriptionName: 'event-orchestrator.analytics.dashboard-summary-requested.sub',
  eventType: EVENT_TYPES.ANALYTICS_DASHBOARD_SUMMARY_REQUESTED,
})
async handleDashboardSummaryRequested(envelope) {
  // Fan out to multiple services in parallel
  const [debtData, debtorData, transactionData] = await Promise.all([
    this.fetchDebtData(debtServiceUrl, organizationId),
    this.fetchDebtorData(debtorServiceUrl, organizationId),
    this.fetchTransactionData(transactionServiceUrl, organizationId),
  ]);

  // Aggregate results
  const aggregated = this.aggregateDashboardResponses([...]);

  // Publish completion event
  await this.eventPublisher.publish(
    replyTo,
    EVENT_TYPES.ANALYTICS_DASHBOARD_SUMMARY_COMPLETED,
    completedDto,
  );
}
```

### Missing Integration Points ❌

For each of the 9 stubbed analytics features, need:

1. **Event Definitions** (in `@verichron/events`):
   - `ANALYTICS_RECOVERY_TRENDS_REQUESTED`
   - `ANALYTICS_RECOVERY_TRENDS_COMPLETED`
   - `ANALYTICS_PORTFOLIO_PERFORMANCE_REQUESTED`
   - ... (etc for all 9)

2. **Internal Endpoints** in domain services:
   - api-debts:
     - `/internal/analytics/recovery-trends/:orgId`
     - `/internal/analytics/portfolio-performance/:orgId`
     - `/internal/analytics/geographic/debt-age/:orgId`
     - `/internal/analytics/geographic/creditors/:orgId`
   - api-transactions:
     - `/internal/analytics/recovery-trends/:orgId`
     - `/internal/analytics/portfolio-performance/:orgId`
     - `/internal/analytics/geographic/payment-plans/:orgId`
   - api-debtors:
     - `/internal/analytics/geographic/debtors/:orgId`
     - `/internal/analytics/geographic/default-risk/:orgId`
     - `/internal/analytics/geographic/likelihood-to-pay/:orgId`
   - api-communications:
     - `/internal/analytics/geographic/responsiveness/:orgId`

3. **Orchestrator Handlers** (in `packages/event-orchestrator`):
   - One handler per analytics feature
   - Aggregation logic for cross-service data

---

## Testing & Quality

### Current State

- ✅ **Unit Tests**: `analytics.controller.spec.ts`, `analytics.service.spec.ts` exist
- ✅ **Error Handling**: Uses `handleServiceError` utility
- ✅ **Logging**: Comprehensive logger integration
- ✅ **Validation**: DTOs have full validation decorators
- ⚠️ **Event Controller**: Nearly empty (3 lines, no logic yet)

### Missing

- ❌ Integration tests for orchestration flow
- ❌ E2E tests for analytics endpoints
- ❌ Performance testing for large datasets
- ❌ Mock data generators for development

---

## Architecture Strengths

1. **Bounded Contexts Respected**: Analytics orchestration in api-organizations, domain data stays in domain services
2. **Scalability**: Event-driven pattern allows parallel data fetching across services
3. **Resilience**: Orchestrator client handles timeouts, retries, and correlation
4. **Separation of Concerns**: Clean API → Orchestration → Domain Services
5. **Contract-First Design**: All DTOs and interfaces defined upfront
6. **Proven Pattern**: Dashboard summary serves as working template for other features
7. **Type Safety**: Full TypeScript contracts across boundaries
8. **API Documentation**: Auto-generated Swagger docs from decorators

---

## Implementation Roadmap

### Recommended Phasing

#### Phase 1: High-Value Analytics (Build on What Works)
**Goal**: Deliver immediate user value with features that use existing data

1. **Recovery Trends**
   - Natural extension of dashboard summary
   - Uses existing transaction/debt data
   - High collector value (see trends over time)
   - Estimated Effort: 2-3 days

2. **Portfolio Performance**
   - Critical for portfolio managers
   - Uses existing debt/transaction data
   - Clear ROI metrics per portfolio
   - Estimated Effort: 2-3 days

#### Phase 2: Geographic Foundation
**Goal**: Enable map visualizations and state-level insights

3. **Debtor Geographic**
   - Simplest geographic endpoint (just counts + state grouping)
   - Foundation for other geographic features
   - Estimated Effort: 2 days

4. **Payment Plan Geographic**
   - Shows where payment plans are most effective
   - Uses existing transaction data
   - Estimated Effort: 2 days

5. **Combined Geographic**
   - Most ambitious, powers interactive maps
   - Shows debtor/creditor flows between states
   - Estimated Effort: 3-4 days

#### Phase 3: Advanced Analytics (Requires ML/Scoring)
**Goal**: Predictive and behavioral analytics

6. **Likelihood to Pay**
   - Requires ML scoring system
   - Needs historical payment behavior data
   - Estimated Effort: 1-2 weeks (includes ML model)

7. **Default Risk**
   - Requires predictive models
   - Needs risk scoring infrastructure
   - Estimated Effort: 1-2 weeks

8. **Debt Age Geographic**
   - Aging analysis by state
   - Estimated Effort: 2-3 days

9. **Creditor Geographic**
   - Creditor distribution by state
   - Estimated Effort: 2 days

10. **Responsiveness Geographic**
    - Requires api-communications integration
    - Depends on communication logs
    - Estimated Effort: 3 days

---

## Key Questions Before Implementation

1. **Priority**: Which analytics are most critical for your users?
   - Recovery trends for seeing performance over time?
   - Portfolio performance for portfolio-level decisions?
   - Geographic views for regional strategies?

2. **Data Availability**:
   - Do you have state information for debtors/creditors?
   - Historical transaction data for trend analysis?
   - Communication logs for responsiveness analytics?

3. **ML/Scoring Complexity**:
   - Ready for ML-based analytics (likelihood to pay, default risk)?
   - Or start with simpler aggregations?

4. **UI Readiness**:
   - Planning map visualizations (needs geographic APIs)?
   - Time-series charts (needs recovery trends)?
   - Portfolio comparison tables (needs portfolio performance)?

5. **Phasing Strategy**:
   - Build all 9 features at once?
   - Incrementally ship 1-2 features at a time?
   - MVP with 2-3 high-value features first?

---

## Next Steps

### Option 1: Incremental Implementation
Start with **Recovery Trends** (simplest, highest value):
1. Define events in `@verichron/events`
2. Create internal endpoint in api-transactions
3. Create orchestrator handler in `event-orchestrator`
4. Update `analytics.service.ts` to use orchestration
5. Test end-to-end
6. Ship to production
7. Repeat for next feature

### Option 2: Batch Implementation
Implement 2-3 related features together:
1. **Recovery Trends + Portfolio Performance** (both use transaction data)
2. **Debtor Geographic + Payment Plan Geographic** (foundation for maps)
3. Advanced features later

### Option 3: Full Build-Out
Implement all 9 features in a coordinated sprint:
- Define all events at once
- Build all internal endpoints
- Create all orchestrator handlers
- Comprehensive testing
- Single large release

---

## Conclusion

**Current State**: Solid foundation with 1 working feature and complete contracts for 10 features total.

**Architecture**: Production-ready event-driven orchestration pattern that scales.

**Remaining Work**: Systematic implementation following the proven dashboard summary template.

**Risk**: Low - the hard architectural decisions are done, pattern is proven, DTOs are complete.

**Recommendation**: Start with Recovery Trends (2-3 days) to validate the implementation pattern, then proceed with other features based on user priority.

---

**Last Updated**: December 3, 2025
**Audited By**: Robert Torres
**Next Review**: After first additional feature implementation
