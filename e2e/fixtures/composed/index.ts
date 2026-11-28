/**
 * Composed Fixtures
 * Cross-service orchestration for complex test scenarios
 */

export {
  type OnboardAdminOptions,
  type OnboardedAdmin,
  onboardAdmin,
  onboardMultipleAdmins,
} from './onboard-admin';

export {
  type TenantProvisionedOptions,
  type ProvisionedTenant,
  provisionTenant,
  provisionAndSuspendTenant,
  provisionTenantHierarchy,
} from './tenant-provisioned';

export {
  type DebtorProvisionedOptions,
  type ProvisionedDebtor,
  provisionDebtor,
  provisionMultipleDebtors,
  provisionDebtorWithPartialAccess,
} from './debtor-provisioned';
