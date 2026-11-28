# Flow Analytics - Deferred Views Analysis

**Date:** 2025-12-05
**Status:** Planning / Pre-Implementation
**Purpose:** Assess prerequisites, effort, and approach for implementing deferred Sankey flow views

---

## Executive Summary

| View | Status | Effort | Prerequisites | Risk |
|------|--------|--------|---------------|------|
| **PAYMENT_METHOD** | 🟡 Medium | **2-3 days** | Schema change, data backfill | Low |
| **STATE (Geographic)** | 🟢 Ready | **1-2 days** | None (data exists) | Low |
| **STATUS_TRANSITION** | 🔴 Large | **5-7 days** | Audit infrastructure, event sourcing | Medium-High |

**Recommendation:** Implement in order: STATE → PAYMENT_METHOD → STATUS_TRANSITION

---

## 1. PAYMENT_METHOD View

### Current State
- ✅ Orchestrator routing exists
- ✅ api-transactions endpoint stubbed
- ❌ TransactionHistory entity missing `payment_method_type` field
- ❌ Only stores `paymentMethodToken` (Stripe token reference)

### Prerequisites

#### A. Database Schema Changes

**Entity:** `TransactionHistory` (`apps/api-transactions/src/transactions/entities/transaction-history.entity.ts`)

**Required Change:**
```typescript
@ApiProperty({
  description: 'Type of payment method used',
  enum: PaymentMethod,
  example: PaymentMethod.VISA,
  nullable: true,
})
@Column({
  type: 'enum',
  enum: PaymentMethod,
  name: 'payment_method_type',
  nullable: true,
  comment: 'Type of payment method - VISA, MASTERCARD, AMEX, ACH, etc.',
})
@Index()
paymentMethodType: PaymentMethod | null;
```

**Migration:**
```sql
-- Add new column
ALTER TABLE transaction_history
ADD COLUMN payment_method_type VARCHAR(50);

-- Create index for analytics queries
CREATE INDEX idx_transaction_history_payment_method
ON transaction_history(organization_id, payment_method_type)
WHERE payment_method_type IS NOT NULL;

-- Create index for date range queries
CREATE INDEX idx_transaction_history_org_date_method
ON transaction_history(organization_id, created_at, payment_method_type);
```

**Effort:** 1 hour (schema) + testing

---

#### B. Data Backfill Strategy

**Problem:** Existing transactions don't have `payment_method_type` populated.

**Options:**

**Option 1: Default to 'OTHER' (Fast, Low Accuracy)**
```sql
UPDATE transaction_history
SET payment_method_type = 'OTHER'
WHERE payment_method_type IS NULL;
```
- **Pros:** Instant, no API calls
- **Cons:** No real insight into historical payment methods
- **Use Case:** MVP, testing

**Option 2: Parse from Stripe Token (Medium, Medium Accuracy)**
```typescript
// Run migration script
const tokens = await transactionRepo.find({
  where: { paymentMethodType: IsNull() },
  select: ['id', 'paymentMethodToken'],
});

for (const txn of tokens) {
  let methodType = PaymentMethod.OTHER;

  // Stripe token patterns:
  // pm_xxx_visa → VISA
  // pm_xxx_mastercard → MASTERCARD
  // bank_account_xxx → ACH

  if (txn.paymentMethodToken.includes('visa')) {
    methodType = PaymentMethod.VISA;
  } else if (txn.paymentMethodToken.includes('mastercard')) {
    methodType = PaymentMethod.MASTERCARD;
  } else if (txn.paymentMethodToken.includes('bank_account')) {
    methodType = PaymentMethod.ACH;
  }
  // ... etc

  await transactionRepo.update(txn.id, { paymentMethodType: methodType });
}
```
- **Pros:** Better accuracy than default
- **Cons:** Requires parsing logic, may miss edge cases
- **Use Case:** Good compromise

**Option 3: Stripe API Lookup (Slow, High Accuracy)**
```typescript
// Query Stripe API for each payment method
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

for (const txn of tokens) {
  try {
    const paymentMethod = await stripe.paymentMethods.retrieve(
      txn.paymentMethodToken
    );

    const methodType = mapStripeTypeToEnum(paymentMethod.card?.brand || paymentMethod.type);
    await transactionRepo.update(txn.id, { paymentMethodType: methodType });
  } catch (err) {
    // Token may be expired or invalid
    await transactionRepo.update(txn.id, { paymentMethodType: PaymentMethod.OTHER });
  }
}
```
- **Pros:** 100% accurate (for valid tokens)
- **Cons:** Very slow (API rate limits), may hit token expiration
- **Use Case:** Small datasets (<10k transactions)

**Recommendation:** Option 2 (Parse from token) for backfill, then capture on new transactions going forward.

**Effort:** 2-4 hours (depends on transaction count)

---

#### C. Application Code Changes

**Location:** `apps/api-transactions/src/internal/analytics/analytics.service.ts`

**Implementation:**
```typescript
async getFlowAnalytics(
  organizationId: string,
  query: FlowAnalyticsInternalQueryDto,
): Promise<FlowAnalyticsPaymentResponseDto> {
  this.logger.log(`[getFlowAnalytics] START for org: ${organizationId}, view: ${query.view}`);

  if (query.view !== FlowDimension.PAYMENT_METHOD) {
    this.logger.log(`[getFlowAnalytics] View ${query.view} not handled by api-transactions`);
    return { paymentsByDimension: [] };
  }

  // Build query with filters
  const queryBuilder = this.transactionHistoryRepository
    .createQueryBuilder('txn')
    .where('txn.organization_id = :organizationId', { organizationId })
    .andWhere('txn.status = :status', { status: PaymentStatus.SUCCEEDED })
    .andWhere('txn.payment_method_type IS NOT NULL');

  // Apply date filters
  if (query.startDate) {
    queryBuilder.andWhere('txn.created_at >= :startDate', {
      startDate: new Date(query.startDate),
    });
  }
  if (query.endDate) {
    queryBuilder.andWhere('txn.created_at <= :endDate', {
      endDate: new Date(query.endDate),
    });
  }

  // Aggregate by payment method
  queryBuilder
    .select('txn.payment_method_type', 'dimensionValue')
    .addSelect('SUM(CAST(txn.amount AS DECIMAL))', 'totalAmount')
    .addSelect('COUNT(txn.id)', 'transactionCount')
    .groupBy('txn.payment_method_type')
    .orderBy('"totalAmount"', 'DESC');

  const results = await queryBuilder.getRawMany();

  this.logger.log(`[getFlowAnalytics] Found ${results.length} payment methods`);

  // Transform results
  const paymentsByDimension: FlowDimensionDataDto[] = results.map((row) => ({
    dimensionValue: row.dimensionValue,
    label: formatPaymentMethodLabel(row.dimensionValue),  // "VISA" → "Visa"
    totalPrincipal: parseFloat(row.totalAmount || '0').toFixed(2),
    debtCount: parseInt(row.transactionCount, 10),
  }));

  return { paymentsByDimension };
}
```

**Effort:** 2-3 hours (implementation + testing)

---

#### D. Future Transaction Capture

**Problem:** Need to capture payment method type on NEW transactions going forward.

**Solution:** Update transaction creation logic:

**Location:** `apps/api-transactions/src/transactions/transactions.service.ts` (or wherever transactions are created)

```typescript
async createTransaction(createDto: CreateTransactionDto) {
  // Existing Stripe charge creation
  const charge = await stripe.charges.create({
    amount: createDto.amount,
    currency: 'usd',
    source: createDto.paymentMethodToken,
    // ...
  });

  // NEW: Determine payment method type from Stripe response
  const paymentMethodType = this.determinePaymentMethodType(charge);

  const transaction = this.transactionRepo.create({
    ...createDto,
    paymentMethodToken: charge.source.id,
    paymentMethodType,  // NEW FIELD
    gatewayTransactionId: charge.id,
    status: charge.status === 'succeeded' ? PaymentStatus.SUCCEEDED : PaymentStatus.PENDING,
  });

  return await this.transactionRepo.save(transaction);
}

private determinePaymentMethodType(charge: Stripe.Charge): PaymentMethod {
  if (charge.payment_method_details?.card?.brand) {
    const brand = charge.payment_method_details.card.brand.toUpperCase();
    return PaymentMethod[brand] || PaymentMethod.OTHER;
  }
  if (charge.payment_method_details?.type === 'ach_debit') {
    return PaymentMethod.ACH;
  }
  return PaymentMethod.OTHER;
}
```

**Effort:** 1-2 hours (find all transaction creation points, update)

---

### Total Effort Estimate: PAYMENT_METHOD

| Task | Time | Risk |
|------|------|------|
| Schema migration | 1 hour | Low |
| Data backfill (Option 2) | 2-4 hours | Low |
| Analytics endpoint implementation | 2-3 hours | Low |
| Future capture logic | 1-2 hours | Low |
| Testing (unit + integration) | 3-4 hours | Low |
| **TOTAL** | **9-14 hours (2-3 days)** | **Low** |

---

## 2. STATE (Geographic) View

### Current State
- ✅ DebtorAddress entity exists with `state` field
- ✅ Data is already being captured
- ❌ No api-debtors analytics endpoint
- ❌ No orchestrator integration

### Prerequisites

**Good News:** Schema is ready! `debtor_addresses` table has:
- `state` VARCHAR(50) - Already populated
- `postal_code` VARCHAR(10) - Already populated
- `city` VARCHAR(100) - Already populated
- `is_current` BOOLEAN - Filter to current addresses
- `is_primary` BOOLEAN - Identify primary address

**Data Quality Check Needed:**
```sql
-- How many debtors have addresses?
SELECT COUNT(DISTINCT dp.id) as debtors_with_addresses
FROM debtor_profiles dp
JOIN debtor_addresses da ON da.debtor_profile_id = dp.id
WHERE dp.organization_id = 'your-org-id'
  AND da.is_current = true;

-- How many addresses have state populated?
SELECT COUNT(*) as addresses_with_state
FROM debtor_addresses
WHERE state IS NOT NULL;

-- State distribution
SELECT state, COUNT(*) as count
FROM debtor_addresses
WHERE state IS NOT NULL
GROUP BY state
ORDER BY count DESC
LIMIT 20;
```

---

### Implementation Steps

#### A. Create api-debtors Analytics Endpoint

**New Files:**
1. `apps/api-debtors/src/internal/analytics/analytics.module.ts`
2. `apps/api-debtors/src/internal/analytics/analytics.controller.ts`
3. `apps/api-debtors/src/internal/analytics/analytics.service.ts`
4. `apps/api-debtors/src/internal/analytics/dto/` (DTOs)

**Service Implementation:**
```typescript
async getFlowAnalytics(
  organizationId: string,
  query: FlowAnalyticsInternalQueryDto,
): Promise<FlowAnalyticsDebtorResponseDto> {
  this.logger.log(`[getFlowAnalytics] START for org: ${organizationId}, view: ${query.view}`);

  if (query.view !== FlowDimension.STATE) {
    this.logger.log(`[getFlowAnalytics] View ${query.view} not handled by api-debtors`);
    return { debtorsByDimension: [] };
  }

  // Join debtor profiles → addresses → debts to get principal by state
  const queryBuilder = this.debtorProfileRepository
    .createQueryBuilder('profile')
    .innerJoin('debtor_addresses', 'addr', 'addr.debtor_profile_id = profile.id')
    .innerJoin('debts', 'debt', 'debt.debtor_id = profile.id')  // Assumes debts.debtor_id links to profile
    .where('profile.organization_id = :organizationId', { organizationId })
    .andWhere('addr.is_current = true')  // Only current addresses
    .andWhere('addr.state IS NOT NULL');

  // Apply date filters on debt creation
  if (query.startDate) {
    queryBuilder.andWhere('debt.created_at >= :startDate', {
      startDate: new Date(query.startDate),
    });
  }
  if (query.endDate) {
    queryBuilder.andWhere('debt.created_at <= :endDate', {
      endDate: new Date(query.endDate),
    });
  }

  // Aggregate by state
  queryBuilder
    .select('addr.state', 'dimensionValue')
    .addSelect('SUM(CAST(debt.principal_amount AS DECIMAL))', 'totalPrincipal')
    .addSelect('COUNT(DISTINCT debt.id)', 'debtCount')
    .groupBy('addr.state')
    .orderBy('"totalPrincipal"', 'DESC');

  const results = await queryBuilder.getRawMany();

  this.logger.log(`[getFlowAnalytics] Found ${results.length} states`);

  // Transform results
  const debtorsByDimension: FlowDimensionDataDto[] = results.map((row) => ({
    dimensionValue: row.dimensionValue,
    label: formatStateLabel(row.dimensionValue),  // "CA" → "California"
    totalPrincipal: parseFloat(row.totalPrincipal || '0').toFixed(2),
    debtCount: parseInt(row.debtCount, 10),
  }));

  return { debtorsByDimension };
}
```

**Effort:** 4-6 hours (new module setup, implementation, HMAC auth)

---

#### B. Orchestrator Integration

**Location:** `packages/event-orchestrator/src/orchestrators/analytics-flow.orchestrator.ts`

**Add routing:**
```typescript
case FlowDimension.STATE:
  const debtorResponse = await this.debtorsClient.getFlowAnalytics(orgId, query);
  dimensionData = debtorResponse.debtorsByDimension;
  viewPrefix = 'state';
  break;
```

**Setup HMAC Client:**
```typescript
// In constructor
this.debtorsClient = new HmacAuthenticatedClient(
  configService.get('API_DEBTORS_URL'),
  configService.get('INTERNAL_HMAC_SECRET'),
  'api-debtors'
);
```

**Effort:** 1-2 hours

---

#### C. UI Updates

**Location:** `apps/ui-organizations/src/features/analytics/components/FlowViewSelector.tsx`

**Enable STATE view:**
```typescript
{
  value: FlowDimension.STATE,
  label: 'Geographic',
  icon: MapPin,
  description: 'Flow by debtor state',
  available: true,  // Change from false
},
```

**Effort:** 15 minutes

---

### Potential Issues

**Issue 1: Debtor-to-Debt Relationship**
- Need to verify: Does `debts` table have `debtor_id` or `debtor_profile_id`?
- May need to join through different path

**Issue 2: Multiple Addresses**
- Debtors can have multiple addresses
- Filter: `is_current = true AND is_primary = true` to get one address per debtor

**Issue 3: NULL States**
- Some addresses may not have state populated
- Solution: Filter out NULLs, or show as "Unknown" node

---

### Total Effort Estimate: STATE

| Task | Time | Risk |
|------|------|------|
| Data quality check | 30 min | Low |
| api-debtors analytics module | 4-6 hours | Low |
| Orchestrator integration | 1-2 hours | Low |
| UI enable view | 15 min | Low |
| Testing (unit + integration) | 3-4 hours | Low |
| **TOTAL** | **9-13 hours (1-2 days)** | **Low** |

**Note:** Assumes `debts.debtor_id` relationship exists. If not, may need debtor-debt mapping strategy (similar to portfolio performance).

---

## 3. STATUS_TRANSITION View

### Current State
- ❌ No audit log infrastructure
- ❌ No event sourcing for debt status changes
- ❌ No historical status data
- ❌ Current schema only stores current status, not history

### Prerequisites

This is the most complex view because it requires **temporal data** about how debts move between statuses.

---

### Approach A: Audit Log Infrastructure (Recommended)

**Create generic audit log system:**

#### A1. Database Schema

**New Table:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,       -- 'DEBT', 'TRANSACTION', 'DEBTOR', etc.
  entity_id UUID NOT NULL,                 -- ID of the entity that changed
  field_name VARCHAR(100) NOT NULL,        -- 'status', 'amount', 'email', etc.
  old_value TEXT,                          -- Previous value (JSON or string)
  new_value TEXT,                          -- New value (JSON or string)
  changed_by_user_id UUID,                 -- User who made the change (nullable for system)
  changed_by_system VARCHAR(100),          -- System/service that made the change
  change_reason TEXT,                      -- Optional reason for change
  metadata JSONB,                          -- Additional context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_audit_logs_org_entity
ON audit_logs(organization_id, entity_type, entity_id);

CREATE INDEX idx_audit_logs_org_entity_field
ON audit_logs(organization_id, entity_type, field_name)
WHERE field_name IN ('status', 'payment_status');

CREATE INDEX idx_audit_logs_created_at
ON audit_logs(created_at);

-- Index specifically for debt status transitions
CREATE INDEX idx_audit_logs_debt_status_transitions
ON audit_logs(organization_id, entity_type, old_value, new_value, created_at)
WHERE entity_type = 'DEBT' AND field_name = 'status';
```

**Effort:** 1 hour

---

#### A2. Audit Service Package

**New Package:** `packages/audit-logger`

**Files:**
- `src/audit-logger.module.ts`
- `src/audit-logger.service.ts`
- `src/entities/audit-log.entity.ts`
- `src/decorators/auditable.decorator.ts` (optional: automatic auditing)

**Service Implementation:**
```typescript
@Injectable()
export class AuditLoggerService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
  ) {}

  async logChange(params: {
    organizationId: string;
    entityType: string;
    entityId: string;
    fieldName: string;
    oldValue: any;
    newValue: any;
    changedByUserId?: string;
    changedBySystem?: string;
    reason?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.auditLogRepo.insert({
      organizationId: params.organizationId,
      entityType: params.entityType,
      entityId: params.entityId,
      fieldName: params.fieldName,
      oldValue: JSON.stringify(params.oldValue),
      newValue: JSON.stringify(params.newValue),
      changedByUserId: params.changedByUserId,
      changedBySystem: params.changedBySystem || 'system',
      changeReason: params.reason,
      metadata: params.metadata,
    });
  }

  async getStatusTransitions(
    organizationId: string,
    options?: {
      entityType?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<StatusTransitionAggregate[]> {
    const query = this.auditLogRepo
      .createQueryBuilder('audit')
      .select('audit.old_value', 'fromStatus')
      .addSelect('audit.new_value', 'toStatus')
      .addSelect('COUNT(*)', 'transitionCount')
      .where('audit.organization_id = :organizationId', { organizationId })
      .andWhere('audit.field_name = :fieldName', { fieldName: 'status' });

    if (options?.entityType) {
      query.andWhere('audit.entity_type = :entityType', { entityType: options.entityType });
    }
    if (options?.startDate) {
      query.andWhere('audit.created_at >= :startDate', { startDate: options.startDate });
    }
    if (options?.endDate) {
      query.andWhere('audit.created_at <= :endDate', { endDate: options.endDate });
    }

    query
      .groupBy('audit.old_value, audit.new_value')
      .orderBy('transitionCount', 'DESC');

    return query.getRawMany();
  }
}
```

**Effort:** 6-8 hours (package setup, service, entity, tests)

---

#### A3. Integrate Audit Logging into api-debts

**Update Debt Status Change Logic:**

**Location:** `apps/api-debts/src/debts/debts.service.ts` (wherever debt status is updated)

```typescript
async updateDebtStatus(debtId: string, newStatus: DebtStatus, userId?: string): Promise<Debt> {
  const debt = await this.debtRepo.findOne({ where: { id: debtId } });
  if (!debt) throw new NotFoundException('Debt not found');

  const oldStatus = debt.status;

  // Update the debt
  debt.status = newStatus;
  await this.debtRepo.save(debt);

  // Log the change
  await this.auditLogger.logChange({
    organizationId: debt.organizationId,
    entityType: 'DEBT',
    entityId: debt.id,
    fieldName: 'status',
    oldValue: oldStatus,
    newValue: newStatus,
    changedByUserId: userId,
    changedBySystem: 'api-debts',
    reason: 'Status manually updated',
  });

  return debt;
}
```

**Effort:** 2-3 hours (find all status update points, integrate audit logging)

---

#### A4. Analytics Endpoint for Status Transitions

**New Endpoint:** `GET /internal/analytics/flow/:orgId` in api-debts (or separate audit service)

```typescript
async getFlowAnalytics(
  organizationId: string,
  query: FlowAnalyticsInternalQueryDto,
): Promise<FlowAnalyticsDebtResponseDto> {
  if (query.view !== FlowDimension.STATUS_TRANSITION) {
    return { debtsByDimension: [] };
  }

  // Query audit logs for debt status transitions
  const transitions = await this.auditLogger.getStatusTransitions(organizationId, {
    entityType: 'DEBT',
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
  });

  // Need to join with debts to get principal amounts
  const dimensionData: FlowDimensionDataDto[] = [];

  for (const transition of transitions) {
    const fromStatus = JSON.parse(transition.fromStatus);
    const toStatus = JSON.parse(transition.toStatus);

    // Query debts that made this transition to get total principal
    const debts = await this.auditLogRepo
      .createQueryBuilder('audit')
      .innerJoin('debts', 'debt', 'debt.id = audit.entity_id')
      .select('SUM(CAST(debt.principal_amount AS DECIMAL))', 'totalPrincipal')
      .addSelect('COUNT(DISTINCT debt.id)', 'debtCount')
      .where('audit.organization_id = :organizationId', { organizationId })
      .andWhere('audit.entity_type = :entityType', { entityType: 'DEBT' })
      .andWhere('audit.field_name = :fieldName', { fieldName: 'status' })
      .andWhere('audit.old_value = :oldValue', { oldValue: transition.fromStatus })
      .andWhere('audit.new_value = :newValue', { newValue: transition.toStatus })
      .getRawOne();

    dimensionData.push({
      dimensionValue: `${fromStatus} → ${toStatus}`,
      label: `${formatStatus(fromStatus)} → ${formatStatus(toStatus)}`,
      totalPrincipal: debts.totalPrincipal || '0.00',
      debtCount: parseInt(debts.debtCount || '0', 10),
    });
  }

  return { debtsByDimension: dimensionData };
}
```

**Effort:** 4-6 hours

---

#### A5. Orchestrator & UI Integration

Same as STATE view approach.

**Effort:** 2 hours

---

### Approach B: Event Sourcing (Alternative - More Complex)

Instead of audit logs, implement full event sourcing:

**Pattern:**
1. Every debt status change emits an event: `DebtStatusChangedEvent`
2. Event store persists all events
3. Analytics queries replay events to build transition graph

**Pros:**
- Full event history
- Can rebuild state at any point in time
- More architecturally pure

**Cons:**
- Much more complex to implement
- Requires event store infrastructure
- Harder to query for analytics

**Recommendation:** Use Approach A (Audit Logs) for simplicity.

---

### Approach C: Snapshot Strategy (Quick Win, Limited Insight)

**Idea:** Instead of tracking transitions, track current state distribution.

**Implementation:**
- Query current debt status distribution
- Show flow: "Source" → "ACTIVE", "PAID", "DEFAULTED", etc.
- No transition arrows, just composition

**Pros:**
- No schema changes
- Can implement immediately
- Shows current state distribution

**Cons:**
- Not real "transitions" (misleading visualization)
- Doesn't show debt lifecycle flow
- Limited business value

**Use Case:** Could be a stopgap until audit logs are implemented.

---

### Total Effort Estimate: STATUS_TRANSITION

| Task | Time | Risk |
|------|------|------|
| Audit log schema | 1 hour | Low |
| Audit logger package | 6-8 hours | Medium |
| Integrate audit logging in api-debts | 2-3 hours | Medium |
| Analytics endpoint | 4-6 hours | Medium |
| Orchestrator integration | 2 hours | Low |
| UI enable view | 15 min | Low |
| Testing (unit + integration + E2E) | 6-8 hours | Medium |
| **TOTAL** | **21-28 hours (5-7 days)** | **Medium-High** |

**Additional Considerations:**
- Need to backfill historical transitions (impossible without past data)
- Only transitions going forward will be captured
- May want to apply audit logging to other entities (transactions, debtors, users)

---

## Implementation Recommendations

### Recommended Order

**Phase 1: Quick Win (Week 1)**
- ✅ **STATE View** - Data already exists, low risk, high value
- Time: 1-2 days
- Business Value: Geographic insights, concentration risk

**Phase 2: Payment Insights (Week 2)**
- ✅ **PAYMENT_METHOD View** - Moderate effort, useful insights
- Time: 2-3 days
- Business Value: Payment channel optimization, fraud detection

**Phase 3: Long-term Investment (Future Sprint)**
- ✅ **STATUS_TRANSITION View** - High value but requires infrastructure
- Time: 5-7 days
- Business Value: Lifecycle optimization, bottleneck identification

---

### Risk Mitigation

**For PAYMENT_METHOD:**
- ✅ Test backfill script on staging first
- ✅ Run backfill during off-peak hours
- ✅ Monitor API rate limits if using Stripe API lookup
- ✅ Have rollback plan (restore from backup)

**For STATE:**
- ✅ Verify debtor-debt relationship in schema first
- ✅ Check data quality (% of debtors with addresses)
- ✅ Handle NULL states gracefully

**For STATUS_TRANSITION:**
- ✅ Start with audit log package in isolation (testable)
- ✅ Roll out audit logging gradually (one service at a time)
- ✅ Consider performance impact of audit log writes
- ✅ Partition audit_logs table if volume is high

---

## Testing Strategy

### For Each View

**Unit Tests:**
- Query builder logic (correct SQL, proper aggregation)
- DTO transformation
- Edge cases (NULL values, empty results)

**Integration Tests:**
- End-to-end flow (orchestrator → service → database)
- HMAC authentication
- Filter parameters (date range, portfolio)
- Large dataset performance

**E2E Tests:**
- UI renders correct Sankey diagram
- View selector switches correctly
- Tooltips display accurate data
- Error states handled

---

## Performance Considerations

### PAYMENT_METHOD
- **Query Complexity:** Simple aggregation
- **Expected Volume:** 10k-100k transactions per org
- **Index Strategy:** `(organization_id, payment_method_type, created_at)`
- **Response Time:** <200ms

### STATE
- **Query Complexity:** 3-table join (profiles → addresses → debts)
- **Expected Volume:** 1k-50k debtors per org
- **Index Strategy:** `(debtor_profile_id, is_current)`, `(debtor_id)` on debts
- **Response Time:** <500ms
- **Concern:** JOIN performance at scale

### STATUS_TRANSITION
- **Query Complexity:** Complex (audit logs + debts join)
- **Expected Volume:** 100k-1M audit logs per org
- **Index Strategy:** Composite index on `(organization_id, entity_type, field_name, old_value, new_value)`
- **Response Time:** <1000ms
- **Concern:** Audit log table size, query optimization critical

---

## Conclusion

**Bottom Line:**
- **STATE:** Ready to implement, low risk, 1-2 days
- **PAYMENT_METHOD:** Schema change required, medium effort, 2-3 days
- **STATUS_TRANSITION:** Infrastructure investment, high effort, 5-7 days

**Recommendation:** Start with STATE view to deliver value quickly, then tackle PAYMENT_METHOD. Defer STATUS_TRANSITION until audit logging infrastructure is prioritized at the platform level.

**Total Time for All 3 Views:** 8-12 days of development work

**Business Value Ranking:**
1. STATE (geographic risk assessment)
2. PAYMENT_METHOD (channel optimization)
3. STATUS_TRANSITION (lifecycle optimization)

---

**Author:** Platform Engineering
**Next Steps:** Review with product team, prioritize based on business needs
