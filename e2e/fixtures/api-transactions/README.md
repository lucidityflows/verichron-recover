# api-transactions Fixtures

Complete fixture suite for testing the api-transactions microservice. Provides factories for creating payment plans, transactions, and seed scenarios for common payment patterns.

## Architecture

```
api-transactions/
├── factories/                     # Single-entity creation
│   ├── paymentPlanFactory.ts
│   └── transactionHistoryFactory.ts
├── seed/                          # Complete test scenarios
│   ├── active-payment-plan.seed.ts
│   └── debtor-payment-history.seed.ts
└── events/                        # (Future: Event-driven scenarios)
```

## Quick Start

```typescript
import {
  createPaymentPlanFactory,
  createTransactionHistoryFactory,
  seedActivePaymentPlan,
  seedDebtorPaymentHistory
} from './fixtures/api-transactions';

// Create individual entities
const planFactory = createPaymentPlanFactory(transactionsDataSource);
const plan = await planFactory.createActivePlan({
  organizationId: org.id,
  debtorId: debtor.id,
  totalAmount: 1500.00,
  numberOfInstallments: 12,
});

// Use pre-built scenarios
const scenario = await seedActivePaymentPlan(transactionsDataSource, {
  organizationId: org.id,
  debtorId: debtor.id,
  debts: [
    { debtId: debt1.id, balance: 500.00 },
    { debtId: debt2.id, balance: 1000.00 },
  ],
  paymentsCompleted: 3,
});
```

## Factories

### PaymentPlanFactory

Creates payment plan entities and links plans to debts (debt consolidation).

```typescript
const planFactory = createPaymentPlanFactory(dataSource);

// Create active payment plan (most common)
const plan = await planFactory.createActivePlan({
  organizationId: org.id,
  debtorId: debtor.id,
  totalAmount: 1500.00,
  numberOfInstallments: 12,
  frequency: 'MONTHLY',
});

// Create draft payment plan
const plan = await planFactory.createDraftPlan({
  organizationId: org.id,
  debtorId: debtor.id,
  totalAmount: 2000.00,
  numberOfInstallments: 24,
});

// Create completed payment plan
const plan = await planFactory.createCompletedPlan({
  organizationId: org.id,
  debtorId: debtor.id,
  totalAmount: 1200.00,
  numberOfInstallments: 12,
});

// Create payment plan with linked debts (consolidation)
const result = await planFactory.createPaymentPlanWithDebts({
  organizationId: org.id,
  debtorId: debtor.id,
  debts: [
    { debtId: debt1.id, balance: 500.00 },
    { debtId: debt2.id, balance: 700.00 },
    { debtId: debt3.id, balance: 300.00 },
  ],
  numberOfInstallments: 18,
  frequency: 'BI_WEEKLY',
  status: 'ACTIVE',
});

// Access plan and linked debts
const { plan, planDebts } = result;
expect(plan.totalAmount).toBe(1500.00);
expect(planDebts.length).toBe(3);

// Link additional debt to existing plan
const planDebt = await planFactory.linkDebtToPlan({
  paymentPlanId: plan.id,
  debtId: debt4.id,
  debtBalanceAtCreation: 400.00,
});
```

**Available Methods:**
- `createPaymentPlan(options)` - General plan creation
- `createDraftPlan(options)` - Draft plan (editable)
- `createActivePlan(options)` - Active plan (processing payments)
- `createCompletedPlan(options)` - Completed plan (all payments done)
- `createPaymentPlanWithDebts(options)` - Plan with linked debts (consolidation)
- `linkDebtToPlan(options)` - Link additional debt to plan
- `getPaymentPlanById(id)` - Retrieve plan by ID

**Payment Plan Statuses:**
- `DRAFT` - Plan being drafted, can be edited/deleted
- `PENDING_APPROVAL` - Awaits admin approval
- `ACTIVE` - Approved and processing scheduled payments
- `COMPLETED` - All payments successfully completed
- `CANCELED` - Plan canceled before completion
- `DEFAULTED` - Plan defaulted after too many failures

**Payment Frequencies:**
- `WEEKLY` - Every 7 days
- `BI_WEEKLY` - Every 14 days
- `MONTHLY` - Every month on same date

### TransactionHistoryFactory

Creates immutable transaction records for payments and refunds.

```typescript
const txFactory = createTransactionHistoryFactory(dataSource);

// Create successful payment (most common)
const payment = await txFactory.createSuccessfulPayment({
  organizationId: org.id,
  debtId: debt.id,
  debtorId: debtor.id,
  amount: 100.00,
});

// Create failed payment
const failedPayment = await txFactory.createFailedPayment({
  organizationId: org.id,
  debtId: debt.id,
  debtorId: debtor.id,
  amount: 100.00,
  failureReason: 'Card declined - insufficient funds',
});

// Create pending payment
const pending = await txFactory.createPendingPayment({
  organizationId: org.id,
  debtId: debt.id,
  debtorId: debtor.id,
  amount: 100.00,
});

// Create refund for previous payment
const refund = await txFactory.createRefund({
  organizationId: org.id,
  debtId: debt.id,
  debtorId: debtor.id,
  amount: 100.00,
  originalTransactionId: originalPayment.id,
  status: 'SUCCEEDED',
});
// This also marks original payment as REFUNDED

// Create scheduled payment (linked to payment plan)
const scheduledPayment = await txFactory.createScheduledPayment({
  organizationId: org.id,
  debtId: debt.id,
  paymentPlanId: plan.id,
  debtorId: debtor.id,
  amount: 125.00,
  status: 'SUCCEEDED',
});

// Create multiple payments
const payments = await txFactory.createMultiplePayments({
  organizationId: org.id,
  debtId: debt.id,
  debtorId: debtor.id,
  count: 5,
  amount: 100.00,
});
```

**Available Methods:**
- `createTransaction(options)` - General transaction creation
- `createSuccessfulPayment(options)` - Succeeded payment
- `createFailedPayment(options)` - Failed payment
- `createPendingPayment(options)` - Pending payment
- `createRefund(options)` - Refund of previous payment
- `createScheduledPayment(options)` - Scheduled plan payment
- `createMultiplePayments(options)` - Bulk payment creation
- `getTransactionById(id)` - Retrieve transaction by ID

**Transaction Types:**
- `PAYMENT` - Payment toward a debt
- `REFUND` - Refund of a previous payment

**Transaction Statuses:**
- `PENDING` - Created but not sent to gateway
- `PROCESSING` - Being processed by payment gateway
- `SUCCEEDED` - Completed successfully (immutable)
- `FAILED` - Failed (declined, error, etc.) (immutable)
- `REFUNDED` - Original payment that has been refunded

## Seed Scenarios

Pre-built scenarios for common testing patterns. These combine factories to create complete, reusable test setups.

### seedActivePaymentPlan

**Purpose**: Test active payment plan with transaction history

**Scenario**:
- 1 active payment plan (MONTHLY, configurable installments)
- Multiple debts consolidated into the plan
- Transaction history with successful payments
- Optional failed payments for testing failure handling

```typescript
const scenario = await seedActivePaymentPlan(transactionsDataSource, {
  organizationId: org.id,
  debtorId: debtor.id,
  debts: [
    { debtId: debt1.id, balance: 500.00 },
    { debtId: debt2.id, balance: 700.00 },
  ],
  numberOfInstallments: 12,
  paymentsCompleted: 3,
  paymentsFailed: 1,
});

// Access scenario data
expect(scenario.plan.status).toBe('ACTIVE');
expect(scenario.plan.totalAmount).toBe(1200.00);
expect(scenario.planDebts.length).toBe(2);
expect(scenario.successfulTransactions.length).toBe(3);
expect(scenario.failedTransactions.length).toBe(1);
expect(scenario.remainingBalance).toBe(900.00); // 1200 - (3 * 100)

// Use in API test
const response = await apiClient.get(`/payment-plans/${scenario.plan.id}`, debtorToken);
expect(response.body.paymentsCompleted).toBe(3);
```

**Returns**:
```typescript
{
  plan: PaymentPlan;
  planDebts: PaymentPlanDebt[];
  successfulTransactions: TransactionHistory[];
  failedTransactions: TransactionHistory[];
  totalAmount: number;
  remainingBalance: number;
}
```

### seedDebtorPaymentHistory

**Purpose**: Create comprehensive transaction history for a debtor

**Scenario**:
- Multiple successful payments across different debts
- Mix of one-time and scheduled payments
- Optional failed payments
- Transaction history spanning multiple debts

```typescript
const scenario = await seedDebtorPaymentHistory(transactionsDataSource, {
  organizationId: org.id,
  debtorId: debtor.id,
  debts: [
    {
      debtId: debt1.id,
      successfulPayments: 5,
      failedPayments: 1,
      amountPerPayment: 100.00,
    },
    {
      debtId: debt2.id,
      successfulPayments: 3,
      failedPayments: 0,
      amountPerPayment: 150.00,
      paymentPlanId: plan.id, // Optional: link to payment plan
    },
  ],
});

// Access scenario data
expect(scenario.allTransactions.length).toBe(9); // 5+1+3
expect(scenario.successfulTransactions.length).toBe(8); // 5+3
expect(scenario.failedTransactions.length).toBe(1);
expect(scenario.totalPaid).toBe(950.00); // (5*100)+(3*150)
expect(scenario.totalFailed).toBe(100.00); // 1*100

// Get transactions for specific debt
const debt1Transactions = scenario.transactionsByDebt.get(debt1.id);
expect(debt1Transactions.length).toBe(6);
```

**Returns**:
```typescript
{
  debtorId: string;
  transactionsByDebt: Map<string, TransactionHistory[]>;
  allTransactions: TransactionHistory[];
  successfulTransactions: TransactionHistory[];
  failedTransactions: TransactionHistory[];
  totalPaid: number;
  totalFailed: number;
}
```

## Common Testing Patterns

### Pattern 1: Payment Plan Lifecycle Testing

```typescript
describe('Payment Plan Lifecycle', () => {
  let scenario: ActivePaymentPlanScenario;

  beforeEach(async () => {
    scenario = await seedActivePaymentPlan(transactionsDataSource, {
      organizationId: org.id,
      debtorId: debtor.id,
      debts: [{ debtId: debt.id, balance: 1200.00 }],
      numberOfInstallments: 12,
      paymentsCompleted: 3,
    });
  });

  it('should track payment progression', async () => {
    expect(scenario.plan.status).toBe('ACTIVE');
    expect(scenario.plan.paymentsCompleted).toBe(3);
    expect(scenario.plan.numberOfInstallments).toBe(12);
    expect(scenario.remainingBalance).toBe(900.00);
  });

  it('should handle payment failures', async () => {
    const txFactory = createTransactionHistoryFactory(transactionsDataSource);

    await txFactory.createFailedPayment({
      organizationId: org.id,
      debtId: debt.id,
      paymentPlanId: scenario.plan.id,
      debtorId: debtor.id,
      amount: scenario.plan.installmentAmount,
    });

    // Update plan failed count and test default threshold
  });
});
```

### Pattern 2: Transaction History Testing

```typescript
describe('Debtor Payment History', () => {
  let scenario: DebtorPaymentHistoryScenario;

  beforeEach(async () => {
    scenario = await seedDebtorPaymentHistory(transactionsDataSource, {
      organizationId: org.id,
      debtorId: debtor.id,
      debts: [
        { debtId: debt1.id, successfulPayments: 5, amountPerPayment: 100.00 },
        { debtId: debt2.id, successfulPayments: 3, amountPerPayment: 150.00 },
      ],
    });
  });

  it('should aggregate payments across all debts', async () => {
    expect(scenario.totalPaid).toBe(950.00);
    expect(scenario.allTransactions.length).toBe(8);
  });

  it('should filter transactions by debt', async () => {
    const debt1Txs = scenario.transactionsByDebt.get(debt1.id);
    expect(debt1Txs.length).toBe(5);
    expect(debt1Txs.every(tx => tx.debtId === debt1.id)).toBe(true);
  });
});
```

### Pattern 3: Refund Testing

```typescript
describe('Payment Refunds', () => {
  it('should create refund and mark original as refunded', async () => {
    const txFactory = createTransactionHistoryFactory(transactionsDataSource);

    // Create original payment
    const payment = await txFactory.createSuccessfulPayment({
      organizationId: org.id,
      debtId: debt.id,
      debtorId: debtor.id,
      amount: 100.00,
    });

    expect(payment.status).toBe('SUCCEEDED');

    // Create refund (automatically marks original as REFUNDED)
    const refund = await txFactory.createRefund({
      organizationId: org.id,
      debtId: debt.id,
      debtorId: debtor.id,
      amount: 100.00,
      originalTransactionId: payment.id,
    });

    expect(refund.type).toBe('REFUND');
    expect(refund.status).toBe('SUCCEEDED');

    // Verify original payment is now marked as REFUNDED
    const updated = await txFactory.getTransactionById(payment.id);
    expect(updated.status).toBe('REFUNDED');
  });
});
```

## Data Sources

All fixtures require a TypeORM DataSource connection to the api-transactions database:

```typescript
import { getTransactionsDataSource } from '../utils/dbConnections';

const transactionsDataSource = await getTransactionsDataSource();

// Use factories
const planFactory = createPaymentPlanFactory(transactionsDataSource);
const txFactory = createTransactionHistoryFactory(transactionsDataSource);

// Use seeds
const scenario = await seedActivePaymentPlan(transactionsDataSource, /* ... */);
```

## Entity Relationships

```
PaymentPlan
  ├── id (uuid)
  ├── organizationId (uuid)
  ├── debtorId (uuid)
  ├── status (enum: DRAFT, PENDING_APPROVAL, ACTIVE, COMPLETED, CANCELED, DEFAULTED)
  ├── totalAmount (decimal)
  ├── numberOfInstallments (int)
  ├── installmentAmount (decimal)
  ├── frequency (enum: WEEKLY, BI_WEEKLY, MONTHLY)
  ├── startDate, nextPaymentDate, lastPaymentDate (date)
  ├── paymentsCompleted (int)
  ├── paymentsFailed (int)
  └── relationship:
      └── debts[] -> PaymentPlanDebt

PaymentPlanDebt (Join Table)
  ├── id (uuid)
  ├── paymentPlanId (uuid) -> PaymentPlan
  ├── debtId (uuid) -> Debt (cross-service reference to api-debts)
  └── debtBalanceAtCreation (decimal)

TransactionHistory (Immutable)
  ├── id (uuid)
  ├── organizationId (uuid)
  ├── debtId (uuid) -> Debt (optional)
  ├── paymentPlanId (uuid) -> PaymentPlan (optional)
  ├── debtorId (uuid) -> Debtor (optional)
  ├── amount (decimal)
  ├── type (enum: PAYMENT, REFUND)
  ├── status (enum: PENDING, PROCESSING, SUCCEEDED, FAILED, REFUNDED)
  ├── paymentMethodToken (string, tokenized)
  ├── gatewayTransactionId (string, from Stripe/etc)
  ├── idempotencyKey (uuid, prevent duplicates)
  └── originalTransactionId (uuid, for refunds)
```

## Best Practices

1. **Use Seed Scenarios for E2E Tests**: Prefer `seedActivePaymentPlan()` over manual factory calls

2. **Transaction Immutability**: TransactionHistory records are immutable once SUCCEEDED/FAILED - create new records instead

3. **Idempotency**: Each transaction has a unique idempotency key to prevent duplicate charges

4. **Realistic Amounts**: Use actual currency amounts (e.g., 100.00 not 100) for accurate decimal testing

5. **Test Data Isolation**: Each test should create its own data

6. **Payment Plan Status Transitions**: Follow valid state transitions (see PaymentPlanStatus enum)

## Future Enhancements

- **events/**: Event-driven scenarios (payment processed events, plan status changes)
- **More seed scenarios**: Defaulted plans, payment plan modifications
- **Bulk operations**: High-volume transaction creation for performance testing
