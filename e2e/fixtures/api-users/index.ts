/**
 * API Users Fixtures
 * Complete fixture suite for api-users service testing
 */

// Factories
export {
  UserFactory,
  createUserFactory,
  type CreateUserOptions,
  type User,
} from './factories/userFactory';
export {
  RoleFactory,
  createRoleFactory,
  type CreateRoleOptions,
  type Role,
} from './factories/roleFactory';
export {
  ProfileFactory,
  createProfileFactory,
  type CreateEmailOptions,
  type CreateAddressOptions,
  type CreatePhoneOptions,
} from './factories/profileFactory';
export {
  DebtorFactory,
  createDebtorFactory,
  type CreateDebtorOptions,
  type DebtorUser,
} from './factories/debtorFactory';

// Seed
export {
  seedPlatformAdmin,
  seedOrganizationAdmin,
  seedOrganizationUser,
  seedPendingUser,
  seedOrganizationWithUsers,
  seedUserWithCompleteProfile,
  seedDebtor,
} from './seed/seed';

// Events
export {
  type UserCreatedPayload,
  type BuildUserCreatedEventOptions,
  buildUserCreatedEvent,
  validateUserCreatedEvent,
  assertUserCreatedEvent,
  matchUserCreatedEvent,
} from './events/user-created';
export {
  type UserStatusUpdatedPayload,
  type BuildUserStatusUpdatedEventOptions,
  buildUserStatusUpdatedEvent,
  validateUserStatusUpdatedEvent,
  assertUserStatusUpdatedEvent,
  matchUserStatusUpdatedEvent,
} from './events/user-status-updated';
export {
  type ProvisionAdminPayload,
  type BuildProvisionAdminEventOptions,
  buildProvisionAdminEvent,
  validateProvisionAdminEvent,
  assertProvisionAdminEvent,
  matchProvisionAdminEvent,
} from './events/provision-admin';
