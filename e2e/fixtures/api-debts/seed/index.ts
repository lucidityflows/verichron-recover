/**
 * api-debts Seed Scenarios
 *
 * Pre-built test scenarios for common debt testing patterns.
 * These scenarios combine factories to create complete, reusable test setups.
 */

export {
  seedDebtorMultiOrgDebts,
  type SeedDebtorMultiOrgDebtsOptions,
  type OrgDebtConfig,
  type DebtorMultiOrgDebtsScenario,
} from './debtor-multi-org-debts.seed';

export {
  seedDebtorOwnershipIsolation,
  type SeedDebtorOwnershipIsolationOptions,
  type DebtorOwnershipIsolationScenario,
} from './debtor-ownership-isolation.seed';
