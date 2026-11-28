/**
 * API Organizations Fixtures
 * Complete fixture suite for api-organizations service testing
 */

// Factories
export {
  OrganizationFactory,
  createOrganizationFactory,
  type CreateOrganizationOptions,
  type Organization,
} from './factories/organizationFactory';
export {
  OrganizationProfileFactory,
  createOrganizationProfileFactory,
  type CreateOrganizationEmailOptions,
  type CreateOrganizationAddressOptions,
  type CreateOrganizationPhoneOptions,
} from './factories/profileFactory';

// Seed
export {
  seedCollectionAgency,
  seedCreditor,
  seedOrganizationWithCompleteProfile,
  seedOrganizationHierarchy,
  seedProvisioningOrganization,
  seedOrganizationWithSettings,
} from './seed/seed';

// Events
export {
  type OrganizationCreatedPayload,
  type BuildOrganizationCreatedEventOptions,
  buildOrganizationCreatedEvent,
  validateOrganizationCreatedEvent,
  assertOrganizationCreatedEvent,
  matchOrganizationCreatedEvent,
} from './events/organization-created';
export {
  type OrganizationStatusUpdatedPayload,
  type BuildOrganizationStatusUpdatedEventOptions,
  buildOrganizationStatusUpdatedEvent,
  validateOrganizationStatusUpdatedEvent,
  assertOrganizationStatusUpdatedEvent,
  matchOrganizationStatusUpdatedEvent,
} from './events/organization-status-updated';
export {
  type SettingsUpdatedPayload,
  type BuildSettingsUpdatedEventOptions,
  buildSettingsUpdatedEvent,
  validateSettingsUpdatedEvent,
  assertSettingsUpdatedEvent,
  matchSettingsUpdatedEvent,
} from './events/settings-updated';
