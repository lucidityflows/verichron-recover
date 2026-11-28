/**
 * Contract for assigning a user to a portfolio.
 *
 * Creates Layer 2 authorization for the user to access debts in this portfolio.
 */
export interface IAssignUser {
  /**
   * User ID to grant access to
   */
  userId: string;
}

/**
 * Contract for transferring a portfolio to another organization.
 *
 * Represents a portfolio sale/ownership transfer.
 */
export interface ITransferPortfolio {
  /**
   * Organization ID to transfer portfolio to
   */
  newOrganizationId: string;

  /**
   * Date of the transfer (ISO 8601 date string, defaults to today)
   */
  transferDate?: string;

  /**
   * Sale price (optional)
   */
  transferPrice?: number;

  /**
   * Optional notes about the transfer
   */
  notes?: string;
}
