import { IFlowAnalyticsQuery } from '@verichron/contracts';

/**
 * Payload for ANALYTICS_FLOW_REQUESTED event
 * Published by api-organizations when flow analytics (Sankey diagram) are requested.
 */
export interface AnalyticsFlowRequestedPayload {
  organizationId: string;
  correlationId: string;
  query: IFlowAnalyticsQuery;
}
