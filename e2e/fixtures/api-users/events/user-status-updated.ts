import { UserStatus } from '@verichron/enums';
import { faker } from '../../../utils/faker';

/**
 * User Status Updated Event Helper
 * Builds and validates UserStatusUpdated event payloads
 */

export interface UserStatusUpdatedPayload {
  userId: string;
  previousStatus: UserStatus;
  newStatus: UserStatus;
  reason?: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface BuildUserStatusUpdatedEventOptions {
  userId?: string;
  previousStatus?: UserStatus;
  newStatus?: UserStatus;
  reason?: string;
  updatedBy?: string;
}

/**
 * Build UserStatusUpdated event payload for testing
 */
export function buildUserStatusUpdatedEvent(
  options: BuildUserStatusUpdatedEventOptions = {},
): UserStatusUpdatedPayload {
  return {
    userId: options.userId || faker.uuid(),
    previousStatus: options.previousStatus || UserStatus.PENDING,
    newStatus: options.newStatus || UserStatus.ACTIVE,
    reason: options.reason,
    updatedBy: options.updatedBy,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validate UserStatusUpdated event payload structure
 */
export function validateUserStatusUpdatedEvent(
  payload: any,
): payload is UserStatusUpdatedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const required = ['userId', 'previousStatus', 'newStatus', 'updatedAt'];
  for (const field of required) {
    if (!(field in payload)) {
      return false;
    }
  }

  // Validate types
  if (typeof payload.userId !== 'string') return false;
  if (typeof payload.previousStatus !== 'string') return false;
  if (typeof payload.newStatus !== 'string') return false;
  if (typeof payload.updatedAt !== 'string') return false;

  // Validate status enums
  const validStatuses = Object.values(UserStatus);
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
 * Assert UserStatusUpdated event payload is valid (throws on failure)
 */
export function assertUserStatusUpdatedEvent(
  payload: any,
  message: string = 'Invalid UserStatusUpdated event payload',
): asserts payload is UserStatusUpdatedPayload {
  if (!validateUserStatusUpdatedEvent(payload)) {
    throw new Error(`${message}: ${JSON.stringify(payload)}`);
  }
}

/**
 * Match UserStatusUpdated event against expected values
 */
export function matchUserStatusUpdatedEvent(
  actual: UserStatusUpdatedPayload,
  expected: Partial<UserStatusUpdatedPayload>,
): boolean {
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key as keyof UserStatusUpdatedPayload] !== value) {
      return false;
    }
  }
  return true;
}
