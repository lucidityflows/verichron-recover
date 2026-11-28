import { faker } from '../../../utils/faker';

/**
 * Provision Admin Event Helper
 * Builds and validates AdminProvisioned event payloads
 * Used when a platform admin provisions an organization admin
 */

export interface ProvisionAdminPayload {
  adminUserId: string;
  organizationId: string;
  roleId: string;
  email: string;
  firstName: string;
  lastName: string;
  provisionedBy: string;
  invitationToken?: string;
  invitationExpiresAt?: string;
  createdAt: string;
}

export interface BuildProvisionAdminEventOptions {
  adminUserId?: string;
  organizationId?: string;
  roleId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  provisionedBy?: string;
  invitationToken?: string;
  invitationExpiresAt?: string;
}

/**
 * Build AdminProvisioned event payload for testing
 */
export function buildProvisionAdminEvent(
  options: BuildProvisionAdminEventOptions = {},
): ProvisionAdminPayload {
  return {
    adminUserId: options.adminUserId || faker.uuid(),
    organizationId: options.organizationId || faker.uuid(),
    roleId: options.roleId || faker.uuid(),
    email: options.email || faker.email('admin'),
    firstName: options.firstName || faker.person.firstName(),
    lastName: options.lastName || faker.person.lastName(),
    provisionedBy: options.provisionedBy || faker.uuid(),
    invitationToken: options.invitationToken,
    invitationExpiresAt: options.invitationExpiresAt,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Validate AdminProvisioned event payload structure
 */
export function validateProvisionAdminEvent(
  payload: any,
): payload is ProvisionAdminPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const required = [
    'adminUserId',
    'organizationId',
    'roleId',
    'email',
    'firstName',
    'lastName',
    'provisionedBy',
    'createdAt',
  ];

  for (const field of required) {
    if (!(field in payload)) {
      return false;
    }
  }

  // Validate types
  if (typeof payload.adminUserId !== 'string') return false;
  if (typeof payload.organizationId !== 'string') return false;
  if (typeof payload.roleId !== 'string') return false;
  if (typeof payload.email !== 'string') return false;
  if (typeof payload.firstName !== 'string') return false;
  if (typeof payload.lastName !== 'string') return false;
  if (typeof payload.provisionedBy !== 'string') return false;
  if (typeof payload.createdAt !== 'string') return false;

  // Optional fields validation
  if (payload.invitationToken !== undefined && typeof payload.invitationToken !== 'string') {
    return false;
  }
  if (payload.invitationExpiresAt !== undefined && typeof payload.invitationExpiresAt !== 'string') {
    return false;
  }

  return true;
}

/**
 * Assert AdminProvisioned event payload is valid (throws on failure)
 */
export function assertProvisionAdminEvent(
  payload: any,
  message: string = 'Invalid AdminProvisioned event payload',
): asserts payload is ProvisionAdminPayload {
  if (!validateProvisionAdminEvent(payload)) {
    throw new Error(`${message}: ${JSON.stringify(payload)}`);
  }
}

/**
 * Match AdminProvisioned event against expected values
 */
export function matchProvisionAdminEvent(
  actual: ProvisionAdminPayload,
  expected: Partial<ProvisionAdminPayload>,
): boolean {
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key as keyof ProvisionAdminPayload] !== value) {
      return false;
    }
  }
  return true;
}
