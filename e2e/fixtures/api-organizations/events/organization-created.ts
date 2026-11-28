import { faker } from '../../../utils/faker';

/**
 * Organization Created Event Helper
 * Builds and validates OrganizationCreated event payloads
 */

export interface OrganizationCreatedPayload {
  organizationId: string;
  name: string;
  displayName?: string;
  organizationType: 'COLLECTION_AGENCY' | 'CREDITOR';
  parentOrganizationId?: string | null;
  status: 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  createdBy?: string;
  createdAt: string;
}

export interface BuildOrganizationCreatedEventOptions {
  organizationId?: string;
  name?: string;
  displayName?: string;
  organizationType?: 'COLLECTION_AGENCY' | 'CREDITOR';
  parentOrganizationId?: string | null;
  status?: 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  createdBy?: string;
}

/**
 * Build OrganizationCreated event payload for testing
 */
export function buildOrganizationCreatedEvent(
  options: BuildOrganizationCreatedEventOptions = {},
): OrganizationCreatedPayload {
  return {
    organizationId: options.organizationId || faker.uuid(),
    name: options.name || faker.company.name(),
    displayName: options.displayName,
    organizationType: options.organizationType || 'COLLECTION_AGENCY',
    parentOrganizationId: options.parentOrganizationId,
    status: options.status || 'PROVISIONING',
    createdBy: options.createdBy,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Validate OrganizationCreated event payload structure
 */
export function validateOrganizationCreatedEvent(
  payload: any,
): payload is OrganizationCreatedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const required = ['organizationId', 'name', 'organizationType', 'status', 'createdAt'];
  for (const field of required) {
    if (!(field in payload)) {
      return false;
    }
  }

  // Validate types
  if (typeof payload.organizationId !== 'string') return false;
  if (typeof payload.name !== 'string') return false;
  if (typeof payload.organizationType !== 'string') return false;
  if (typeof payload.status !== 'string') return false;
  if (typeof payload.createdAt !== 'string') return false;

  // Validate enums
  const validTypes = ['COLLECTION_AGENCY', 'CREDITOR'];
  if (!validTypes.includes(payload.organizationType)) return false;

  const validStatuses = ['PROVISIONING', 'ACTIVE', 'SUSPENDED', 'INACTIVE'];
  if (!validStatuses.includes(payload.status)) return false;

  // Optional fields validation
  if (payload.displayName !== undefined && typeof payload.displayName !== 'string') {
    return false;
  }
  if (
    payload.parentOrganizationId !== undefined &&
    payload.parentOrganizationId !== null &&
    typeof payload.parentOrganizationId !== 'string'
  ) {
    return false;
  }
  if (payload.createdBy !== undefined && typeof payload.createdBy !== 'string') {
    return false;
  }

  return true;
}

/**
 * Assert OrganizationCreated event payload is valid (throws on failure)
 */
export function assertOrganizationCreatedEvent(
  payload: any,
  message: string = 'Invalid OrganizationCreated event payload',
): asserts payload is OrganizationCreatedPayload {
  if (!validateOrganizationCreatedEvent(payload)) {
    throw new Error(`${message}: ${JSON.stringify(payload)}`);
  }
}

/**
 * Match OrganizationCreated event against expected values
 */
export function matchOrganizationCreatedEvent(
  actual: OrganizationCreatedPayload,
  expected: Partial<OrganizationCreatedPayload>,
): boolean {
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key as keyof OrganizationCreatedPayload] !== value) {
      return false;
    }
  }
  return true;
}
