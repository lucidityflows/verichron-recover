/**
 * Payload for PromiseBroken event
 * Published when a debtor breaks a payment promise
 */
export interface PromiseBrokenPayload {
  /** Promise ID */
  promiseId: string;
  
  /** Debt ID */
  debtId: string;
  
  /** Debtor ID */
  debtorId: string;
  
  /** Organization context */
  organizationId: string;
  
  /** Promised payment date */
  promiseDate: string;
  
  /** Promised amount */
  promisedAmount: number;
  
  /** When the promise was broken (detected) */
  brokenAt: string;
}