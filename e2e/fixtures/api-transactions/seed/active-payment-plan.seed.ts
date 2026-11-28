import { DataSource } from 'typeorm';
import {
  createPaymentPlanFactory,
  createTransactionHistoryFactory,
  type PaymentPlan,
  type PaymentPlanDebt,
  type TransactionHistory,
  PaymentStatus,
} from '../factories';

/**
 * Seed: Active Payment Plan with Transaction History
 *
 * Creates a test scenario with an active payment plan that has consolidated debts
 * and transaction history showing completed payments and failures.
 *
 * Scenario Setup:
 * - 1 active payment plan (MONTHLY, 12 installments)
 * - Multiple debts consolidated into the plan
 * - Transaction history with successful payments
 * - Optional failed payments for testing failure handling
 *
 * Expected Test Behavior:
 * - Payment plan is in ACTIVE status
 * - Scheduled payments are being processed
 * - Transaction history shows payment progression
 * - Failed payment count is tracked
 *
 * @example
 * ```typescript
 * const scenario = await seedActivePaymentPlan(transactionsDataSource, {
 *   organizationId: org.id,
 *   debtorId: debtor.id,
 *   debts: [
 *     { debtId: debt1.id, balance: 500.00 },
 *     { debtId: debt2.id, balance: 700.00 },
 *   ],
 *   paymentsCompleted: 3,
 *   paymentsFailed: 1,
 * });
 *
 * expect(scenario.plan.status).toBe('ACTIVE');
 * expect(scenario.successfulTransactions.length).toBe(3);
 * expect(scenario.failedTransactions.length).toBe(1);
 * ```
 */

export interface SeedActivePaymentPlanOptions {
  organizationId: string;
  debtorId: string;
  debts: Array<{ debtId: string; balance: number }>;
  numberOfInstallments?: number;
  paymentsCompleted?: number;
  paymentsFailed?: number;
  createdByUserId?: string;
  approvedByUserId?: string;
  collectorUserId?: string | null;
}

export interface ActivePaymentPlanScenario {
  plan: PaymentPlan;
  planDebts: PaymentPlanDebt[];
  successfulTransactions: TransactionHistory[];
  failedTransactions: TransactionHistory[];
  totalAmount: number;
  remainingBalance: number;
}

export async function seedActivePaymentPlan(
  dataSource: DataSource,
  options: SeedActivePaymentPlanOptions,
): Promise<ActivePaymentPlanScenario> {
  const planFactory = createPaymentPlanFactory(dataSource);
  const txFactory = createTransactionHistoryFactory(dataSource);

  const numberOfInstallments = options.numberOfInstallments || 12;
  const paymentsCompleted = options.paymentsCompleted || 0;
  const paymentsFailed = options.paymentsFailed || 0;

  // Create payment plan with consolidated debts
  const { plan, planDebts } = await planFactory.createPaymentPlanWithDebts({
    organizationId: options.organizationId,
    debtorId: options.debtorId,
    debts: options.debts,
    numberOfInstallments,
    frequency: 'MONTHLY',
    status: 'ACTIVE',
    collectorUserId: options.collectorUserId,
  });

  const totalAmount = plan.totalAmount;
  const installmentAmount = plan.installmentAmount;

  // Create successful payment transactions
  const successfulTransactions: TransactionHistory[] = [];
  for (let i = 0; i < paymentsCompleted; i++) {
    const tx = await txFactory.createScheduledPayment({
      organizationId: options.organizationId,
      debtId: options.debts[0].debtId, // Associate with first debt for simplicity
      paymentPlanId: plan.id,
      debtorId: options.debtorId,
      collectorUserId: options.collectorUserId,
      amount: installmentAmount,
      status: PaymentStatus.SUCCEEDED,
    });
    successfulTransactions.push(tx);
  }

  // Create failed payment transactions
  const failedTransactions: TransactionHistory[] = [];
  for (let i = 0; i < paymentsFailed; i++) {
    const tx = await txFactory.createFailedPayment({
      organizationId: options.organizationId,
      debtId: options.debts[0].debtId,
      paymentPlanId: plan.id,
      debtorId: options.debtorId,
      collectorUserId: options.collectorUserId,
      amount: installmentAmount,
      failureReason: 'Card declined - insufficient funds',
    });
    failedTransactions.push(tx);
  }

  // Update plan to reflect payment counts
  if (paymentsCompleted > 0 || paymentsFailed > 0) {
    await dataSource.query(
      `
      UPDATE payment_plan
      SET payments_completed = $1, payments_failed = $2
      WHERE id = $3
      `,
      [paymentsCompleted, paymentsFailed, plan.id],
    );
  }

  const updatedPlan = await planFactory.getPaymentPlanById(plan.id);
  const paidAmount = paymentsCompleted * installmentAmount;
  const remainingBalance = totalAmount - paidAmount;

  return {
    plan: updatedPlan,
    planDebts,
    successfulTransactions,
    failedTransactions,
    totalAmount,
    remainingBalance,
  };
}
