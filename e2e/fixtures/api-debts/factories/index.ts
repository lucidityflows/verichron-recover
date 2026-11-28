/**
 * api-debts Factories
 *
 * Data factories for creating test data in the api-debts database.
 * Follow the service-aligned fixtures architecture pattern.
 */

export {
  DebtFactory,
  createDebtFactory,
  type CreateDebtOptions,
  type Debt,
  type DebtDebtor,
} from './debtFactory';

export {
  PortfolioFactory,
  createPortfolioFactory,
  type CreatePortfolioOptions,
  type Portfolio,
} from './portfolioFactory';
