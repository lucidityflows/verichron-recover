import { IOwnershipHistoryResponse } from "./ownership-history-response.interface";


/**
 * Contract for complete debt ownership chain response.
 *
 * Provides the full chain of title for a debt.
 */
export interface IDebtOwnershipChain {
  /**
   * Debt ID
   */
  debtId: string;

  /**
   * Complete ownership history in chronological order
   */
  history: IOwnershipHistoryResponse[];

  /**
   * Total number of ownership transfers
   */
  totalTransfers: number;

  /**
   * Current owner organization ID (null if no records)
   */
  currentOwnerId: string | null;
}
