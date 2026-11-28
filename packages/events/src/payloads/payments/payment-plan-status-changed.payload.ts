/**
 * Payment Plan Status Changed Event Payload
 * 
 * Published when a payment plan's status changes (e.g., DRAFT -> ACTIVE, ACTIVE -> COMPLETED).
 * Consumers: api-communications (notify debtor), analytics services
 */
export interface PaymentPlanStatusChangedPayload {
  /**
   * UUID of the payment plan
   */
  planId: string;

  /**
   * UUID of the organization that owns this plan
   */
  organizationId: string;

  /**
   * UUID of the debtor associated with this plan
   */
  debtorId: string;

  /**
   * Previous status before the change
   */
  oldStatus: string;

  /**
   * New status after the change
   */
  newStatus: string;

  /**
   * Total amount of the payment plan
   */
  totalAmount: number;

  /**
   * Number of installments in the plan
   */
  numberOfInstallments: number;

  /**
   * Timestamp when the status changed
   */
  statusChangedAt: string;
}