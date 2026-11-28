/**
 * Link (edge) in a Sankey flow diagram
 * Represents a flow of value from one node to another
 */
export interface IFlowLink {
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Flow value (payment amount or debt count) as decimal string */
  value: string;
  /** Percentage of total flow (0-100) */
  percentage: number;
}
