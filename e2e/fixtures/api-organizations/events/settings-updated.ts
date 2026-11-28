import { faker } from '../../../utils/faker';

/**
 * Settings Updated Event Helper
 * Builds and validates SettingsUpdated event payloads
 */

export interface SettingsUpdatedPayload {
  organizationId: string;
  previousSettings: Record<string, any>;
  newSettings: Record<string, any>;
  updatedBy?: string;
  updatedAt: string;
}

export interface BuildSettingsUpdatedEventOptions {
  organizationId?: string;
  previousSettings?: Record<string, any>;
  newSettings?: Record<string, any>;
  updatedBy?: string;
}

/**
 * Build SettingsUpdated event payload for testing
 */
export function buildSettingsUpdatedEvent(
  options: BuildSettingsUpdatedEventOptions = {},
): SettingsUpdatedPayload {
  return {
    organizationId: options.organizationId || faker.uuid(),
    previousSettings: options.previousSettings || {},
    newSettings: options.newSettings || {},
    updatedBy: options.updatedBy,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validate SettingsUpdated event payload structure
 */
export function validateSettingsUpdatedEvent(
  payload: any,
): payload is SettingsUpdatedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const required = ['organizationId', 'previousSettings', 'newSettings', 'updatedAt'];
  for (const field of required) {
    if (!(field in payload)) {
      return false;
    }
  }

  // Validate types
  if (typeof payload.organizationId !== 'string') return false;
  if (typeof payload.previousSettings !== 'object' || payload.previousSettings === null || Array.isArray(payload.previousSettings)) {
    return false;
  }
  if (typeof payload.newSettings !== 'object' || payload.newSettings === null || Array.isArray(payload.newSettings)) {
    return false;
  }
  if (typeof payload.updatedAt !== 'string') return false;

  // Optional fields validation
  if (payload.updatedBy !== undefined && typeof payload.updatedBy !== 'string') {
    return false;
  }

  return true;
}

/**
 * Assert SettingsUpdated event payload is valid (throws on failure)
 */
export function assertSettingsUpdatedEvent(
  payload: any,
  message: string = 'Invalid SettingsUpdated event payload',
): asserts payload is SettingsUpdatedPayload {
  if (!validateSettingsUpdatedEvent(payload)) {
    throw new Error(`${message}: ${JSON.stringify(payload)}`);
  }
}

/**
 * Match SettingsUpdated event against expected values
 */
export function matchSettingsUpdatedEvent(
  actual: SettingsUpdatedPayload,
  expected: Partial<SettingsUpdatedPayload>,
): boolean {
  for (const [key, value] of Object.entries(expected)) {
    if (key === 'previousSettings' || key === 'newSettings') {
      // Deep comparison for objects
      if (JSON.stringify(actual[key]) !== JSON.stringify(value)) {
        return false;
      }
    } else if (actual[key as keyof SettingsUpdatedPayload] !== value) {
      return false;
    }
  }
  return true;
}
