# Flow Analytics - STATE & PAYMENT_METHOD Implementation Plan

**Date:** 2025-12-05
**Status:** Pre-MVP (Fresh Schemas, No Backward Compatibility)
**Target:** Implement STATE and PAYMENT_METHOD Sankey views
**Deferred:** STATUS_TRANSITION (requires audit log infrastructure)

---

## Implementation Simplified

**Key Assumptions:**
- ✅ Fresh schemas on every test run
- ✅ No existing production data to migrate
- ✅ E2E seeding handles all data population
- ✅ Can freely change schemas and DTOs

**This Means:**
- ❌ No backfill scripts needed
- ❌ No migration complexity
- ❌ No rollback plans
- ✅ Just update schema, DTOs, seeding, and implement endpoints

---

## 1. PAYMENT_METHOD View

### Effort Estimate: 1-2 Days

### Step 1: Update Transaction Schema (30 min)

**File:** `apps/api-transactions/src/transactions/entities/transaction-history.entity.ts`

**Add field after line 150:**
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
  comment: 'Type of payment method - VISA, MASTERCARD, AMEX, ACH, CHECK, CASH, etc.',
})
@Index()
paymentMethodType: PaymentMethod | null;
```

**Verify PaymentMethod enum exists:**
- Location: `packages/enums/src/payments/payment-method.enum.ts`
- Values: VISA, MASTERCARD, AMEX, DISCOVER, ACH, MONEY_ORDER, CASH, CHECK, OTHER

---

### Step 2: Update E2E Seeding (1-2 hours)

**Find seeding file(s):**
```bash
# Locate where transactions are seeded
find e2e -name "*seed*" -o -name "*transaction*" | grep -i seed
```

**Update transaction seeding to include payment method:**
```typescript
// Example seeding update
const transactions = [
  {
    debtId: debt1.id,
    debtorId: debtor1.id,
    amount: 150.00,
    type: PaymentType.PAYMENT,
    status: PaymentStatus.SUCCEEDED,
    paymentMethodToken: 'tok_visa_1234',
    paymentMethodType: PaymentMethod.VISA,  // NEW
    // ...
  },
  {
    debtId: debt2.id,
    debtorId: debtor2.id,
    amount: 200.00,
    type: PaymentType.PAYMENT,
    status: PaymentStatus.SUCCEEDED,
    paymentMethodToken: 'tok_ach_5678',
    paymentMethodType: PaymentMethod.ACH,  // NEW
    // ...
  },
  {
    debtId: debt3.id,
    debtorId: debtor3.id,
    amount: 75.00,
    type: PaymentType.PAYMENT,
    status: PaymentStatus.SUCCEEDED,
    paymentMethodToken: 'tok_mc_9012',
    paymentMethodType: PaymentMethod.MASTERCARD,  // NEW
    // ...
  },
];

await transactionRepo.save(transactions);
```

**Distribution Recommendation for Realistic Testing:**
- VISA: 40%
- MASTERCARD: 25%
- ACH: 20%
- AMEX: 10%
- CHECK: 3%
- CASH: 2%

---

### Step 3: Implement Analytics Endpoint (2-3 hours)

**File:** `apps/api-transactions/src/internal/analytics/analytics.service.ts`

**Replace stub (lines 381-399) with:**
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

  // Build base query
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

  // Transform results with friendly labels
  const paymentsByDimension: FlowDimensionDataDto[] = results.map((row) => ({
    dimensionValue: row.dimensionValue,
    label: this.formatPaymentMethodLabel(row.dimensionValue),
    totalPrincipal: parseFloat(row.totalAmount || '0').toFixed(2),
    debtCount: parseInt(row.transactionCount, 10),
  }));

  return { paymentsByDimension };
}

/**
 * Format payment method enum to friendly label
 */
private formatPaymentMethodLabel(method: PaymentMethod): string {
  const labels = {
    [PaymentMethod.VISA]: 'Visa',
    [PaymentMethod.MASTERCARD]: 'Mastercard',
    [PaymentMethod.AMEX]: 'American Express',
    [PaymentMethod.DISCOVER]: 'Discover',
    [PaymentMethod.ACH]: 'ACH/Bank Transfer',
    [PaymentMethod.MONEY_ORDER]: 'Money Order',
    [PaymentMethod.CASH]: 'Cash',
    [PaymentMethod.CHECK]: 'Check',
    [PaymentMethod.OTHER]: 'Other',
  };
  return labels[method] || method;
}
```

---

### Step 4: Update UI (15 min)

**File:** `apps/ui-organizations/src/features/analytics/components/FlowViewSelector.tsx`

**Enable PAYMENT_METHOD view (line 26-31):**
```typescript
{
  value: FlowDimension.PAYMENT_METHOD,
  label: 'Payment Method',
  icon: CreditCard,
  description: 'Flow by payment method',
  available: true,  // Change from false
},
```

---

### Step 5: Testing (2-3 hours)

**Unit Tests:**
```typescript
// apps/api-transactions/src/internal/analytics/analytics.service.spec.ts

describe('getFlowAnalytics - PAYMENT_METHOD', () => {
  it('should aggregate payments by payment method', async () => {
    // Arrange: Seed transactions with different payment methods
    await seedTransactions([
      { amount: 100, paymentMethodType: PaymentMethod.VISA },
      { amount: 150, paymentMethodType: PaymentMethod.VISA },
      { amount: 200, paymentMethodType: PaymentMethod.ACH },
    ]);

    // Act
    const result = await service.getFlowAnalytics(orgId, {
      view: FlowDimension.PAYMENT_METHOD,
    });

    // Assert
    expect(result.paymentsByDimension).toHaveLength(2);
    expect(result.paymentsByDimension[0]).toMatchObject({
      dimensionValue: PaymentMethod.VISA,
      label: 'Visa',
      totalPrincipal: '250.00',
      debtCount: 2,
    });
    expect(result.paymentsByDimension[1]).toMatchObject({
      dimensionValue: PaymentMethod.ACH,
      label: 'ACH/Bank Transfer',
      totalPrincipal: '200.00',
      debtCount: 1,
    });
  });

  it('should filter by date range', async () => {
    // Test date filtering
  });

  it('should return empty array for views not handled', async () => {
    const result = await service.getFlowAnalytics(orgId, {
      view: FlowDimension.DEBT_CATEGORY,
    });
    expect(result.paymentsByDimension).toEqual([]);
  });

  it('should exclude NULL payment method types', async () => {
    // Test NULL filtering
  });

  it('should only include SUCCEEDED transactions', async () => {
    // Test status filtering
  });
});
```

**Integration Test:**
```bash
# Run e2e tests to verify end-to-end flow
pnpm e2e test analytics-flow
```

**Manual Testing:**
1. Start all services
2. Navigate to Analytics → Flows
3. Select "Payment Method" view
4. Verify Sankey chart displays payment methods
5. Verify percentages sum to ~100%
6. Hover over nodes/links to check tooltips

---

### PAYMENT_METHOD Checklist

- [ ] Update `TransactionHistory` entity with `paymentMethodType` field
- [ ] Verify PaymentMethod enum exists in `packages/enums`
- [ ] Update e2e seeding to populate payment method types
- [ ] Implement analytics endpoint in api-transactions
- [ ] Add `formatPaymentMethodLabel()` helper
- [ ] Enable view in FlowViewSelector UI
- [ ] Write unit tests for analytics endpoint
- [ ] Run integration tests
- [ ] Manual testing in browser

**Total Effort:** 6-10 hours (1-2 days)

---

## 2. STATE (Geographic) View

### Effort Estimate: 1 Day

### Step 1: Verify Data Already Exists (15 min)

**Schema Check:**
```bash
# DebtorAddress entity already has state field
# File: apps/api-debtors/src/profiles/entities/debtor-address.entity.ts
# Line 124-130: state field exists
```

**E2E Seeding Check:**
```bash
# Verify addresses are being seeded with states
find e2e -name "*seed*" | xargs grep -l "debtor.*address\|address.*state"
```

**If seeding exists:** ✅ Skip to Step 3
**If seeding missing:** Update seeding in Step 2

---

### Step 2: Update E2E Seeding (1 hour) - Only if Needed

**Add debtor addresses to seeding:**
```typescript
// Realistic state distribution for testing
const addresses = [
  {
    debtorProfileId: debtorProfile1.id,
    addressCategory: AddressCategory.RESIDENCE_PRIMARY,
    street1: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90001',
    country: 'US',
    isCurrent: true,
    isPrimary: true,
  },
  {
    debtorProfileId: debtorProfile2.id,
    addressCategory: AddressCategory.RESIDENCE_PRIMARY,
    street1: '456 Oak Ave',
    city: 'Houston',
    state: 'TX',
    postalCode: '77001',
    country: 'US',
    isCurrent: true,
    isPrimary: true,
  },
  {
    debtorProfileId: debtorProfile3.id,
    addressCategory: AddressCategory.RESIDENCE_PRIMARY,
    street1: '789 Pine Rd',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
    isCurrent: true,
    isPrimary: true,
  },
  // ... more addresses
];

await addressRepo.save(addresses);
```

**Distribution Recommendation for Realistic Testing:**
- CA: 30%
- TX: 20%
- NY: 15%
- FL: 10%
- IL: 8%
- PA: 7%
- Other states: 10%

---

### Step 3: Create api-debtors Analytics Module (3-4 hours)

**A. Create Module Structure**

```bash
mkdir -p apps/api-debtors/src/internal/analytics/dto
```

**B. Create DTO Files**

**File:** `apps/api-debtors/src/internal/analytics/dto/flow-analytics-query.dto.ts`
```typescript
import { IsEnum, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { FlowDimension } from '@verichron/contracts';

export class FlowAnalyticsInternalQueryDto {
  @IsEnum(FlowDimension)
  view!: FlowDimension;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  portfolioId?: string;

  @IsOptional()
  portfolioTag?: string[];

  @IsOptional()
  debtCategory?: string;
}
```

**File:** `apps/api-debtors/src/internal/analytics/dto/flow-analytics-response.dto.ts`
```typescript
import { FlowDimensionDataDto } from '@verichron/contracts';

export class FlowAnalyticsDebtorResponseDto {
  debtorsByDimension!: FlowDimensionDataDto[];
}
```

**File:** `apps/api-debtors/src/internal/analytics/dto/index.ts`
```typescript
export * from './flow-analytics-query.dto';
export * from './flow-analytics-response.dto';
```

**C. Create Service**

**File:** `apps/api-debtors/src/internal/analytics/analytics.service.ts`
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DebtorProfileEntity } from '../../profiles/entities/debtor-profile.entity';
import { FlowDimension } from '@verichron/contracts';
import {
  FlowAnalyticsInternalQueryDto,
  FlowAnalyticsDebtorResponseDto,
} from './dto';

@Injectable()
export class InternalAnalyticsService {
  private readonly logger = new Logger(InternalAnalyticsService.name);

  constructor(
    @InjectRepository(DebtorProfileEntity)
    private readonly debtorProfileRepository: Repository<DebtorProfileEntity>,
  ) {}

  async getFlowAnalytics(
    organizationId: string,
    query: FlowAnalyticsInternalQueryDto,
  ): Promise<FlowAnalyticsDebtorResponseDto> {
    this.logger.log(`[getFlowAnalytics] START for org: ${organizationId}, view: ${query.view}`);

    if (query.view !== FlowDimension.STATE) {
      this.logger.log(`[getFlowAnalytics] View ${query.view} not handled by api-debtors`);
      return { debtorsByDimension: [] };
    }

    // Query to join profiles → addresses → debts and aggregate by state
    // Note: Assumes debts table has debtor_profile_id or debtor_id field
    const queryBuilder = this.debtorProfileRepository
      .createQueryBuilder('profile')
      .innerJoin('debtor_addresses', 'addr', 'addr.debtor_profile_id = profile.id')
      .innerJoin('debts', 'debt', 'debt.debtor_id = profile.id')  // VERIFY THIS RELATIONSHIP
      .where('profile.organization_id = :organizationId', { organizationId })
      .andWhere('addr.is_current = true')
      .andWhere('addr.is_primary = true')
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
    const debtorsByDimension = results.map((row) => ({
      dimensionValue: row.dimensionValue,
      label: this.formatStateLabel(row.dimensionValue),
      totalPrincipal: parseFloat(row.totalPrincipal || '0').toFixed(2),
      debtCount: parseInt(row.debtCount, 10),
    }));

    return { debtorsByDimension };
  }

  /**
   * Format state code to full name
   */
  private formatStateLabel(stateCode: string): string {
    const stateNames: Record<string, string> = {
      AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
      CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
      FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
      IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
      KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
      MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
      MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
      NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
      NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
      OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
      SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
      VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
      WI: 'Wisconsin', WY: 'Wyoming',
    };
    return stateNames[stateCode] || stateCode;
  }
}
```

**D. Create Controller**

**File:** `apps/api-debtors/src/internal/analytics/analytics.controller.ts`
```typescript
import { Controller, Get, Param, Query, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { InternalAnalyticsService } from './analytics.service';
import { FlowAnalyticsInternalQueryDto, FlowAnalyticsDebtorResponseDto } from './dto';
import { HmacAuthGuard } from '@verichron/auth'; // Or your HMAC guard path
import { OrgContextGuard } from '@verichron/auth'; // Or your org context guard path

@ApiTags('Internal Analytics')
@Controller('internal/analytics')
@UseGuards(HmacAuthGuard, OrgContextGuard)
export class InternalAnalyticsController {
  private readonly logger = new Logger(InternalAnalyticsController.name);

  constructor(private readonly analyticsService: InternalAnalyticsService) {}

  @Get('flow/:organizationId')
  @ApiOperation({ summary: 'Get flow analytics for geographic (STATE) view' })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  async getFlowAnalytics(
    @Param('organizationId') organizationId: string,
    @Query() query: FlowAnalyticsInternalQueryDto,
  ): Promise<FlowAnalyticsDebtorResponseDto> {
    this.logger.log(
      `[InternalAnalyticsController] getFlowAnalytics called for org: ${organizationId}, view: ${query.view}`,
    );
    try {
      const result = await this.analyticsService.getFlowAnalytics(organizationId, query);
      this.logger.log(
        `[InternalAnalyticsController] getFlowAnalytics completed: ${result.debtorsByDimension.length} dimension groups`,
      );
      return result;
    } catch (error) {
      this.logger.error(`[InternalAnalyticsController] getFlowAnalytics failed: ${error.message}`);
      throw error;
    }
  }
}
```

**E. Create Module**

**File:** `apps/api-debtors/src/internal/analytics/analytics.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DebtorProfileEntity } from '../../profiles/entities/debtor-profile.entity';
import { InternalAnalyticsController } from './analytics.controller';
import { InternalAnalyticsService } from './analytics.service';

@Module({
  imports: [TypeOrmModule.forFeature([DebtorProfileEntity])],
  controllers: [InternalAnalyticsController],
  providers: [InternalAnalyticsService],
  exports: [InternalAnalyticsService],
})
export class InternalAnalyticsModule {}
```

**F. Register Module in App**

**File:** `apps/api-debtors/src/app.module.ts`

```typescript
import { InternalAnalyticsModule } from './internal/analytics/analytics.module';

@Module({
  imports: [
    // ... existing imports
    InternalAnalyticsModule,
  ],
  // ...
})
export class AppModule {}
```

---

### Step 4: Update Orchestrator (30 min)

**File:** `packages/event-orchestrator/src/orchestrators/analytics-flow.orchestrator.ts`

**A. Add HMAC Client for api-debtors:**

```typescript
// In constructor (around line 30-40)
this.debtorsClient = new HmacAuthenticatedClient(
  this.configService.get('API_DEBTORS_URL') || 'http://api-debtors-test:3004',
  this.configService.get('INTERNAL_HMAC_SECRET'),
  'event-orchestrator'
);
```

**B. Add routing case:**

```typescript
// In handleAnalyticsFlowRequested method (around line 80-100)
case FlowDimension.STATE:
  const debtorResponse = await this.debtorsClient.get<{
    debtorsByDimension: FlowDimensionDataDto[];
  }>(`/internal/analytics/flow/${orgId}`, {
    params: {
      view: query.view,
      startDate: query.startDate,
      endDate: query.endDate,
      portfolioId: query.portfolioId,
      portfolioTag: query.portfolioTag?.join(','),
    },
  });
  dimensionData = debtorResponse.data.debtorsByDimension;
  viewPrefix = 'state';
  break;
```

---

### Step 5: Update UI (15 min)

**File:** `apps/ui-organizations/src/features/analytics/components/FlowViewSelector.tsx`

**Enable STATE view (line 32-38):**
```typescript
{
  value: FlowDimension.STATE,
  label: 'Geographic',
  icon: MapPin,
  description: 'Flow by debtor state',
  available: true,  // Change from false
},
```

---

### Step 6: Testing (2-3 hours)

**Critical: Verify Debtor-Debt Relationship First**

```bash
# Check if debts table has debtor_id or debtor_profile_id
# If neither exists, need to update query to join differently
```

**Unit Tests:**
```typescript
// apps/api-debtors/src/internal/analytics/analytics.service.spec.ts

describe('getFlowAnalytics - STATE', () => {
  it('should aggregate debts by debtor state', async () => {
    // Arrange
    await seedDebtorsWithAddressesAndDebts([
      { state: 'CA', principalAmount: 1000 },
      { state: 'CA', principalAmount: 500 },
      { state: 'TX', principalAmount: 750 },
    ]);

    // Act
    const result = await service.getFlowAnalytics(orgId, {
      view: FlowDimension.STATE,
    });

    // Assert
    expect(result.debtorsByDimension).toHaveLength(2);
    expect(result.debtorsByDimension[0]).toMatchObject({
      dimensionValue: 'CA',
      label: 'California',
      totalPrincipal: '1500.00',
      debtCount: 2,
    });
  });

  it('should only use current primary addresses', async () => {
    // Test isCurrent and isPrimary filtering
  });

  it('should exclude NULL states', async () => {
    // Test NULL filtering
  });
});
```

**Integration Test:**
```bash
pnpm e2e test analytics-flow-state
```

---

### STATE Checklist

- [ ] Verify DebtorAddress entity has state field (already exists)
- [ ] Verify e2e seeding populates addresses with states
- [ ] Update seeding if addresses missing
- [ ] Create api-debtors internal analytics module
  - [ ] DTOs
  - [ ] Service with getFlowAnalytics
  - [ ] Controller with HMAC auth
  - [ ] Module registration
- [ ] Update orchestrator with debtors client and routing
- [ ] Enable view in FlowViewSelector UI
- [ ] Write unit tests
- [ ] Verify debtor-debt relationship in database
- [ ] Run integration tests
- [ ] Manual browser testing

**Total Effort:** 6-8 hours (1 day)

---

## Implementation Order

### Day 1: STATE View (Easier, No Schema Changes)
- Morning: Create api-debtors analytics module (3-4 hours)
- Afternoon: Orchestrator integration + UI + Testing (3-4 hours)

### Day 2: PAYMENT_METHOD View
- Morning: Schema update + seeding + endpoint (4-5 hours)
- Afternoon: Testing + verification (2-3 hours)

---

## Testing Checklist

After implementing both views:

**End-to-End Verification:**
- [ ] Drop and recreate database (fresh schema)
- [ ] Run e2e seeding
- [ ] Start all services
- [ ] Navigate to Analytics → Flows
- [ ] Verify 4 views in selector: Debt Category, Portfolio, Payment Method, Geographic
- [ ] Test each view:
  - [ ] Debt Category: Shows categories (MEDICAL, CREDIT_CARD, etc.)
  - [ ] Portfolio: Shows portfolio names
  - [ ] Payment Method: Shows payment types (Visa, ACH, etc.)
  - [ ] Geographic: Shows states (California, Texas, etc.)
- [ ] Verify all Sankey charts render correctly
- [ ] Verify tooltips show correct values
- [ ] Verify percentages sum to ~100%
- [ ] Check console for errors

---

## Common Issues & Solutions

### Issue 1: "Cannot find module '@verichron/contracts'"

**Solution:** Verify FlowDimension enum is exported from contracts package.

---

### Issue 2: "debts.debtor_id does not exist"

**Solution:** Check actual relationship between debts and debtors in schema. May need to join differently:
```typescript
// If debts has debtor_profile_id:
.innerJoin('debts', 'debt', 'debt.debtor_profile_id = profile.id')

// If debts has debtor_id (DebtorIdentity):
.innerJoin('debtor_identities', 'identity', 'identity.id = profile.debtor_identity_id')
.innerJoin('debts', 'debt', 'debt.debtor_id = identity.id')
```

---

### Issue 3: TypeORM "column does not exist" error

**Solution:** Use quoted aliases in ORDER BY:
```typescript
.orderBy('"totalPrincipal"', 'DESC')  // NOT orderBy('totalPrincipal')
```

---

### Issue 4: Empty results despite seeded data

**Checklist:**
- [ ] Verify organizationId matches between entities
- [ ] Check `is_current = true` and `is_primary = true` filters
- [ ] Verify JOIN conditions are correct
- [ ] Check for NULL values in dimension fields
- [ ] Log the raw SQL query to debug

---

## Completion Criteria

**STATE View:**
- ✅ Geographic Sankey chart displays state distribution
- ✅ Shows state names (not codes) in labels
- ✅ Percentages sum to 100%
- ✅ Tooltips show state name, value, and percentage
- ✅ Date filters work correctly
- ✅ Unit and integration tests pass

**PAYMENT_METHOD View:**
- ✅ Payment Method Sankey chart displays payment types
- ✅ Shows friendly names (Visa, not VISA)
- ✅ Percentages sum to 100%
- ✅ Tooltips show method, value, and percentage
- ✅ Date filters work correctly
- ✅ Unit and integration tests pass

---

## Total Effort Summary

| View | Schema | Seeding | Endpoint | Orchestrator | UI | Testing | **Total** |
|------|--------|---------|----------|--------------|----|---------|-----------|
| **STATE** | 0 hrs | 1 hr | 3-4 hrs | 30 min | 15 min | 2 hrs | **6-8 hrs** |
| **PAYMENT_METHOD** | 30 min | 1-2 hrs | 2-3 hrs | 0 hrs* | 15 min | 2 hrs | **6-10 hrs** |
| **TOTAL** | | | | | | | **12-18 hrs (2-3 days)** |

*Already handled for PAYMENT_METHOD in STATE implementation

---

**Next Steps:**
1. Start with STATE view (no schema changes, safer)
2. Verify debtor-debt relationship in schema
3. Implement PAYMENT_METHOD view
4. Run comprehensive E2E tests
5. Update flow-analytics-guide.md with implementation notes
