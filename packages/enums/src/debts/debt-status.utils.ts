import { DebtStatus } from './debt-status.enum';

/**
 * Valid state transitions for debt status changes.
 * Used to validate status updates and prevent invalid state changes.
 *
 * Key rules:
 * - IMPORTED can only transition to ACTIVE (validation complete)
 * - ACTIVE can transition to IN_COLLECTION or CHARGED_OFF
 * - IN_COLLECTION can transition to PAYMENT_PLAN, SETTLED, or CHARGED_OFF
 * - PAYMENT_PLAN can return to IN_COLLECTION (plan canceled) or move to terminal states
 * - Terminal states (SETTLED, PAID_IN_FULL, CHARGED_OFF) can only transition to SOLD
 * - SOLD is permanently terminal (portfolio has been transferred)
 */
export const VALID_STATUS_TRANSITIONS: Record<DebtStatus, DebtStatus[]> = {
  [DebtStatus.IMPORTED]: [DebtStatus.ACTIVE],
  [DebtStatus.ACTIVE]: [DebtStatus.IN_COLLECTION, DebtStatus.CHARGED_OFF],
  [DebtStatus.IN_COLLECTION]: [
    DebtStatus.PAYMENT_PLAN,
    DebtStatus.SETTLED,
    DebtStatus.CHARGED_OFF,
  ],
  [DebtStatus.PAYMENT_PLAN]: [
    DebtStatus.IN_COLLECTION,
    DebtStatus.SETTLED,
    DebtStatus.PAID_IN_FULL,
    DebtStatus.CHARGED_OFF,
  ],
  [DebtStatus.SETTLED]: [DebtStatus.SOLD],
  [DebtStatus.PAID_IN_FULL]: [DebtStatus.SOLD],
  [DebtStatus.SOLD]: [],
  [DebtStatus.CHARGED_OFF]: [DebtStatus.SOLD],
};

/**
 * Validates if a status transition is allowed.
 *
 * @param currentStatus - The current debt status
 * @param newStatus - The desired new status
 * @returns true if the transition is valid, false otherwise
 *
 * @example
 * isValidStatusTransition(DebtStatus.ACTIVE, DebtStatus.IN_COLLECTION) // true
 * isValidStatusTransition(DebtStatus.PAID_IN_FULL, DebtStatus.ACTIVE) // false
 */
export function isValidStatusTransition(
  currentStatus: DebtStatus,
  newStatus: DebtStatus,
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Terminal statuses that represent end states for debt lifecycle
 * (excluding SOLD which represents ownership transfer)
 */
export const DEBT_TERMINAL_STATUSES: DebtStatus[] = [
  DebtStatus.SETTLED,
  DebtStatus.PAID_IN_FULL,
  DebtStatus.CHARGED_OFF,
  DebtStatus.SOLD,
];

/**
 * Checks if a debt status is terminal (no further collection activities)
 *
 * @param status - The debt status to check
 * @returns true if the status is terminal
 */
export function isDebtTerminalStatus(status: DebtStatus): boolean {
  return DEBT_TERMINAL_STATUSES.includes(status);
}
