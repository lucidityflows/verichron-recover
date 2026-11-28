import { UserStatus } from '@verichron/enums';
import { faker } from '../../../utils/faker';

/**
 * User Created Event Helper
 * Builds and validates UserCreated event payloads
 */

export interface UserCreatedPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string | null;
  roleId?: string;
  status: UserStatus;
  createdAt: string;
}

export interface BuildUserCreatedEventOptions {
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  organizationId?: string | null;
  roleId?: string;
  status?: UserStatus;
}

/**
 * Build UserCreated event payload for testing
 */
export function buildUserCreatedEvent(
  options: BuildUserCreatedEventOptions = {},
): UserCreatedPayload {
  return {
    userId: options.userId || faker.uuid(),
    email: options.email || faker.email('user'),
    firstName: options.firstName || faker.person.firstName(),
    lastName: options.lastName || faker.person.lastName(),
    organizationId: options.organizationId === undefined ? null : options.organizationId,
    roleId: options.roleId,
    status: options.status || UserStatus.ACTIVE,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Validate UserCreated event payload structure
 */
export function validateUserCreatedEvent(payload: any): payload is UserCreatedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const required = ['userId', 'email', 'firstName', 'lastName', 'status', 'createdAt'];
  for (const field of required) {
    if (!(field in payload)) {
      return false;
    }
  }

  // Validate types
  if (typeof payload.userId !== 'string') return false;
  if (typeof payload.email !== 'string') return false;
  if (typeof payload.firstName !== 'string') return false;
  if (typeof payload.lastName !== 'string') return false;
  if (typeof payload.status !== 'string') return false;
  if (typeof payload.createdAt !== 'string') return false;

  // Validate status enum
  const validStatuses = Object.values(UserStatus);
  if (!validStatuses.includes(payload.status)) {
    return false;
  }

  // Optional fields validation
  if (payload.organizationId !== undefined && payload.organizationId !== null) {
    if (typeof payload.organizationId !== 'string') return false;
  }

  if (payload.roleId !== undefined && typeof payload.roleId !== 'string') {
    return false;
  }

  return true;
}

/**
 * Assert UserCreated event payload is valid (throws on failure)
 */
export function assertUserCreatedEvent(
  payload: any,
  message: string = 'Invalid UserCreated event payload',
): asserts payload is UserCreatedPayload {
  if (!validateUserCreatedEvent(payload)) {
    throw new Error(`${message}: ${JSON.stringify(payload)}`);
  }
}

/**
 * Match UserCreated event against expected values
 */
export function matchUserCreatedEvent(
  actual: UserCreatedPayload,
  expected: Partial<UserCreatedPayload>,
): boolean {
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key as keyof UserCreatedPayload] !== value) {
      return false;
    }
  }
  return true;
}
