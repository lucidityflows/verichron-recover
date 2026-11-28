/**
 * Settlement Offer Status Enum
 *
 * Tracks the lifecycle of a debt settlement offer from initial proposal through completion or rejection.
 *
 * LIFECYCLE FLOW:
 * 1. PENDING → Offer made, awaiting debtor response
 * 2. ACCEPTED → Debtor agreed to settlement terms
 * 3. COMPLETED → Settlement amount paid in full
 *
 * REJECTION PATHS:
 * - REJECTED → Debtor explicitly declined offer
 * - EXPIRED → Offer deadline passed without response
 * - WITHDRAWN → Creditor/collector retracted offer
 *
 * FAILURE PATH:
 * - DEFAULTED → Debtor accepted but failed to pay (e.g., missed installment)
 *
 * ANALYTICS USAGE:
 * - Acceptance Rate: (ACCEPTED / (ACCEPTED + REJECTED + EXPIRED)) * 100
 * - Completion Rate: (COMPLETED / ACCEPTED) * 100
 * - Default Rate: (DEFAULTED / ACCEPTED) * 100
 */
export enum SettlementOfferStatus {
  /**
   * Offer has been made to debtor, awaiting response.
   * No action taken yet by debtor.
   */
  PENDING = 'PENDING',

  /**
   * Debtor has accepted the settlement offer.
   * Payment is now due according to offer terms.
   */
  ACCEPTED = 'ACCEPTED',

  /**
   * Debtor has explicitly rejected the settlement offer.
   * May re-negotiate with different terms.
   */
  REJECTED = 'REJECTED',

  /**
   * Settlement offer deadline passed without debtor response.
   * Offer is no longer valid.
   */
  EXPIRED = 'EXPIRED',

  /**
   * Creditor/collector withdrew the offer before debtor response.
   * May occur if debtor circumstances changed (e.g., payment received).
   */
  WITHDRAWN = 'WITHDRAWN',

  /**
   * Settlement amount has been paid in full.
   * Debt is now satisfied according to settlement terms.
   */
  COMPLETED = 'COMPLETED',

  /**
   * Debtor accepted offer but failed to honor payment terms.
   * E.g., missed an installment payment on accepted settlement.
   * Debt may revert to full balance.
   */
  DEFAULTED = 'DEFAULTED',
}
