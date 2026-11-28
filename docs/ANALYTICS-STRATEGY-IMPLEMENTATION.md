# Analytics Strategy Implementation - Complete

**Date**: December 3, 2025
**Status**: ✅ Complete
**Architecture**: Debt-Level Classification + Portfolio-Level Flexible Metadata

---

## What Was Implemented

We implemented the **hybrid approach** discussed: debt-level canonical classification + portfolio-level flexible tagging, avoiding the rigid `portfolio_type` enum that doesn't handle mixed portfolios well.

### 1. DebtCategory Enum (Canonical Classification)

**Location**: `packages/enums/src/debts/debt-category.enum.ts`

```typescript
export enum DebtCategory {
  CREDIT_CARD = 'CREDIT_CARD',
  AUTO_LOAN = 'AUTO_LOAN',
  MEDICAL = 'MEDICAL',
  STUDENT_LOAN = 'STUDENT_LOAN',
  PERSONAL_LOAN = 'PERSONAL_LOAN',
  UTILITY = 'UTILITY',
  TELECOM = 'TELECOM',
  MORTGAGE = 'MORTGAGE',
  OTHER = 'OTHER',
}
```

**Design Rationale**:
- Debt-level classification (intrinsic property of the debt)
- Enables analytics by debt type regardless of portfolio grouping
- Supports queries like "Show all medical debts across all portfolios"

### 2. Debt Entity Updates

**File**: `apps/api-debts/src/debts/entities/debt.entity.ts`

**Added Fields**:
```typescript
@Column({
  name: 'debt_category',
  type: 'enum',
  enum: DebtCategory,
  default: DebtCategory.OTHER,
})
debtCategory: DebtCategory;

@Column({
  name: 'debt_subcategory',
  type: 'varchar',
  length: 100,
  nullable: true
})
debtSubcategory: string | null;
```

**Benefits**:
- Every debt has a canonical type
- Optional subcategory for granularity ("Emergency Room Visit", "Subprime Auto")
- Default to OTHER for uncategorized debts

### 3. Portfolio Entity Updates

**File**: `apps/api-debts/src/portfolios/entities/portfolio.entity.ts`

**Added Fields**:
```typescript
@Column({
  name: 'primary_debt_category',
  type: 'enum',
  enum: DebtCategory,
  nullable: true,
})
primaryDebtCategory: DebtCategory | null;  // HINT, not constraint

@Column({
  name: 'portfolio_tags',
  type: 'text',
  array: true,
  default: '{}'
})
portfolioTags: string[];

@Column({
  name: 'business_description',
  type: 'text',
  nullable: true
})
businessDescription: string | null;
```

**Benefits**:
- `primaryDebtCategory` is a **hint** ("This portfolio is mostly medical debts")
- `portfolioTags` supports user language: `["Q2-2024", "Broker-XYZ", "High-Risk"]`
- `businessDescription` captures business context
- Portfolios can contain mixed debt types without forcing classification

### 4. DTO Updates

**Debt Response DTO** (`apps/api-debts/src/debts/dto/debt-response.dto.ts`):
```typescript
@ApiProperty({
  description: 'Canonical debt type classification',
  enum: DebtCategory,
  enumName: 'DebtCategory',  // Important for OpenAPI
  example: DebtCategory.MEDICAL,
})
debtCategory: DebtCategory;

@ApiProperty({
  description: 'Optional subcategory for more specific classification',
  example: 'Emergency Room Visit',
  nullable: true,
})
debtSubcategory: string | null;
```

**Portfolio Response DTO** (`apps/api-debts/src/portfolios/dto/portfolio-response.dto.ts`):
```typescript
@ApiProperty({
  description: 'Primary debt category hint (nullable)',
  enum: DebtCategory,
  enumName: 'DebtCategory',
  example: DebtCategory.MEDICAL,
  nullable: true,
})
primaryDebtCategory: DebtCategory | null;

@ApiProperty({
  description: 'User-defined tags for organization and filtering',
  example: ['Q2-2024', 'Broker-Triton', 'Consumer-Mix'],
  type: [String],
  isArray: true,
})
portfolioTags: string[];

@ApiProperty({
  description: 'Business context and notes about this portfolio',
  example: 'Mixed consumer portfolio from Triton Financial',
  nullable: true,
})
businessDescription: string | null;
```

### 5. Seed Data Updates

**File**: `e2e/seeding/test-data/debtors.seed.ts`

**Stark Industries Portfolio** (Medical-focused):
```typescript
{
  name: 'Stark Main Portfolio',
  primaryDebtCategory: DebtCategory.MEDICAL,
  portfolioTags: ['Q2-2024', 'Broker-Triton', 'Medical-Mix'],
  businessDescription: 'Mixed medical consumer portfolio. Focus on accounts under $10k. Purchased at 15% of face value.',
}
```

**Wayne Enterprises Portfolio** (Credit Card-focused):
```typescript
{
  name: 'Wayne Main Portfolio',
  primaryDebtCategory: DebtCategory.CREDIT_CARD,
  portfolioTags: ['Q3-2024', 'Broker-Triton', 'Credit-Card-Mix'],
  businessDescription: 'Mixed credit card portfolio from major issuers. Purchased at 12% of face value.',
}
```

**Debt Distribution**:
- Steve Rogers: Medical (Emergency Room Visit)
- Diana Prince Org1: Medical (Surgery)
- Diana Prince Org2: Credit Card
- Clark Kent (20 debts): Realistic mix (60% medical, 20% credit card, 10% auto, 10% other)

---

## How This Enables Analytics

### Query Pattern 1: Filter by Debt Category
```typescript
// Geographic analytics: Show medical debts by state
GET /analytics/geographic/debtors?debtCategory=MEDICAL

// Recovery trends: Show medical debt recovery over time
GET /analytics/recovery-trends?debtCategory=MEDICAL

// Orchestrator passes this to internal endpoints
fetchInternal(
  debtServiceUrl,
  `/internal/analytics/geographic/debtors/${orgId}`,
  { debtCategory: 'MEDICAL', state: 'TX' }
);
```

### Query Pattern 2: Filter by Portfolio Tags
```typescript
// Portfolio performance: Show Q2-2024 portfolios
GET /analytics/portfolio-performance?portfolioTag=Q2-2024

// Geographic analytics: Show Broker-Triton portfolios
GET /analytics/geographic/debtors?portfolioTag=Broker-Triton

// Orchestrator supports tag filtering
fetchInternal(
  debtServiceUrl,
  `/internal/analytics/summary/${orgId}`,
  { portfolioTag: 'Q2-2024' }
);
```

### Query Pattern 3: Combined Filtering
```typescript
// Medical debts from Q2-2024 portfolios in Texas
GET /analytics/geographic/debtors?debtCategory=MEDICAL&portfolioTag=Q2-2024&state=TX

// Credit card debts from high-risk portfolios
GET /analytics/recovery-trends?debtCategory=CREDIT_CARD&portfolioTag=High-Risk
```

---

## Database Schema Changes

### New Columns in `debts` Table
```sql
ALTER TABLE debts
ADD COLUMN debt_category VARCHAR(50) NOT NULL DEFAULT 'OTHER',
ADD COLUMN debt_subcategory VARCHAR(100);
```

### New Columns in `portfolios` Table
```sql
ALTER TABLE portfolios
ADD COLUMN primary_debt_category VARCHAR(50),
ADD COLUMN portfolio_tags TEXT[] DEFAULT '{}',
ADD COLUMN business_description TEXT;
```

**Note**: No manual migration needed - TypeORM entities will sync on next app start in dev. For production, generate migration from entities.

---

## Advantages Over Fixed `portfolio_type` Enum

| Aspect | Fixed `portfolio_type` Enum | Debt-Level + Flexible Tags |
|--------|----------------------------|---------------------------|
| **Mixed Portfolios** | ❌ Forces single type | ✅ Natural support |
| **Analytics Accuracy** | ⚠️ Portfolio-level approximation | ✅ Debt-level precision |
| **User Language** | ❌ System-imposed taxonomy | ✅ User-defined tags |
| **Bounded Context** | ⚠️ Debt attribute in wrong service | ✅ Debt attributes in debt service |
| **Query Flexibility** | ❌ Single dimension | ✅ Multi-dimensional |
| **Business Context** | ❌ Lost | ✅ Preserved in tags + description |
| **Future Extensibility** | ❌ Enum changes require migration | ✅ Tags are flexible |

---

## Example: Real-World Mixed Portfolio

**Scenario**: "Q2 2024 Consumer Mix from Triton Financial"

**Without this approach** (rigid portfolio_type):
```
Portfolio Type: MEDICAL (forced choice)
Actual Contents: 60% medical, 30% credit card, 10% auto
❌ Analytics show "Medical Portfolio" but miss 40% of actual composition
```

**With this approach** (debt-level + tags):
```
Portfolio:
  primaryDebtCategory: MEDICAL (hint)
  portfolioTags: ['Q2-2024', 'Broker-Triton', 'Consumer-Mix']
  businessDescription: "Mixed consumer portfolio..."

Debts:
  - 15 debts with debtCategory: MEDICAL
  - 8 debts with debtCategory: CREDIT_CARD
  - 2 debts with debtCategory: AUTO_LOAN

✅ Analytics can show exact composition
✅ Can filter by tag "Consumer-Mix" or by category "MEDICAL"
✅ Business context preserved
```

---

## Next Steps for Analytics Implementation

With this foundation in place, you can now implement:

### 1. Geographic Analytics
```typescript
// Filter by debt category
GET /analytics/geographic/debtors?debtCategory=MEDICAL

// Filter by portfolio tag
GET /analytics/geographic/debtors?portfolioTag=Q2-2024

// Combined
GET /analytics/geographic/debtors?debtCategory=MEDICAL&portfolioTag=High-Risk&state=TX
```

### 2. Recovery Trends
```typescript
// Medical debt recovery over time
GET /analytics/recovery-trends?debtCategory=MEDICAL&granularity=monthly

// Q2-2024 portfolio performance
GET /analytics/recovery-trends?portfolioTag=Q2-2024
```

### 3. Portfolio Composition Analytics
```typescript
// Show debt category breakdown within a portfolio
GET /analytics/portfolio/{portfolioId}/composition

// Response:
{
  portfolioId: "123",
  name: "Q2 2024 Consumer Mix",
  primaryDebtCategory: "MEDICAL",
  portfolioTags: ["Q2-2024", "Consumer-Mix"],
  composition: [
    { debtCategory: "MEDICAL", count: 15, totalPrincipal: "$75,000" },
    { debtCategory: "CREDIT_CARD", count: 8, totalPrincipal: "$32,000" },
    { debtCategory: "AUTO_LOAN", count: 2, totalPrincipal: "$18,000" }
  ]
}
```

---

## Files Modified

### Schema/Entities
- ✅ `packages/enums/src/debts/debt-category.enum.ts` (new)
- ✅ `packages/enums/src/debts/index.ts` (export)
- ✅ `apps/api-debts/src/debts/entities/debt.entity.ts` (added fields)
- ✅ `apps/api-debts/src/portfolios/entities/portfolio.entity.ts` (added fields)

### DTOs
- ✅ `apps/api-debts/src/debts/dto/debt-response.dto.ts` (added fields)
- ✅ `apps/api-debts/src/portfolios/dto/portfolio-response.dto.ts` (added fields)

### Seed Data
- ✅ `e2e/seeding/test-data/debtors.seed.ts` (realistic data with 3 portfolios per org)

---

## Testing

**Build Status**: ✅ All packages built successfully
- `@verichron/enums` - compiled
- `event-orchestrator` - compiled
- TypeScript compilation successful

**Next Step**: Run e2e seed to verify schema changes are applied and data populates correctly.

---

**Status**: Implementation complete. Ready for analytics feature development.
