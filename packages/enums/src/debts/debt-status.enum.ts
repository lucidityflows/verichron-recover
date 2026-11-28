/**
 * Debt lifecycle status enumeration
 * 
 * Status flow:
 * IMPORTED → ACTIVE → IN_COLLECTION → PAYMENT_PLAN → SETTLED/PAID_IN_FULL
 *                                   ↓
 *                             CHARGED_OFF → SOLD
 */
export enum DebtStatus {
  /**
   * Initial state when debt is imported from portfolio file.
   * Debt is in the system but not yet ready for collection activities.
   */
  IMPORTED = 'IMPORTED',

  /**
   * Debt is validated and ready for collection activities.
   * Collectors can view and begin working on the debt.
   */
  ACTIVE = 'ACTIVE',

  /**
   * Debt is being actively worked by collectors.
   * Contact attempts, negotiations, and collection activities are ongoing.
   */
  IN_COLLECTION = 'IN_COLLECTION',

  /**
   * Debtor has entered into a structured payment plan.
   * Scheduled payments are being processed automatically.
   */
  PAYMENT_PLAN = 'PAYMENT_PLAN',

  /**
   * Debt has been settled for less than the full amount owed.
   * This is a terminal state (except for portfolio sales).
   */
  SETTLED = 'SETTLED',

  /**
   * Debt has been paid in full.
   * This is a terminal state (except for portfolio sales).
   */
  PAID_IN_FULL = 'PAID_IN_FULL',

  /**
   * Debt has been sold to another organization.
   * This is a terminal state. The debt no longer belongs to this organization.
   */
  SOLD = 'SOLD',

  /**
   * Debt has been deemed uncollectible and written off.
   * This is a terminal state (except for portfolio sales).
   */
  CHARGED_OFF = 'CHARGED_OFF',
}

