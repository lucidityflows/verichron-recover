# Analytics Reference Docs - Feasibility Analysis

**Date**: December 3, 2025
**Source**: `/docs/analytics-reference/` (original planning docs)
**Current State**: `/apps/api-organizations/src/analytics/current-analytics-status.md`
**Purpose**: Evaluate feasibility of original ideas against current bounded context architecture

---

## Executive Summary

**TL;DR**: Your original planning docs were **ambitious and visionary**, but require significant data model extensions. The good news: **Your current architecture can support all of these features** with targeted enhancements. Most ideas are feasible, but some need new database fields and others can be simplified.

### Feasibility Breakdown
- ✅ **Fully Feasible (80%)**: Can implement with current data + minor extensions
- ⚠️ **Needs Data Extensions (15%)**: Requires new fields (behavioral tracking, ML scores)
- ❌ **Defer/Simplify (5%)**: Too complex for MVP, recommend v2

---

## Feature-by-Feature Analysis

### 1. Geographic Analytics Platform ⚠️ **MOSTLY FEASIBLE**

**Original Vision** (`geographic-analytics.md`):
- 8 heat map view modes
- State-level visualization with lat/long coordinates
- Portfolio type filtering
- Debt age distribution
- Behavioral analytics (payment plans, responsiveness, likelihood to pay, default risk)

#### ✅ What Works Today (No Changes Needed)

1. **Debtor Geographic Distribution** - READY NOW
   - ✅ We have: `debtor_profile` with addresses
   - ✅ We have: State field in addresses
   - ✅ We have: Debt values, statuses, recovery rates
   - **Action**: Just need to add state centroid coordinates (hardcode lookup table)

2. **Creditor Geographic Distribution** - READY NOW
   - ✅ We have: `debt.original_creditor_name` field
   - ❌ Missing: Original creditor addresses (we don't track creditor entities)
   - **Workaround**: Parse creditor state from name or add `original_creditor_state` field
   - **Recommendation**: Add `original_creditor_state` VARCHAR(2) to `debts` table

3. **Debt Age Geographic** - READY NOW
   - ✅ We have: `debt.original_debt_date` field
   - ✅ Can calculate: `CURRENT_DATE - original_debt_date` for age
   - ✅ Can group: Age buckets (0-30, 31-60, etc.)
   - **Action**: Just implement calculation logic

4. **Combined Geographic View** - READY NOW
   - Aggregates debtors + creditors
   - **Action**: Combine endpoints #1 and #2

#### ⚠️ What Needs Data Extensions

5. **Payment Plan Engagement Geographic** - NEEDS FIELDS
   - ❌ Missing: `has_active_payment_plan` (boolean)
   - ❌ Missing: `payment_plan_started_at` (timestamp)
   - ❌ Missing: `payment_plan_completed_at` (timestamp)
   - **Impact**: Can track in `api-transactions` via payment plan records
   - **Recommendation**: Query payment plans from transactions service, aggregate by debtor state

6. **Responsiveness Geographic** - NEEDS FIELDS
   - ❌ Missing: Communication logs (api-communications not built yet)
   - ❌ Missing: `last_contact_date`, `contact_attempts`, `is_responsive`
   - **Impact**: Requires api-communications microservice
   - **Recommendation**: **Defer to v2** until communications service exists

7. **Likelihood to Pay Geographic** - NEEDS ML/SCORING
   - ❌ Missing: `likelihood_to_pay_score` (0-100)
   - **Impact**: Requires ML model or rule-based scoring
   - **Recommendation**: **Defer to v2** or use simple heuristic (payment history + age)

8. **Default Risk Geographic** - NEEDS ML/SCORING
   - ❌ Missing: `default_risk_score` (0-100)
   - **Impact**: Requires predictive model
   - **Recommendation**: **Defer to v2** or use status-based risk (defaulted = 100)

#### Portfolio Type Filtering

**Original Proposal**:
```sql
CREATE TYPE portfolio_type AS ENUM (
  'AUTO_LOAN', 'CREDIT_CARD', 'MEDICAL_COLLECTIONS',
  'STUDENT_LOAN', 'PERSONAL_LOAN', 'UTILITY', 'TELECOM'
);
```

**Current Reality**:
- ✅ We have: `portfolio.source` (string) - "Triton Financial Solutions"
- ❌ We don't have: `portfolio_type` enum

**Recommendation**:
- ✅ **ADD THIS** - High value, low effort
- Migration: `ALTER TABLE portfolios ADD COLUMN portfolio_type VARCHAR(50);`
- Seed data: Assign realistic types to existing portfolios
- **Estimated Effort**: 2-3 hours (migration + seeding)

---

### 2. Recovery Trends & Portfolio Performance ✅ **FULLY FEASIBLE**

**What You Need**: Time-series recovery rate trends, portfolio-level performance

**Current Data**:
- ✅ We have: Transactions with timestamps
- ✅ We have: Debt balances over time
- ✅ We have: Portfolio assignments

**Implementation Path**:
1. Query transactions grouped by time period (daily/weekly/monthly/quarterly)
2. Calculate recovery rate: `(original_balance - current_balance) / original_balance`
3. Aggregate by portfolio

**Recommendation**: ✅ **IMPLEMENT NEXT** (following dashboard summary pattern)
**Estimated Effort**: 4-6 hours per feature (see current-analytics-status.md)

---

### 3. Real-Time Notifications & Events ⚠️ **COMPLEX BUT FEASIBLE**

**Original Vision** (`real-time-notifications.md`):
- 4-tier event system (Critical, Tactical, Aggregated, Backend Automation)
- WebSocket push notifications
- Event-driven automation

#### ✅ What Works Today (Demo Mode)

Your reference includes a **demo event provider** (`DemoEventProvider.ts`):
- ✅ Mock event generation with templates
- ✅ React hooks (`useRealTimeEvents`, `useRealTimeMetrics`)
- ✅ Toast notifications
- ✅ Event queue management

**Status**: This is UI-only simulation, no backend

#### ⚠️ What Needs Backend Implementation

**4-Tier Event System**:

1. **Tier 1: Critical Security Alerts** - FEASIBLE
   - ✅ Can detect: Anomalous logins (check IP/location)
   - ✅ Can detect: Privilege escalation (track role changes)
   - **Action**: Add event listeners in auth/RBAC services

2. **Tier 2: Tactical Debtor Events** - FEASIBLE
   - ✅ Can detect: High-value payments (transaction > threshold)
   - ✅ Can detect: Debt status changes
   - ⚠️ Partially: Debtor portal actions (requires debtor self-service portal)
   - **Action**: Add event emitters in debts/transactions services

3. **Tier 3: Aggregated Trends** - FEASIBLE
   - ✅ Can calculate: Collections vs projections
   - ✅ Can calculate: Portfolio performance trends
   - **Action**: Scheduled job (cron) to aggregate and emit

4. **Tier 4: Backend Automation** - FEASIBLE
   - ✅ Event bus: Use NestJS `EventEmitterModule` or add Redis Pub/Sub
   - ✅ Automation: Trigger emails, update scores, create tasks
   - **Action**: Implement event listeners in domain services

**Technology Recommendations**:
- WebSocket: `@nestjs/websockets` + `socket.io`
- Event Bus: NestJS `EventEmitterModule` (in-process) or Redis (distributed)
- Queue: BullMQ for async tasks

**Estimated Effort**:
- Basic WebSocket + Tier 1/2 events: 2-3 days
- Full 4-tier system: 1-2 weeks

**Recommendation**: ✅ **High Value, Implement Incrementally**
- **Phase 1**: Basic WebSocket + payment/status events (Tier 2)
- **Phase 2**: Add critical alerts (Tier 1)
- **Phase 3**: Add aggregation job (Tier 3)
- **Phase 4**: Add automation hooks (Tier 4)

---

### 4. Sankey Diagrams (Payment Flows) ✅ **FULLY FEASIBLE**

**Original Vision** (`SankeyDashboard.tsx`):
- Payment flow visualization by payment type, state, demographic

**Current Data**:
- ✅ We have: Transactions with payment methods
- ✅ We have: Debtor addresses (state)
- ⚠️ We don't have: Demographics

**What Works**:
1. **Payment Type Flow** - READY NOW
   - Transactions → Payment Method (ACH, Card, etc.)
   - **Action**: Group transactions by `payment_method`

2. **State Flow** - READY NOW
   - Transactions → Debtor State
   - **Action**: Join transactions → debtor → address → state

3. **Demographic Flow** - NEEDS FIELDS
   - ❌ Missing: Race, ethnicity, age, income fields
   - **Compliance**: FDCPA restrictions on demographic tracking
   - **Recommendation**: **Skip or use proxy metrics** (e.g., ZIP code → income level via census data)

**Recommendation**: ✅ **Implement Payment Type + State** (skip demographics for compliance)
**Estimated Effort**: 3-4 hours

---

## Data Model Gap Analysis

### Required Schema Changes

#### High Priority (Core Features)

1. **Portfolio Type** - 2 hours
   ```sql
   ALTER TABLE portfolios ADD COLUMN portfolio_type VARCHAR(50);
   -- Enum values: AUTO_LOAN, CREDIT_CARD, MEDICAL, STUDENT_LOAN, PERSONAL_LOAN, UTILITY, TELECOM
   ```

2. **Original Creditor State** - 1 hour
   ```sql
   ALTER TABLE debts ADD COLUMN original_creditor_state VARCHAR(2);
   ```

#### Medium Priority (Enhanced Features)

3. **Payment Plan Tracking** - Can use api-transactions data
   - No schema change needed
   - Query payment plans from transactions
   - Aggregate by debtor/state

4. **Contact Tracking** - Requires api-communications
   - **Defer until api-communications service exists**
   - Schema in separate service

#### Low Priority (ML/Advanced)

5. **Behavioral Scores** - Defer to v2
   ```sql
   -- Only add these if implementing ML scoring
   ALTER TABLE debts ADD COLUMN likelihood_to_pay_score INTEGER CHECK (score BETWEEN 0 AND 100);
   ALTER TABLE debts ADD COLUMN default_risk_score INTEGER CHECK (score BETWEEN 0 AND 100);
   ```

---

## Implementation Roadmap (Revised)

### Phase 1: Core Analytics (Current Sprint)
**Effort**: 1-2 weeks

1. ✅ **Dashboard Summary** (COMPLETE)
2. ⚠️ **Recovery Trends** (2-3 days)
   - Implement orchestration
   - Time-series aggregation
   - Works with existing data
3. ⚠️ **Portfolio Performance** (2-3 days)
   - Portfolio-level metrics
   - Works with existing data

### Phase 2: Geographic Foundation (Next Sprint)
**Effort**: 1 week

1. **Add Schema Changes**:
   - Add `portfolio_type` to portfolios (2 hours)
   - Add `original_creditor_state` to debts (1 hour)
   - Seed existing data with types/states (2 hours)

2. **Implement Geographic Endpoints**:
   - Debtor Geographic (1 day)
   - Creditor Geographic (1 day)
   - Debt Age Geographic (1 day)
   - Combined View (1 day)

3. **UI Components**:
   - GeoMap component with @nivo/geo (2 days)
   - Controls and filters (1 day)

### Phase 3: Real-Time Events (Separate Sprint)
**Effort**: 1-2 weeks

1. **WebSocket Infrastructure** (2-3 days)
   - Gateway setup
   - Authentication
   - Basic connection management

2. **Tier 2 Events** (2 days)
   - Payment events
   - Status change events
   - Emit from domain services

3. **Tier 1 Events** (1-2 days)
   - Security alerts
   - Auth events

4. **UI Integration** (2 days)
   - ProductionEventProvider
   - Toast notifications
   - Connection status

### Phase 4: Advanced Features (Future)
**Effort**: TBD

- ❌ Responsiveness analytics (requires api-communications)
- ❌ ML-based scores (requires ML infrastructure)
- ❌ Demographic tracking (compliance concerns)

---

## What to Keep, What to Defer

### ✅ Keep & Implement (80% of original vision)

1. **Geographic Analytics** (simplified):
   - Debtor locations ✅
   - Creditor locations ✅ (with state field)
   - Debt age distribution ✅
   - Combined views ✅
   - **Skip**: Responsiveness (needs comms service), ML scores (needs ML)

2. **Recovery Trends** ✅
   - Fully feasible with current data
   - High user value

3. **Portfolio Performance** ✅
   - Fully feasible with current data
   - High user value

4. **Real-Time Events** ✅ (incremental rollout)
   - Start with Tier 2 (payment/status events)
   - Add Tier 1 (security) quickly
   - Defer Tier 3/4 to v2

5. **Sankey Diagrams** ✅ (partial)
   - Payment type flow ✅
   - State flow ✅
   - **Skip**: Demographics (compliance)

### ⚠️ Defer to V2 (15% of original vision)

1. **Responsiveness Geographic**
   - Requires: api-communications microservice
   - Requires: Contact log tracking
   - **When**: After communications service is built

2. **Likelihood to Pay / Default Risk**
   - Requires: ML scoring infrastructure
   - Requires: Historical behavior modeling
   - **When**: After analytics engine is mature

3. **Advanced Automation (Tier 4)**
   - Requires: Stable event system first
   - Requires: Business rules engine
   - **When**: After Tier 1-3 are proven

### ❌ Skip / Simplify (5% of original vision)

1. **Demographic Tracking**
   - **Reason**: FDCPA compliance concerns
   - **Alternative**: Use ZIP code analysis (public census data)

2. **Animated State Flows**
   - **Reason**: 30-40 hours for visual polish
   - **Alternative**: Static flow view (still valuable)

---

## Technology Stack Validation

### Frontend
- ✅ `@nivo/geo` - Geographic heat maps (same family as Sankey)
- ✅ `@nivo/sankey` - Flow diagrams
- ✅ `socket.io-client` - WebSocket client
- ✅ React hooks pattern - Already established

### Backend
- ✅ `@nestjs/websockets` - WebSocket gateway
- ✅ `EventEmitterModule` - In-process event bus
- ✅ EventOrchestratorClient - Cross-service orchestration (already working!)
- ⚠️ `BullMQ` - Add for async job queue (optional for v1)

### Data
- ✅ PostgreSQL - Handles all geographic queries
- ✅ TypeORM - Entity framework
- ⚠️ Redis - Optional for event bus scaling

---

## Risk Assessment

### Low Risk ✅

1. **Recovery Trends** - Proven pattern (dashboard summary), existing data
2. **Portfolio Performance** - Same as above
3. **Debtor Geographic** - Simple aggregation, state lookup table
4. **Debt Age Geographic** - Date math, existing data
5. **Sankey (Payment Type)** - Transaction grouping

### Medium Risk ⚠️

1. **Creditor Geographic** - Needs `original_creditor_state` field (easy migration)
2. **Portfolio Type** - Needs enum field + seed data (easy migration)
3. **Real-Time Events (Tier 2)** - New tech (WebSocket) but well-documented
4. **Combined Geographic** - Joins multiple datasets (performance concern)

### High Risk ❌

1. **ML Scoring** - Requires ML infrastructure, data scientists
2. **Responsiveness** - Blocked by api-communications service
3. **Tier 4 Automation** - Complex business rules, testing overhead

---

## Recommendations

### Immediate Actions (This Week)

1. ✅ **Approve** adding `portfolio_type` to portfolios
2. ✅ **Approve** adding `original_creditor_state` to debts
3. ✅ **Start** implementing Recovery Trends (follows dashboard pattern)
4. ⬜ **Decide** on real-time events priority (high user wow-factor)

### Next Sprint (2-3 Weeks)

1. Complete Recovery Trends + Portfolio Performance (Phase 1)
2. Add schema changes for geographic features
3. Implement 4 core geographic endpoints
4. Build GeoMap component

### Future Sprints (v2)

1. Add real-time event system (WebSocket)
2. Build api-communications service
3. Add responsiveness analytics
4. Explore ML scoring (if business justifies)

---

## Conclusion

**Your original planning docs were excellent**. They show:
- ✅ Clear understanding of user needs
- ✅ Sophisticated technical architecture
- ✅ Proper separation of concerns (Tier 1-4 events)
- ✅ Realistic component structure

**What needs adjustment**:
- ⚠️ Some features require data we don't capture (responsiveness, ML scores)
- ⚠️ Some features require services we haven't built (api-communications)
- ⚠️ Some features raise compliance concerns (demographics)

**Bottom line**: **You can implement 80% of your original vision** with:
- 2-3 minor schema changes (portfolio_type, original_creditor_state)
- Following the proven orchestration pattern (dashboard summary)
- Deferring ML/communications features to v2

**The architecture is sound. The data model just needs targeted extensions.**

---

## Questions for You

1. **Priority**: Which matters more right now - geographic maps or real-time events?
2. **Schema Changes**: Approve portfolio_type + original_creditor_state additions?
3. **ML Scores**: Want simple heuristics for v1, or skip likelihood/risk maps entirely?
4. **Demographics**: Skip entirely, or use ZIP code proxy data (less accurate)?
5. **Scope**: Ship Recovery Trends + Portfolio Performance first, or go straight to geographic?

Let me know your priorities and I can create a detailed implementation plan for the next sprint!
