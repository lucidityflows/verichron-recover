/**
 * Payment Plan Status Enum
 *
 * Defines the lifecycle states of a payment plan.
 * Status transitions are validated by business logic.
 */
export enum PaymentPlanStatus {
  /**
   * Plan is being drafted but not yet finalized
   * Can be edited or deleted without restrictions
   */
  DRAFT = 'DRAFT',

  /**
   * Plan exceeds auto-approval threshold and awaits admin approval
   * Cannot be edited, only approved or canceled
   */
  PENDING_APPROVAL = 'PENDING_APPROVAL',

  /**
   * Plan is approved and scheduled payments are being processed
   * Cannot be edited, only canceled
   */
  ACTIVE = 'ACTIVE',

  /**
   * All scheduled payments have been successfully completed
   * Terminal state - no further actions possible
   */
  COMPLETED = 'COMPLETED',

  /**
   * Plan was canceled before completion
   * Terminal state - no further actions possible
   */
  CANCELED = 'CANCELED',

  /**
   * Plan defaulted after too many failed payment attempts
   * Terminal state - no further actions possible
   */
  DEFAULTED = 'DEFAULTED',
}

/**
 * Valid Status Transitions
 *
 * Defines which status changes are allowed.
 * Used for validation in the service layer.
 */
export const VALID_PLAN_STATUS_TRANSITIONS: Record<
  PaymentPlanStatus,
  PaymentPlanStatus[]
> = {
  [PaymentPlanStatus.DRAFT]: [
    PaymentPlanStatus.PENDING_APPROVAL,
    PaymentPlanStatus.ACTIVE,
    PaymentPlanStatus.CANCELED,
  ],
  [PaymentPlanStatus.PENDING_APPROVAL]: [
    PaymentPlanStatus.ACTIVE,
    PaymentPlanStatus.CANCELED,
  ],
  [PaymentPlanStatus.ACTIVE]: [
    PaymentPlanStatus.COMPLETED,
    PaymentPlanStatus.CANCELED,
    PaymentPlanStatus.DEFAULTED,
  ],
  [PaymentPlanStatus.COMPLETED]: [],
  [PaymentPlanStatus.CANCELED]: [],
  [PaymentPlanStatus.DEFAULTED]: [],
};
