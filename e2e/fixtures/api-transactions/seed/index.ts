/**
 * api-transactions Seed Scenarios
 *
 * Pre-built test scenarios for common transaction testing patterns.
 * These scenarios combine factories to create complete, reusable test setups.
 */

export {
  seedActivePaymentPlan,
  type SeedActivePaymentPlanOptions,
  type ActivePaymentPlanScenario,
} from './active-payment-plan.seed';

export {
  seedDebtorPaymentHistory,
  type SeedDebtorPaymentHistoryOptions,
  type DebtorPaymentHistoryScenario,
  type DebtPaymentConfig,
} from './debtor-payment-history.seed';
