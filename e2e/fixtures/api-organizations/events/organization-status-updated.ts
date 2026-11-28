import { faker } from '../../../utils/faker';

/**
 * Organization Status Updated Event Helper
 * Builds and validates OrganizationStatusUpdated event payloads
 */

export interface OrganizationStatusUpdatedPayload {
  organizationId: string;
  previousStatus: 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  newStatus: 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  reason?: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface BuildOrganizationStatusUpdatedEventOptions {
  organizationId?: string;
  previousStatus?: 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  newStatus?: 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  reason?: string;
  updatedBy?: string;
}

/**
 * Build OrganizationStatusUpdated event payload for testing
 */
export function buildOrganizationStatusUpdatedEvent(
  options: BuildOrganizationStatusUpdatedEventOptions = {},
): OrganizationStatusUpdatedPayload {
  return {
    organizationId: options.organizationId || faker.uuid(),
    previousStatus: options.previousStatus || 'PROVISIONING',
    newStatus: options.newStatus || 'ACTIVE',
    reason: options.reason,
    updatedBy: options.updatedBy,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validate OrganizationStatusUpdated event payload structure
 */
export function validateOrganizationStatusUpdatedEvent(
  payload: any,
): payload is OrganizationStatusUpdatedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const required = ['organizationId', 'previousStatus', 'newStatus', 'updatedAt'];
  for (const field of required) {
    if (!(field in payload)) {
      return false;
    }
  }

  // Validate types
  if (typeof payload.organizationId !== 'string') return false;
  if (typeof payload.previousStatus !== 'string') return false;
  if (typeof payload.newStatus !== 'string') return false;
  if (typeof payload.updatedAt !== 'string') return false;

  // Validate status enums
  const validStatuses = ['PROVISIONING', 'ACTIVE', 'SUSPENDED', 'INACTIVE'];
  if (!validStatuses.includes(payload.previousStatus)) return false;
  if (!validStatuses.includes(payload.newStatus)) return false;

  // Optional fields validation
  if (payload.reason !== undefined && typeof payload.reason !== 'string') {
    return false;
  }
  if (payload.updatedBy !== undefined && typeof payload.updatedBy !== 'string') {
    return false;
  }

  return true;
}

/**
 * Assert OrganizationStatusUpdated event payload is valid (throws on failure)
 */
export function assertOrganizationStatusUpdatedEvent(
  payload: any,
  message: string = 'Invalid OrganizationStatusUpdated event payload',
): asserts payload is OrganizationStatusUpdatedPayload {
  if (!validateOrganizationStatusUpdatedEvent(payload)) {
    throw new Error(`${message}: ${JSON.stringify(payload)}`);
  }
}

/**
 * Match OrganizationStatusUpdated event against expected values
 */
export function matchOrganizationStatusUpdatedEvent(
  actual: OrganizationStatusUpdatedPayload,
  expected: Partial<OrganizationStatusUpdatedPayload>,
): boolean {
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key as keyof OrganizationStatusUpdatedPayload] !== value) {
      return false;
    }
  }
  return true;
}
