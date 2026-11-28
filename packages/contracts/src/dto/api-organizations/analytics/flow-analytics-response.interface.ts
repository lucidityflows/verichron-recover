import { FlowDimension } from '@verichron/enums';
import { IFlowNode } from './flow-node.interface';
import { IFlowLink } from './flow-link.interface';

/**
 * Response for Flow Analytics (Sankey diagram)
 */
export interface IFlowAnalyticsResponse {
  /** Organization ID */
  orgId: string;
  /** Flow view dimension */
  view: FlowDimension;
  /** Nodes in the Sankey diagram */
  nodes: IFlowNode[];
  /** Links (edges) between nodes */
  links: IFlowLink[];
  /** Total value across all flows */
  totalValue: string;
  /** ISO 8601 timestamp when report was generated */
  generatedAt: string;
}
