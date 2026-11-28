# api-debts Fixtures

Complete fixture suite for testing the api-debts microservice. Provides factories for creating individual entities and seed scenarios for common test patterns.

## Architecture

```
api-debts/
├── factories/          # Single-entity creation
│   ├── debtFactory.ts
│   └── portfolioFactory.ts
├── seed/              # Complete test scenarios
│   ├── debtor-multi-org-debts.seed.ts
│   └── debtor-ownership-isolation.seed.ts
└── events/            # (Future: Event-driven scenarios)
```

## Quick Start

```typescript
import {
  createDebtFactory,
  createPortfolioFactory,
  seedDebtorMultiOrgDebts,
  seedDebtorOwnershipIsolation
} from './fixtures/api-debts';

// Create individual entities
const debtFactory = createDebtFactory(debtsDataSource);
const { debt, debtDebtor } = await debtFactory.createDebtWithDebtor({
  organizationId: org.id,
  portfolioId: portfolio.id,
  debtorId: debtor.id,
  principalAmount: '5000.00',
});

// Use pre-built scenarios
const scenario = await seedDebtorMultiOrgDebts(debtsDataSource, {
  debtorUserId: debtor.id,
  organizations: [
    { organizationId: orgA.id, debtCount: 5 },
    { organizationId: orgB.id, debtCount: 3 },
  ],
});
```

## Factories

### PortfolioFactory

Creates portfolio entities for organizing debts.

```typescript
const portfolioFactory = createPortfolioFactory(dataSource);

// Create active portfolio (ready for use)
const portfolio = await portfolioFactory.createActivePortfolio({
  organizationId: org.id,
  name: 'Primary Debt Portfolio',
});

// Create portfolio in specific state
const provisioningPortfolio = await portfolioFactory.createProvisioningPortfolio({
  organizationId: org.id,
});

const closedPortfolio = await portfolioFactory.createClosedPortfolio({
  organizationId: org.id,
});

// Create multiple portfolios
const portfolios = await portfolioFactory.createMultiplePortfolios({
  organizationId: org.id,
  count: 3,
  namePrefix: 'Test Portfolio',
});
```

**Available Methods:**
- `createPortfolio(options)` - General portfolio creation
- `createActivePortfolio(options)` - Ready-to-use portfolio
- `createProvisioningPortfolio(options)` - Newly created portfolio
- `createClosedPortfolio(options)` - Archived portfolio
- `createMultiplePortfolios(options)` - Bulk creation

### DebtFactory

Creates debt entities and debtor-debt associations.

```typescript
const debtFactory = createDebtFactory(dataSource);

// Create debt with debtor association (most common)
const { debt, debtDebtor } = await debtFactory.createDebtWithDebtor({
  organizationId: org.id,
  portfolioId: portfolio.id,
  debtorId: debtor.id,
  principalAmount: '5000.00',
  notes: 'Test debt for e2e testing',
});

// Create standalone debt
const debt = await debtFactory.createDebt({
  organizationId: org.id,
  portfolioId: portfolio.id,
  principalAmount: '10000.00',
});

// Link existing debt to debtor
const debtDebtor = await debtFactory.linkDebtorToDebt({
  debtId: debt.id,
  debtorId: debtor.id,
  organizationId: org.id,
});

// Create multiple debts for a debtor
const debts = await debtFactory.createMultipleDebtsForDebtor({
  debtorId: debtor.id,
  organizationId: org.id,
  portfolioId: portfolio.id,
  count: 5,
});

// Create debts for ownership testing (2 debtors, same portfolio)
const { debtorADebts, debtorBDebts } = await debtFactory.createDebtsForOwnershipTest({
  organizationId: org.id,
  portfolioId: portfolio.id,
  debtorAUserId: debtorA.id,
  debtorBUserId: debtorB.id,
  debtorADebtCount: 3,
  debtorBDebtCount: 2,
});
```

**Available Methods:**
- `createDebt(options)` - Create standalone debt
- `createDebtWithDebtor(options)` - Create debt + debtor association (recommended)
- `createMultipleDebtsForDebtor(options)` - Bulk creation for single debtor
- `createActiveDebt(options)` - Debt with ACTIVE status
- `createPaidDebt(options)` - Debt with PAID_IN_FULL status
- `createDebtsForOwnershipTest(options)` - Setup for ownership isolation testing
- `linkDebtorToDebt(options)` - Create debtor-debt association

## Seed Scenarios

Pre-built scenarios for common testing patterns. These combine factories to create complete, reusable test setups.

### seedDebtorMultiOrgDebts

**Purpose**: Test debtor access to debts across multiple organizations

**Test Case**: TC-DBT-ACCESS-001: "Debtor Can Access Own Debts Across All Organizations"

**Scenario**:
- 1 debtor user with access to multiple organizations
- Configurable number of debts per organization
- Tests multi-org data aggregation

```typescript
const scenario = await seedDebtorMultiOrgDebts(debtsDataSource, {
  debtorUserId: debtor.id,
  organizations: [
    {
      organizationId: orgA.id,
      organizationName: 'ACME Corp',
      debtCount: 5
    },
    {
      organizationId: orgB.id,
      organizationName: 'TechStart Inc',
      debtCount: 3
    },
    {
      organizationId: orgC.id,
      organizationName: 'RetailCo',
      debtCount: 2
    },
  ],
});

// Access scenario data
expect(scenario.totalDebts).toBe(10);
expect(scenario.debtsByOrg.get(orgA.id).length).toBe(5);
expect(scenario.debtsByOrg.get(orgB.id).length).toBe(3);
expect(scenario.allDebts.length).toBe(10);

// Use in API test
const response = await apiClient.get('/debts/my-debts', debtorToken);
expect(response.body.data.length).toBe(10); // All debts across all orgs
```

**Returns**:
```typescript
{
  debtorUserId: string;
  portfolios: Array<{ organizationId, portfolio }>;
  debtsByOrg: Map<string, Array<{ debt, debtDebtor }>>;
  allDebts: Array<{ debt, debtDebtor }>;
  totalDebts: number;
}
```

### seedDebtorOwnershipIsolation

**Purpose**: Test ownership-based access control between debtors

**Test Case**: TC-DBT-ACCESS-002: "Debtor Cannot Access Other Debtors' Debts"

**Scenario**:
- 1 organization with 1 portfolio
- 2 debtor users (Debtor A and Debtor B)
- Each debtor has their own debts
- Tests ownership filtering (same org, different owners)

```typescript
const scenario = await seedDebtorOwnershipIsolation(debtsDataSource, {
  organizationId: org.id,
  debtorAUserId: debtorA.id,
  debtorBUserId: debtorB.id,
  debtorADebtCount: 3, // Optional, defaults to 3
  debtorBDebtCount: 2, // Optional, defaults to 2
});

// Access scenario data
expect(scenario.debtorADebts.length).toBe(3);
expect(scenario.debtorBDebts.length).toBe(2);
expect(scenario.allDebts.length).toBe(5);

// Use in API test
const debtorBDebtId = scenario.debtorBDebts[0].debt.id;

// Debtor A tries to access Debtor B's debt
const response = await apiClient.get(`/debts/${debtorBDebtId}`, debtorAToken);
expect(response.status).toBe(404); // Ownership check fails (not 403, appears as non-existent)
```

**Returns**:
```typescript
{
  organizationId: string;
  portfolio: Portfolio;
  debtorAUserId: string;
  debtorBUserId: string;
  debtorADebts: Array<{ debt, debtDebtor }>;
  debtorBDebts: Array<{ debt, debtDebtor }>;
  allDebts: Array<{ debt, debtDebtor }>;
}
```

## Common Testing Patterns

### Pattern 1: Multi-Organization Debtor Access

```typescript
describe('TC-DBT-ACCESS-001: Debtor Multi-Org Access', () => {
  let scenario: DebtorMultiOrgDebtsScenario;
  let debtorToken: string;

  beforeEach(async () => {
    const debtor = await createDebtorUser(/* ... */);
    debtorToken = await getDebtorToken(debtor);

    scenario = await seedDebtorMultiOrgDebts(debtsDataSource, {
      debtorUserId: debtor.id,
      organizations: [
        { organizationId: orgA.id, debtCount: 5 },
        { organizationId: orgB.id, debtCount: 3 },
      ],
    });
  });

  it('should return all debts across all organizations', async () => {
    const response = await apiClient.get('/debts/my-debts', debtorToken);
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(8); // 5 + 3
  });
});
```

### Pattern 2: Ownership Isolation Testing

```typescript
describe('TC-DBT-ACCESS-002: Ownership Isolation', () => {
  let scenario: DebtorOwnershipIsolationScenario;
  let debtorAToken: string;
  let debtorBToken: string;

  beforeEach(async () => {
    const debtorA = await createDebtorUser(/* ... */);
    const debtorB = await createDebtorUser(/* ... */);
    debtorAToken = await getDebtorToken(debtorA);
    debtorBToken = await getDebtorToken(debtorB);

    scenario = await seedDebtorOwnershipIsolation(debtsDataSource, {
      organizationId: org.id,
      debtorAUserId: debtorA.id,
      debtorBUserId: debtorB.id,
    });
  });

  it('debtor A should only see their own debts', async () => {
    const response = await apiClient.get('/debts/my-debts', debtorAToken);
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(3); // Only Debtor A's debts
  });

  it('debtor A cannot access debtor B debt by ID', async () => {
    const debtorBDebtId = scenario.debtorBDebts[0].debt.id;
    const response = await apiClient.get(`/debts/${debtorBDebtId}`, debtorAToken);
    expect(response.status).toBe(404); // Ownership filtering makes it "not found"
  });
});
```

### Pattern 3: Custom Debt Scenarios

```typescript
describe('Custom Debt Testing', () => {
  it('should create debts with specific amounts for payment testing', async () => {
    const debtFactory = createDebtFactory(debtsDataSource);

    // Create debts with specific amounts for testing payment calculations
    const smallDebt = await debtFactory.createDebtWithDebtor({
      organizationId: org.id,
      portfolioId: portfolio.id,
      debtorId: debtor.id,
      principalAmount: '100.00',
      notes: 'Small debt for full payment test',
    });

    const largeDebt = await debtFactory.createDebtWithDebtor({
      organizationId: org.id,
      portfolioId: portfolio.id,
      debtorId: debtor.id,
      principalAmount: '50000.00',
      notes: 'Large debt for partial payment test',
    });

    // Use in payment tests
    await testPaymentWorkflow(smallDebt.debt.id, '100.00'); // Full payment
    await testPaymentWorkflow(largeDebt.debt.id, '5000.00'); // Partial payment
  });
});
```

## Data Sources

All fixtures require a TypeORM DataSource connection to the api-debts database:

```typescript
import { getDebtsDataSource } from '../utils/dbConnections';

const debtsDataSource = await getDebtsDataSource();

// Use factories
const debtFactory = createDebtFactory(debtsDataSource);
const portfolioFactory = createPortfolioFactory(debtsDataSource);

// Use seeds
const scenario = await seedDebtorMultiOrgDebts(debtsDataSource, /* ... */);
```

## Entity Relationships

```
Portfolio
  ├── id (uuid)
  ├── organization_id (uuid)
  ├── name (string)
  └── status (enum: PROVISIONING, ACTIVE, CLOSED)

Debt
  ├── id (uuid)
  ├── organization_id (uuid)
  ├── portfolio_id (uuid) -> Portfolio
  ├── principal_amount (decimal)
  ├── status (enum: ACTIVE, PAID_IN_FULL, etc.)
  └── notes (text)

DebtDebtor (Join Table)
  ├── id (uuid)
  ├── debt_id (uuid) -> Debt
  ├── debtor_id (uuid) -> User (from api-users)
  └── organization_id (uuid)
```

## Best Practices

1. **Use Seed Scenarios for E2E Tests**: Prefer `seedDebtorMultiOrgDebts()` over manual factory calls for complete test setups

2. **Use Factories for Unit/Integration Tests**: Use `createDebtFactory()` when testing specific edge cases or single entities

3. **Always Clean Up**: Use `beforeEach`/`afterEach` hooks to reset database state between tests

4. **Leverage TypeScript Types**: Import return types for better IDE autocomplete:
   ```typescript
   import type { DebtorMultiOrgDebtsScenario } from './fixtures/api-debts';
   ```

5. **Test Data Isolation**: Each test should create its own data using factories/seeds rather than sharing data

6. **Realistic Data**: Factories use Faker.js for realistic test data generation

## Future Enhancements

- **events/**: Event-driven scenarios (debt creation events, payment events)
- **More seed scenarios**: Payment workflows, debt transfers, portfolio transfers
- **Bulk operations**: High-volume debt creation for performance testing
- **Status transitions**: Helper methods for testing debt lifecycle state changes
