import { SortOrder } from "@verichron/enums";

/**
 * Contract for querying ownership history.
 */
export interface IQueryHistory {
  /**
   * Sort order for history records (defaults to ASC - chronological)
   */
  order?: SortOrder;
}
