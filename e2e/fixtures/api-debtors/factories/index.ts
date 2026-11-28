/**
 * api-debtors Factories
 *
 * Data factories for creating test data in the api-debtors database.
 * Follow the service-aligned fixtures architecture pattern.
 */

export {
  DebtorIdentityFactory,
  createDebtorProfileFactory,
  type CreateDebtorProfileOptions,
  type CreateDebtorIdentityOptions,
  type DebtorIdentity,
  type DebtorProfile
} from './debtorFactory';

export {
  DebtorContactFactory,
  createDebtorContactFactory,
  type CreateDebtorPhoneOptions,
  type DebtorPhone,
  type CreateDebtorEmailOptions,
  type DebtorEmail,
  type CreateDebtorAddressOptions,
  type DebtorAddress,
} from './debtorContactFactory';
