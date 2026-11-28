# Team Performance & Capacity Metrics - MVP Strategy

**Document Version**: 1.0
**Last Updated**: 2026-01-10
**Status**: MVP Planning
**Owner**: Product & Engineering

---

## Executive Summary

This document defines the strategy for implementing team and collector performance metrics in Verichron Recover. We differentiate between **MVP features** (what we can deliver with existing infrastructure) and **Post-MVP enhancements** (what requires additional instrumentation and data collection).

**MVP Goal**: Show meaningful, accurate metrics using data that already exists in the system, avoiding hardcoded placeholders and "Coming Soon" messaging where possible.

**Post-MVP Goal**: Build predictive capacity planning, RPC tracking, and real-time workload optimization.

---

## Current State Analysis

### What's Hardcoded/Mocked (As of 2026-01-10)

| Location | Metric | Current Value | Issue |
|----------|--------|---------------|-------|
| `TeamDetail.tsx:182` | Total Capacity | `75%` | Hardcoded, not real data |
| `TeamDetail.tsx:187` | Team RPC Rate | `--% Not available` | Not tracked |
| `TeamDetail.tsx:192` | Collections Today | `$0 Not available` | Not aggregated |
| `TeamDetail.tsx:248` | Collector Load | `0%` | Hardcoded zero |
| `TeamDetail.tsx:244` | Collector RPC Rate | `--` | Not tracked |
| `ResourceOptimizer.tsx:147` | Team Utilization | `0%` | Hardcoded zero |
| `TeamCard.tsx` | Team Member Count | Real | ✅ Accurate |
| Team member MoreVertical button | Actions menu | No handler | Not wired |

### What Data We Already Have

✅ **From `api-collectors/performance`:**
- `usePerformanceControllerGetTodayStats` - Calls made, emails sent, accounts contacted, amount collected today
- `usePerformanceControllerGetWeekStats` - Total calls, accounts resolved, recovery rate, total collected
- `usePerformanceControllerGetHistory` - Time-series performance data

✅ **From `api-organizations/teams`:**
- Team member roster with roles (primary/member, team lead/collector)
- Team-to-portfolio assignments
- User information (name, email, status)

✅ **From `api-debts`:**
- Portfolio debt counts
- Total balances per portfolio
- Debt statuses

❌ **What We DON'T Have:**
- RPC (Right Party Contact) rate tracking
- Call disposition data (spoke to debtor vs left voicemail)
- Real-time workload assignment counts per collector
- Capacity limits/targets per collector
- Team-level performance aggregations

---

## MVP Implementation Strategy

### Philosophy

**Show Real Data, Not Placeholders**

Instead of displaying "Not Available" for metrics we can't calculate, we'll:
1. Use existing collector performance APIs
2. Calculate simple, meaningful metrics from available data
3. Only show metrics we can accurately measure
4. Design UI to gracefully handle missing data without "Coming Soon" banners

---

## MVP Features (Deliverable Now)

### 1. Collector Performance Stats (Individual)

**What We Can Show:**

| Metric | Calculation | Data Source |
|--------|-------------|-------------|
| Calls Today | Direct from API | `usePerformanceControllerGetTodayStats()` |
| Emails Today | Direct from API | `usePerformanceControllerGetTodayStats()` |
| Accounts Contacted Today | Direct from API | `usePerformanceControllerGetTodayStats()` |
| Amount Collected Today | Direct from API | `usePerformanceControllerGetTodayStats()` |
| Weekly Recovery Rate | Direct from API | `usePerformanceControllerGetWeekStats()` |
| Accounts Resolved This Week | Direct from API | `usePerformanceControllerGetWeekStats()` |

**Implementation:**
```typescript
// TeamDetail.tsx - For each team member
const { data: collectorStats } = usePerformanceControllerGetTodayStats(
  organizationId,
  m.userId // team member userId
);

// Display real metrics
<div>
  <p>Calls Today: {collectorStats?.callsMade || 0}</p>
  <p>Collected: ${(collectorStats?.collectedToday || 0) / 100}</p>
</div>
```

**Status**: ✅ API exists, ready to wire
**Effort**: 2-3 hours
**Priority**: High

---

### 2. Team Aggregated Performance

**What We Can Show:**

| Metric | Calculation | Formula |
|--------|-------------|---------|
| Total Collections Today | Sum of all collectors | `SUM(collector.collectedToday)` |
| Team Total Calls Today | Sum of all collectors | `SUM(collector.callsMade)` |
| Team Total Emails Today | Sum of all collectors | `SUM(collector.emailsSent)` |
| Active Collectors | Count of team members | `members.length` |

**Implementation:**
```typescript
// TeamDetail.tsx
const teamStats = useMemo(() => {
  return members.reduce((acc, member) => {
    const stats = memberStatsMap.get(member.userId);
    return {
      totalCollected: acc.totalCollected + (stats?.collectedToday || 0),
      totalCalls: acc.totalCalls + (stats?.callsMade || 0),
      totalEmails: acc.totalEmails + (stats?.emailsSent || 0),
    };
  }, { totalCollected: 0, totalCalls: 0, totalEmails: 0 });
}, [members, memberStatsMap]);
```

**Status**: ✅ Data available, needs aggregation logic
**Effort**: 1-2 hours
**Priority**: High

---

### 3. Simple Capacity Metrics

**What We Can Show:**

#### Team Staffing Capacity
**Definition**: How fully staffed is the team?

**Formula**: `(current team members / target team size) × 100`

**Implementation**:
```typescript
// Option A: Hardcode target (simple for MVP)
const targetTeamSize = 8; // Configuration per org
const staffingCapacity = (members.length / targetTeamSize) * 100;

// Option B: Use portfolio debt count as proxy
const totalDebts = assignedPortfolios.reduce((sum, p) => sum + p.debtCount, 0);
const idealCollectorsForLoad = Math.ceil(totalDebts / 75); // 75 accounts per collector
const staffingCapacity = (members.length / idealCollectorsForLoad) * 100;
```

**Recommended**: Option B for MVP (data-driven, no hardcoding)

**Display**:
- 0-70%: Red (understaffed)
- 71-90%: Amber (adequate)
- 91-110%: Green (optimal)
- 111%+: Amber (overstaffed - portfolio may be too small)

**Status**: ✅ Can implement with existing data
**Effort**: 2 hours
**Priority**: Medium

---

#### Portfolio Coverage
**Definition**: How many portfolios are assigned vs unassigned?

**Formula**: `(assigned portfolios to teams / total portfolios) × 100`

**Status**: ✅ Already have this data
**Effort**: 1 hour
**Priority**: Low (nice-to-have)

---

### 4. Collector Action Buttons

**Current State**: MoreVertical button exists but has no onClick handler

**MVP Actions**:

| Action | Behavior | Priority |
|--------|----------|----------|
| View Details | Navigate to `/roster/staff/${userId}` (staff detail page) | High |
| View Performance | Open modal with performance stats chart | Medium |
| Adjust Workload | (Defer to Post-MVP) | Low |

**Implementation**:
```typescript
// TeamDetail.tsx - Add state for action menu
const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

// Update button
<button
  onClick={(e) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === m.userId ? null : m.userId);
  }}
>
  <MoreVertical size={16} />
</button>

{activeMenuId === m.userId && (
  <div className="absolute right-0 top-8 ...">
    <button onClick={() => navigate({ to: '/roster/staff/$userId', params: { userId: m.userId }})}>
      View Profile
    </button>
    <button onClick={() => setShowPerformanceModal(m.userId)}>
      Performance
    </button>
  </div>
)}
```

**Status**: ⏳ Needs implementation
**Effort**: 1-2 hours
**Priority**: High

---

### 5. What We're NOT Showing in MVP

**Metrics Deferred to Post-MVP** (require new infrastructure):

| Metric | Why Not MVP | Post-MVP Solution |
|--------|-------------|-------------------|
| RPC Rate | No call disposition tracking | Implement in api-communications + api-voice |
| Collector Workload % | No real-time assignment tracking | Build workload service in api-collectors |
| Predicted Capacity | No historical utilization data | ML model after 3 months of data |
| Time-to-Contact | No timestamp tracking on first contact | Add to collector-response-tracking |
| Average Handle Time | No call duration tracking | Integrate with Twilio call logs |

**Instead**: Remove UI elements for these metrics or replace with available alternatives

---

## MVP UI/UX Design Decisions

### Team Detail Page

**Before** (Hardcoded):
```
Total Capacity: 75% [hardcoded]
Team RPC Rate: --% Not available
Collections Today: $0 Not available
```

**After** (MVP):
```
Team Staffing: 87% [5 of 6 recommended collectors]
Collections Today: $12,450 [real aggregate]
Total Calls Today: 234 [real aggregate]
```

**Removed**:
- "RPC Rate" section (not available, no placeholder)

**Rationale**: Show what we know accurately, remove what we can't measure

---

### Collector Row

**Before** (Hardcoded):
```
RPC Rate: --
Load: 0% [hardcoded]
[Action button does nothing]
```

**After** (MVP):
```
Today: 18 calls, $450 collected
This Week: 87 calls, 3 resolved, $2,340 total
[Action menu: View Profile, Performance]
```

**Removed**:
- Individual "Load %" (requires workload tracking)
- "RPC Rate" column (not tracked)

**Rationale**: Focus on activity metrics (calls, collections) rather than ratios we can't calculate

---

### Team Card (ResourceOptimizer)

**Before**:
```
Utilization: 0% [hardcoded]
Projected Utilization: undefined
```

**After** (MVP):
```
Team Size: 5 collectors
Portfolios: 3 assigned
Total Debts: 342 accounts
```

**Rationale**: Show concrete facts (team size, workload) instead of percentages we can't calculate accurately

---

## Post-MVP Roadmap

### Phase 1: RPC Rate Tracking (4-6 weeks)

**Requirements**:
1. Call disposition tracking in api-voice
2. Communication outcome classification in api-communications
3. Aggregate RPC calculation service

**Implementation**:

**api-voice changes**:
```typescript
// New field in call logs
interface CallLog {
  outcome: 'SPOKE_TO_DEBTOR' | 'LEFT_VOICEMAIL' | 'NO_ANSWER' | 'WRONG_NUMBER' | 'BUSY';
  contactedRightParty: boolean;
}
```

**api-collectors changes**:
```typescript
// New endpoint
GET /collectors/:userId/rpc-rate?period=today
Response: {
  totalAttempts: 45,
  rightPartyContacts: 12,
  rpcRate: 26.7 // percentage
}
```

**Calculation**:
```typescript
RPC Rate = (calls where contactedRightParty === true / total calls) × 100
```

**Display Target**:
- Industry Average: 15-30%
- Amber threshold: < 20%
- Green: 20-35%
- Red: < 15% or > 40% (suspiciously high)

---

### Phase 2: Real-Time Workload Tracking (6-8 weeks)

**Requirements**:
1. Active assignment tracking (which debts are currently assigned to which collector)
2. Workload calculation service
3. Capacity target configuration per collector

**Implementation**:

**New service**: `api-collectors/workload`

```typescript
// Workload entity
interface CollectorWorkload {
  collectorUserId: string;
  activeAssignments: number; // currently assigned debts
  capacityTarget: number; // max accounts (default 75)
  utilization: number; // (activeAssignments / capacityTarget) × 100
  portfolioBreakdown: {
    portfolioId: string;
    assignedCount: number;
  }[];
}

// Endpoint
GET /collectors/:userId/workload
Response: CollectorWorkload
```

**Calculation**:
```typescript
Collector Load = (active assignments / capacity target) × 100

Team Capacity = (
  SUM(collector.activeAssignments) /
  SUM(collector.capacityTarget)
) × 100
```

**Display**:
- 0-70%: Green (underutilized)
- 71-90%: Green (optimal)
- 91-100%: Amber (near capacity)
- 101-110%: Red (overloaded)
- 111%+: Red + pulse animation (critical overload)

**Auto-balancing**: When team capacity > 95%, trigger alert to redistribute workload

---

### Phase 3: Predictive Capacity Planning (10-12 weeks)

**Requirements**:
1. 90 days of historical utilization data
2. Seasonal pattern analysis
3. Machine learning model (optional) or statistical forecasting

**Capabilities**:

**Forecast Models**:
```typescript
// Predict team capacity needs 30 days out
interface CapacityForecast {
  date: string;
  predictedWorkload: number; // expected account count
  recommendedStaffing: number; // collectors needed
  confidenceInterval: [number, number]; // [min, max]
}

// Seasonal adjustments
interface SeasonalPattern {
  month: string;
  avgWorkloadMultiplier: number; // e.g., Dec = 1.3x normal
  recommendedStaffingAdjustment: number;
}
```

**Use Cases**:
- **Hiring Planning**: "You'll need 2 more collectors by March based on portfolio growth"
- **Vacation Scheduling**: "Team can't have >2 collectors out simultaneously in Dec"
- **Budget Forecasting**: "Projected staffing costs for Q2: $X based on anticipated workload"

**Data Requirements**:
- Historical daily/weekly utilization
- Portfolio growth rates
- Seasonal collections patterns
- Collector productivity trends

---

### Phase 4: Advanced Metrics (12+ weeks)

**Nice-to-Have Enhancements**:

| Metric | Purpose | Calculation |
|--------|---------|-------------|
| Time-to-First-Contact | Measure response speed | `debt.createdAt` → `first action timestamp` |
| Average Handle Time | Efficiency metric | `SUM(call durations) / total calls` |
| Email Response Rate | Email effectiveness | `emails with reply / total emails sent` |
| Promise-to-Pay Rate | Negotiation success | `promises secured / total contacts` |
| Promise Keep Rate | Debtor reliability | `promises kept / promises made` |
| Liquidation Rate | Portfolio performance | `$ collected / $ assigned` |

**Implementation**: Requires comprehensive event tracking across api-communications, api-voice, api-collectors

---

## Technical Implementation Notes

### Data Fetching Strategy

**For MVP**:
```typescript
// TeamDetail.tsx - Fetch performance for all team members in parallel
const memberStatsQueries = members.map(m =>
  usePerformanceControllerGetTodayStats(organizationId, m.userId)
);

// Aggregate results
const teamStats = useMemo(() => {
  return memberStatsQueries.reduce((acc, query) => {
    if (!query.data) return acc;
    return {
      totalCollected: acc.totalCollected + query.data.collectedToday,
      totalCalls: acc.totalCalls + query.data.callsMade,
      // ...
    };
  }, initialStats);
}, [memberStatsQueries]);
```

**Performance Consideration**:
- For teams of 5-10 collectors: Parallel fetching is fine
- For teams of 20+: Consider backend aggregation endpoint

**Post-MVP Optimization**:
```typescript
// New endpoint: GET /teams/:teamId/aggregated-performance
// Returns pre-calculated team totals instead of client-side aggregation
```

---

### Caching Strategy

**MVP**:
- Performance stats: Stale time 30 seconds (frequent updates)
- Team roster: Stale time 5 minutes (changes infrequently)
- Portfolio assignments: Stale time 2 minutes

**React Query Config**:
```typescript
const { data } = usePerformanceControllerGetTodayStats(orgId, userId, {
  query: {
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every 60s when tab active
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  }
});
```

---

### Metric Display Components

**Reusable Components** (Create for MVP):

1. **`<MetricCard />`** - Display single stat with trend
   ```typescript
   <MetricCard
     label="Calls Today"
     value={234}
     trend={+12.5} // percentage vs yesterday
     icon={Phone}
     color="primary"
   />
   ```

2. **`<CollectorPerformanceRow />`** - Individual collector stats
   ```typescript
   <CollectorPerformanceRow
     collector={user}
     todayStats={stats}
     onViewDetails={() => navigate(...)}
   />
   ```

3. **`<TeamStatsHeader />`** - Aggregated team metrics
   ```typescript
   <TeamStatsHeader
     teamSize={5}
     totalCollected={12450}
     totalCalls={234}
   />
   ```

---

## Success Metrics

### MVP Success Criteria

✅ **No hardcoded placeholder values** in production UI
✅ **All displayed metrics** are accurate and real-time
✅ **Team aggregations** match sum of individual collector stats
✅ **Action buttons** functional (navigate to detail pages)
✅ **Performance data refreshes** within 60 seconds of activity

### Post-MVP Success Criteria

✅ **RPC rate tracking** with 90%+ accuracy vs manual audit
✅ **Workload balancing** reduces 100%+ utilization events by 50%
✅ **Capacity forecasting** predicts staffing needs within ±1 collector
✅ **Manager adoption**: 80% of managers use capacity dashboard weekly

---

## Configuration & Customization

### Org-Level Settings (Future)

Allow organizations to configure:

| Setting | Default | Purpose |
|---------|---------|---------|
| Target accounts per collector | 75 | Capacity calculation |
| Optimal RPC rate | 25% | Performance benchmarking |
| Team size targets | Variable | Staffing capacity |
| Collections goals (daily/weekly) | Variable | Performance targets |

**Storage**: `organizations` table, new columns or JSON config field

**UI**: Settings page → Team Configuration section

---

## Migration Plan

### Phase 1: Remove Hardcoded Values (Week 1)

- [ ] Replace `current={75}` with calculated staffing capacity
- [ ] Replace `current={0}` with real collector stats
- [ ] Remove "Not available" placeholders
- [ ] Wire action button menus

### Phase 2: Add Real Metrics (Week 2)

- [ ] Fetch collector performance stats
- [ ] Aggregate team totals
- [ ] Display collections/calls data
- [ ] Update UtilizationGauge to show staffing capacity

### Phase 3: Polish & Testing (Week 3)

- [ ] Performance optimization (caching, parallel fetching)
- [ ] Error handling (failed API calls)
- [ ] Loading skeletons
- [ ] E2E tests for team metrics

### Phase 4: Post-MVP Planning (Month 2)

- [ ] Design RPC tracking system
- [ ] Spec workload service
- [ ] Prototype capacity forecasting

---

## Dependencies

### MVP Dependencies
- ✅ `api-collectors/performance` - Already exists
- ✅ `api-organizations/teams` - Already exists
- ✅ `api-debts/portfolios` - Already exists
- ✅ React Query hooks - Already generated

### Post-MVP Dependencies
- ⏳ Call disposition tracking (api-voice)
- ⏳ Workload assignment system (api-collectors)
- ⏳ Historical data warehouse (3 months of metrics)
- ⏳ Analytics service (aggregations, forecasting)

---

## Related Documents

- `/apps/api-collectors/src/performance/README.md` - Performance service architecture
- `/apps/ui-managers/src/features/roster/README.md` - Roster feature documentation
- `PRODUCT-DESIGN-IMPLEMENTATION-CHECKPOINT-3.md` - Overall product roadmap
- `DEPLOYMENT-DOMAIN-NAMING-STRATEGY.md` - Domain/subdomain strategy

---

## Appendix A: Industry Benchmarks

### Debt Collection Performance Standards

| Metric | Below Average | Average | Top Performer |
|--------|---------------|---------|---------------|
| RPC Rate | < 15% | 20-30% | > 35% |
| Accounts per Collector | > 100 | 60-80 | 40-60 |
| Liquidation Rate | < 5% | 8-12% | > 15% |
| Average Handle Time | > 8 min | 5-7 min | < 4 min |
| Promise-to-Pay Rate | < 20% | 25-35% | > 40% |
| Collections per Hour | < $50 | $75-$125 | > $150 |

**Source**: ACA International, Collection Advisor Magazine (2024-2025)

---

## Appendix B: Calculation Formulas Reference

### MVP Formulas

```typescript
// Team Staffing Capacity
staffingCapacity = (currentTeamMembers / idealTeamSize) × 100

// Ideal Team Size (data-driven)
idealTeamSize = CEIL(totalAssignedDebts / 75)
// Where 75 = industry standard accounts per collector

// Team Total Collections
teamCollectionsToday = SUM(collector.collectedToday for all collectors)

// Team Total Activity
teamCallsToday = SUM(collector.callsMade for all collectors)
teamEmailsToday = SUM(collector.emailsSent for all collectors)
```

### Post-MVP Formulas

```typescript
// RPC Rate
rpcRate = (callsToRightParty / totalCalls) × 100

// Collector Workload Utilization
collectorUtilization = (activeAssignments / capacityTarget) × 100

// Team Capacity
teamCapacity = (SUM(activeAssignments) / SUM(capacityTargets)) × 100

// Liquidation Rate
liquidationRate = (totalCollected / totalDebtBalance) × 100

// Promise Keep Rate
promiseKeepRate = (promisesKept / promisesMade) × 100

// Time-to-First-Contact (hours)
timeToContact = AVG(firstActionTimestamp - debtCreatedAt)
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-10 | System Architect | Initial strategy document |

---

**Status**: 📋 Planning Complete - Ready for MVP Implementation
**Next Action**: Begin Phase 1 implementation (remove hardcoded values)
**Owner**: Engineering Team
**Target Completion**: Week 3 of Sprint
