import { DebtCategory, PaymentMethod, StateAbbreviation } from '@verichron/enums';

/**
 * Metadata for flow nodes (view-specific context)
 */
export interface IFlowNodeMetadata {
  /** Debt category (when view = DEBT_CATEGORY) */
  debtCategory?: DebtCategory;
  /** State abbreviation (when view = STATE) */
  state?: StateAbbreviation;
  /** Number of states grouped into "Other" (when state = "OTHER") */
  count?: number;
  /** Portfolio ID (when view = PORTFOLIO) */
  portfolioId?: string;
  /** Payment method (when view = PAYMENT_METHOD) */
  paymentMethod?: PaymentMethod;
}

/**
 * Node in a Sankey flow diagram
 */
export interface IFlowNode {
  /** Unique node identifier */
  id: string;
  /** Display label for the node */
  label: string;
  /** Total value flowing through this node */
  value: string;
  /** Optional metadata for the node */
  metadata?: IFlowNodeMetadata;
}
