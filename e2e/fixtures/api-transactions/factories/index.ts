/**
 * api-transactions Factories
 *
 * Data factories for creating test data in the api-transactions database.
 * Follow the service-aligned fixtures architecture pattern.
 */

export {
  PaymentPlanFactory,
  createPaymentPlanFactory,
  type CreatePaymentPlanOptions,
  type PaymentPlan,
  type PaymentPlanDebt,
  type PaymentPlanStatus,
  type PaymentFrequency,
} from './paymentPlanFactory';

export {
  TransactionHistoryFactory,
  createTransactionHistoryFactory,
  type CreateTransactionOptions,
  type TransactionHistory,
} from './transactionHistoryFactory';

// Re-export enums used by transaction factories
export { PaymentType, PaymentStatus, PaymentMethod } from '@verichron/enums';
