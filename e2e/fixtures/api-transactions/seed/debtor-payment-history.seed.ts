import { DataSource } from 'typeorm';
import { createTransactionHistoryFactory, type TransactionHistory } from '../factories';

/**
 * Seed: Debtor Payment History Scenario
 *
 * Creates a comprehensive transaction history for a debtor across multiple debts.
 * Useful for testing payment tracking, reporting, and analytics.
 *
 * Scenario Setup:
 * - Multiple successful payments across different debts
 * - Mix of one-time and scheduled payments
 * - Optional failed payments for testing error handling
 * - Transaction history spanning a time period
 *
 * Expected Test Behavior:
 * - Debtor can view all their payment history
 * - Transactions are properly associated with debts
 * - Payment status tracking is accurate
 * - Failed payments are recorded and reportable
 *
 * @example
 * ```typescript
 * const scenario = await seedDebtorPaymentHistory(transactionsDataSource, {
 *   organizationId: org.id,
 *   debtorId: debtor.id,
 *   debts: [
 *     { debtId: debt1.id, successfulPayments: 5, failedPayments: 1, amountPerPayment: 100.00 },
 *     { debtId: debt2.id, successfulPayments: 3, failedPayments: 0, amountPerPayment: 150.00 },
 *   ],
 * });
 *
 * expect(scenario.allTransactions.length).toBe(9); // 5+1+3
 * expect(scenario.totalPaid).toBe(950.00); // (5*100)+(3*150)
 * ```
 */

export interface DebtPaymentConfig {
  debtId: string;
  successfulPayments: number;
  failedPayments?: number;
  amountPerPayment: number;
  paymentPlanId?: string;
  collectorUserId?: string | null;
}

export interface SeedDebtorPaymentHistoryOptions {
  organizationId: string;
  debtorId: string;
  debts: DebtPaymentConfig[];
  collectorUserId?: string | null;
}

export interface DebtorPaymentHistoryScenario {
  debtorId: string;
  transactionsByDebt: Map<string, TransactionHistory[]>;
  allTransactions: TransactionHistory[];
  successfulTransactions: TransactionHistory[];
  failedTransactions: TransactionHistory[];
  totalPaid: number;
  totalFailed: number;
}

export async function seedDebtorPaymentHistory(
  dataSource: DataSource,
  options: SeedDebtorPaymentHistoryOptions,
): Promise<DebtorPaymentHistoryScenario> {
  const txFactory = createTransactionHistoryFactory(dataSource);

  const transactionsByDebt = new Map<string, TransactionHistory[]>();
  const allTransactions: TransactionHistory[] = [];
  const successfulTransactions: TransactionHistory[] = [];
  const failedTransactions: TransactionHistory[] = [];

  let totalPaid = 0;
  let totalFailed = 0;

  // Create transactions for each debt
  for (const debtConfig of options.debts) {
    const debtTransactions: TransactionHistory[] = [];

    // Create successful payments
    for (let i = 0; i < debtConfig.successfulPayments; i++) {
      const collectorUserId = debtConfig.collectorUserId !== undefined
        ? debtConfig.collectorUserId
        : options.collectorUserId;

      const tx = await txFactory.createSuccessfulPayment({
        organizationId: options.organizationId,
        debtId: debtConfig.debtId,
        paymentPlanId: debtConfig.paymentPlanId,
        debtorId: options.debtorId,
        collectorUserId,
        amount: debtConfig.amountPerPayment,
      });

      debtTransactions.push(tx);
      allTransactions.push(tx);
      successfulTransactions.push(tx);
      totalPaid += debtConfig.amountPerPayment;
    }

    // Create failed payments
    const failedCount = debtConfig.failedPayments || 0;
    for (let i = 0; i < failedCount; i++) {
      const collectorUserId = debtConfig.collectorUserId !== undefined
        ? debtConfig.collectorUserId
        : options.collectorUserId;

      const tx = await txFactory.createFailedPayment({
        organizationId: options.organizationId,
        debtId: debtConfig.debtId,
        paymentPlanId: debtConfig.paymentPlanId,
        debtorId: options.debtorId,
        collectorUserId,
        amount: debtConfig.amountPerPayment,
        failureReason: 'Card declined - insufficient funds',
      });

      debtTransactions.push(tx);
      allTransactions.push(tx);
      failedTransactions.push(tx);
      totalFailed += debtConfig.amountPerPayment;
    }

    transactionsByDebt.set(debtConfig.debtId, debtTransactions);
  }

  return {
    debtorId: options.debtorId,
    transactionsByDebt,
    allTransactions,
    successfulTransactions,
    failedTransactions,
    totalPaid,
    totalFailed,
  };
}
